use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstructorEarning {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub order_id: Uuid,
    pub course_id: Uuid,
    pub order_amount: sqlx::types::BigDecimal,
    pub platform_pct: i32,
    pub platform_amount: sqlx::types::BigDecimal,
    pub instructor_amount: sqlx::types::BigDecimal,
    pub payout_status: String,
    pub payout_date: Option<DateTime<Utc>>,
    pub payout_reference: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RevenueSetting {
    pub id: Uuid,
    pub default_platform_pct: i32,
    pub updated_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstructorRevenueOverride {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub platform_pct: i32,
    pub updated_by: Option<Uuid>,
    pub updated_at: DateTime<Utc>,
}
