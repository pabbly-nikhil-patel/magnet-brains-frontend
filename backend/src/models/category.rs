use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub category_type: String,
    pub parent_id: Option<Uuid>,
    pub sort_order: i32,
    pub icon_url: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}
