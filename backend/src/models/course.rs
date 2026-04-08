use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Course {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: Option<String>,
    pub short_desc: Option<String>,
    pub thumbnail_url: Option<String>,
    pub instructor_photo_url: Option<String>,
    pub board_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub stream_id: Option<Uuid>,
    pub subject_id: Option<Uuid>,
    pub is_free: bool,
    pub price: Option<sqlx::types::BigDecimal>,
    pub discount_pct: Option<i32>,
    pub language: String,
    pub level: Option<String>,
    pub syllabus_points: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_full_course: bool,
    pub status: String,
    pub rejection_reason: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub total_chapters: i32,
    pub total_lectures: i32,
    pub total_duration: i32,
    pub total_enrollments: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
