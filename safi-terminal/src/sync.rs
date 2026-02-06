use sqlx::sqlite::SqlitePool;
use reqwest::Client;
use serde_json::json;

pub async fn start_sync_worker(pool: SqlitePool, backend_url: String) {
    let client = Client::new();
    
    tokio::spawn(async move {
        loop {
            // Find unsynced sales
            let unsynced = sqlx::query("SELECT id, timestamp, total, payment_method, cashier FROM sales WHERE synced = 0")
                .fetch_all(&pool)
                .await
                .unwrap_or_default();

            for row in unsynced {
                use sqlx::Row;
                let id: String = row.get("id");
                let timestamp: String = row.get("timestamp");
                let total: f64 = row.get("total");
                let payment_method: String = row.get("payment_method");
                let cashier: String = row.get("cashier");

                let sale_data = json!({
                    "transactionId": id,
                    "timestamp": timestamp,
                    "totalAmount": total,
                    "paymentMethod": payment_method,
                    "cashierName": cashier
                });

                match client.post(&format!("{}/api/sales/sync", backend_url))
                    .json(&sale_data)
                    .send()
                    .await {
                    Ok(resp) if resp.status().is_success() => {
                        sqlx::query("UPDATE sales SET synced = 1 WHERE id = ?")
                            .bind(&id)
                            .execute(&pool)
                            .await
                            .ok();
                    }
                    _ => {
                        eprintln!("Failed to sync sale {}", id);
                    }
                }
            }


            tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
        }
    });
}
