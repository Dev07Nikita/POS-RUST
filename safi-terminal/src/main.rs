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
}

#[derive(Debug, Serialize, Deserialize)]
struct SaleItem {
    product_id: i64,
    quantity: i64,
}


#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let pool = SqlitePool::connect("sqlite:safi_terminal.db?mode=rwc").await?;
    
    // Start background sync to Spring Boot
    start_sync_worker(pool.clone(), "http://localhost:8080".to_string()).await;

    let app = Router::new()
        .route("/api/products", get(list_products))
        .route("/api/checkout", post(checkout))
        .fallback_service(ServeDir::new("static")) // Serve the frontend
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
    
    // In a real app, we'd calculate total and update stock here
    
    sqlx::query("INSERT INTO sales (id, timestamp, total, payment_method, cashier) VALUES (?, ?, ?, ?, ?)")
        .bind(&sale_id)
        .bind(&timestamp)
        .bind(0.0)
        .bind(&payload.payment_method)
        .bind(&payload.cashier_name)
        .execute(&pool)
        .await
        .ok();

    let qr_base64 = generate_receipt_qr(&sale_id);

    Json(serde_json::json!({
        "status": "success",
        "sale_id": sale_id,
        "qr_code": qr_base64
    }))
}

