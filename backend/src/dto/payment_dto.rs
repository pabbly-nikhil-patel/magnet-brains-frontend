use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub course_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct CreateOrderResponse {
    pub order_id: String,
    pub amount: i64,
    pub currency: String,
    pub razorpay_key: String,
    pub course_title: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPaymentRequest {
    pub razorpay_payment_id: String,
    pub razorpay_order_id: String,
    pub razorpay_signature: String,
    pub course_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct VerifyPaymentResponse {
    pub success: bool,
    pub order_id: Uuid,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct PaymentHistoryItem {
    pub id: Uuid,
    pub course_id: Uuid,
    pub course_title: String,
    pub course_slug: String,
    pub amount: f64,
    pub discount_amount: f64,
    pub final_amount: f64,
    pub currency: String,
    pub payment_status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RazorpayWebhookPayload {
    pub event: String,
    pub payload: serde_json::Value,
}
