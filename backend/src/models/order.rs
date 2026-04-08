use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub amount: sqlx::types::BigDecimal,
    pub discount_amount: Option<sqlx::types::BigDecimal>,
    pub final_amount: sqlx::types::BigDecimal,
    pub currency: String,
    pub payment_provider: String,
    pub payment_id: Option<String>,
    pub payment_status: String,
    pub refund_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
