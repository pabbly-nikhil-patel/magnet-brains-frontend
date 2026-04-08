use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CourseFilterParams {
    pub board: Option<String>,
    pub class: Option<String>,
    pub stream: Option<String>,
    pub subject: Option<String>,
    pub is_free: Option<bool>,
    pub level: Option<String>,
    pub language: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct SearchParams {
    pub q: String,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct CourseListItem {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub short_desc: Option<String>,
    pub thumbnail_url: Option<String>,
    pub instructor_name: String,
    pub instructor_photo_url: Option<String>,
    pub is_free: bool,
    pub price: Option<sqlx::types::BigDecimal>,
    pub discount_pct: Option<i32>,
    pub language: String,
    pub level: Option<String>,
    pub total_lectures: i32,
    pub total_duration: i32,
    pub total_enrollments: i32,
}

#[derive(Debug, Serialize)]
pub struct CourseDetail {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: Option<String>,
    pub short_desc: Option<String>,
    pub thumbnail_url: Option<String>,
    pub instructor_id: Uuid,
    pub instructor_name: String,
    pub instructor_photo_url: Option<String>,
    pub instructor_bio: Option<String>,
    pub board_name: Option<String>,
    pub class_name: Option<String>,
    pub stream_name: Option<String>,
    pub subject_name: Option<String>,
    pub is_free: bool,
    pub price: Option<sqlx::types::BigDecimal>,
    pub discount_pct: Option<i32>,
    pub language: String,
    pub level: Option<String>,
    pub syllabus_points: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_full_course: bool,
    pub total_chapters: i32,
    pub total_lectures: i32,
    pub total_duration: i32,
    pub total_enrollments: i32,
    pub published_at: Option<chrono::DateTime<chrono::Utc>>,
    pub chapters: Vec<ChapterWithLectures>,
}

#[derive(Debug, Serialize)]
pub struct ChapterWithLectures {
    pub id: Uuid,
    pub title: String,
    pub sort_order: i32,
    pub lectures: Vec<LectureItem>,
}

#[derive(Debug, Serialize)]
pub struct LectureItem {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub duration: Option<i32>,
    pub is_preview: bool,
    pub is_published: bool,
}
