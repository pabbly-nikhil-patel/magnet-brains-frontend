use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Lecture {
    pub id: Uuid,
    pub chapter_id: Uuid,
    pub course_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub video_s3_key: Option<String>,
    pub video_url: Option<String>,
    pub duration: Option<i32>,
    pub video_status: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub is_preview: bool,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
