mod receipt;
mod sync;

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePool;
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

use uuid::Uuid;
use chrono::Utc;
use crate::receipt::generate_receipt_qr;
use crate::sync::start_sync_worker;

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
struct Product {
    id: Option<i64>,
    code: String,
    name: String,
    price: f64,
    stock: i64,
}



#[derive(Debug, Serialize, Deserialize)]
struct Sale {
    items: Vec<SaleItem>,
    payment_method: String,
    cashier_name: String,
    customer_phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SaleItem {
    product_id: i64,
    quantity: i64,
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = SqlitePool::connect("sqlite:safi_terminal.db?mode=rwc").await?;
    
    // Initialize Tables
    sqlx::query("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, code TEXT, name TEXT, price REAL, stock INTEGER)")
        .execute(&pool).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS sales (id TEXT PRIMARY KEY, timestamp TEXT, total REAL, payment_method TEXT, cashier TEXT, customer_phone TEXT, synced INTEGER DEFAULT 0)")
        .execute(&pool).await?;
    sqlx::query("CREATE TABLE IF NOT EXISTS sale_items (id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id TEXT, product_name TEXT, quantity INTEGER, unit_price REAL)")
        .execute(&pool).await?;

    // Start background sync to Spring Boot
    start_sync_worker(pool.clone(), "http://localhost:8080".to_string()).await;

    let app = Router::new()
        .route("/api/products", get(list_products))
        .route("/api/checkout", post(checkout))
        .route("/api/local-analytics", get(local_analytics))
        .route("/api/local-sales/recent", get(recent_sales))
        .fallback_service(ServeDir::new("static"))
        .layer(CorsLayer::permissive())
        .with_state(pool);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Safi Terminal running on http://{}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn list_products(
    axum::extract::State(pool): axum::extract::State<SqlitePool>,
) -> Json<Vec<Product>> {
    let products = sqlx::query_as::<_, Product>("SELECT id, code, name, price, stock FROM products")
        .fetch_all(&pool)
        .await
        .unwrap_or_default();
    Json(products)
}

async fn checkout(
    axum::extract::State(pool): axum::extract::State<SqlitePool>,
    Json(payload): Json<Sale>,
) -> Json<serde_json::Value> {
    let sale_id = Uuid::new_v4().to_string();
    let timestamp = Utc::now().to_rfc3339();
    
    let mut receipt_items = Vec::new();
    let mut total_amount = 0.0;

    for item in &payload.items {
        // Fetch product details
        if let Ok(p) = sqlx::query_as::<_, Product>("SELECT id, code, name, price, stock FROM products WHERE id = ?")
            .bind(item.product_id)
            .fetch_one(&pool)
            .await 
        {
            let subtotal = p.price * item.quantity as f64;
            total_amount += subtotal;

            receipt_items.push(crate::receipt::ReceiptItem {
                name: p.name.clone(),
                quantity: item.quantity,
                price: p.price,
            });

            // Store sale item
            sqlx::query("INSERT INTO sale_items (sale_id, product_name, quantity, unit_price) VALUES (?, ?, ?, ?)")
                .bind(&sale_id)
                .bind(&p.name)
                .bind(item.quantity)
                .bind(p.price)
                .execute(&pool)
                .await
                .ok();
            
            // Update local stock
            sqlx::query("UPDATE products SET stock = stock - ? WHERE id = ?")
                .bind(item.quantity)
                .bind(item.product_id)
                .execute(&pool)
                .await
                .ok();
        }
    }

    sqlx::query("INSERT INTO sales (id, timestamp, total, payment_method, cashier, customer_phone) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(&sale_id)
        .bind(&timestamp)
        .bind(total_amount)
        .bind(&payload.payment_method)
        .bind(&payload.cashier_name)
        .bind(&payload.customer_phone)
        .execute(&pool)
        .await
        .ok();

    let qr_base64 = generate_receipt_qr(&sale_id, &payload.cashier_name, total_amount, &receipt_items);

    Json(serde_json::json!({
        "status": "success",
        "sale_id": sale_id,
        "qr_code": qr_base64
    }))
}

async fn local_analytics(
    axum::extract::State(pool): axum::extract::State<SqlitePool>,
) -> Json<serde_json::Value> {
    let today = Utc::now().format("%Y-%m-%d").to_string();

    // Get today's sales
    let today_sales = sqlx::query(
        "SELECT id, timestamp, total, payment_method, cashier FROM sales WHERE timestamp LIKE ? ORDER BY timestamp DESC"
    )
        .bind(format!("{}%", today))
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    use sqlx::Row;

    let total_revenue: f64 = today_sales.iter().map(|r| r.get::<f64, _>("total")).sum();
    let total_orders = today_sales.len();

    // Build recent sales with items
    let mut recent_sales_json = Vec::new();
    for row in today_sales.iter().take(15) {
        let sale_id: String = row.get("id");
        let items = sqlx::query("SELECT product_name, quantity, unit_price FROM sale_items WHERE sale_id = ?")
            .bind(&sale_id)
            .fetch_all(&pool)
            .await
            .unwrap_or_default();

        let sale_items: Vec<serde_json::Value> = items.iter().map(|item| {
            let qty: i64 = item.get("quantity");
            let price: f64 = item.get("unit_price");
            serde_json::json!({
                "productName": item.get::<String, _>("product_name"),
                "quantity": qty,
                "unitPrice": price,
                "subtotal": (qty as f64) * price
            })
        }).collect();

        recent_sales_json.push(serde_json::json!({
            "transactionId": sale_id,
            "timestamp": row.get::<String, _>("timestamp"),
            "totalAmount": row.get::<f64, _>("total"),
            "paymentMethod": row.get::<String, _>("payment_method"),
            "cashier": row.get::<String, _>("cashier"),
            "items": sale_items
        }));
    }

    // Payment method breakdown
    let mut cash_total = 0.0f64;
    let mut mpesa_total = 0.0f64;
    let mut bank_total = 0.0f64;
    for row in &today_sales {
        let method: String = row.get("payment_method");
        let amount: f64 = row.get("total");
        if method.to_uppercase().contains("CASH") {
            cash_total += amount;
        } else if method.to_uppercase().contains("PESA") || method.to_uppercase().contains("STK") {
            mpesa_total += amount;
        } else {
            bank_total += amount;
        }
    }

    Json(serde_json::json!({
        "totalRevenue": total_revenue,
        "totalOrders": total_orders,
        "averageOrder": if total_orders > 0 { total_revenue / total_orders as f64 } else { 0.0 },
        "recentSales": recent_sales_json,
        "paymentBreakdown": {
            "cash": cash_total,
            "mpesa": mpesa_total,
            "bank": bank_total
        },
        "date": today
    }))
}

async fn recent_sales(
    axum::extract::State(pool): axum::extract::State<SqlitePool>,
) -> Json<serde_json::Value> {
    use sqlx::Row;

    let sales = sqlx::query(
        "SELECT id, timestamp, total, payment_method, cashier FROM sales ORDER BY timestamp DESC LIMIT 20"
    )
        .fetch_all(&pool)
        .await
        .unwrap_or_default();

    let mut sales_json = Vec::new();
    for row in &sales {
        let sale_id: String = row.get("id");
        let items = sqlx::query("SELECT product_name, quantity, unit_price FROM sale_items WHERE sale_id = ?")
            .bind(&sale_id)
            .fetch_all(&pool)
            .await
            .unwrap_or_default();

        let sale_items: Vec<serde_json::Value> = items.iter().map(|item| {
            let qty: i64 = item.get("quantity");
            let price: f64 = item.get("unit_price");
            serde_json::json!({
                "productName": item.get::<String, _>("product_name"),
                "quantity": qty,
                "unitPrice": price,
                "subtotal": (qty as f64) * price
            })
        }).collect();

        sales_json.push(serde_json::json!({
            "transactionId": sale_id,
            "timestamp": row.get::<String, _>("timestamp"),
            "totalAmount": row.get::<f64, _>("total"),
            "paymentMethod": row.get::<String, _>("payment_method"),
            "cashier": row.get::<String, _>("cashier"),
            "items": sale_items
        }));
    }

    Json(serde_json::json!({
        "sales": sales_json
    }))
}

