use qrcode_generator::QrCodeEcc;
use base64::{engine::general_purpose, Engine as _};

pub struct ReceiptItem {
    pub name: String,
    pub quantity: i64,
    pub price: f64,
}

pub fn generate_receipt_qr(
    transaction_id: &str,
    cashier: &str,
    total: f64,
    items: &[ReceiptItem]
) -> String {
    let mut data = format!(
        "SAFI POS RECEIPT\nID: {}\nCashier: {}\nDate: {}\n---\n",
        transaction_id,
        cashier,
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S")
    );

    for item in items {
        data.push_str(&format!(
            "{} x{} @ {}: {}\n",
            item.name,
            item.quantity,
            item.price,
            item.price * item.quantity as f64
        ));
    }

    data.push_str(&format!("---\nTOTAL: KES {:.2}\nSAFI MODERN RETAIL", total));

    let result: Vec<u8> = qrcode_generator::to_png_to_vec(data, QrCodeEcc::Medium, 300).unwrap();
    
    let base64_image = general_purpose::STANDARD.encode(result);
    format!("data:image/png;base64,{}", base64_image)
}


