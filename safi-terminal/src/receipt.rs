use qrcode_generator::QrCodeEcc;
use base64::{engine::general_purpose, Engine as _};

pub fn generate_receipt_qr(transaction_id: &str) -> String {
    let data = format!("SAFIPOS_VERIFY:{}", transaction_id);
    let result: Vec<u8> = qrcode_generator::to_png_to_vec(data, QrCodeEcc::Medium, 200).unwrap();
    
    let base64_image = general_purpose::STANDARD.encode(result);
    format!("data:image/png;base64,{}", base64_image)
}


