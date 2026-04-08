use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCourseRequest {
    #[validate(length(min = 1, message = "Title is required"))]
    pub title: String,
    pub description: Option<String>,
    pub short_desc: Option<String>,
    pub board_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub stream_id: Option<Uuid>,
    pub subject_id: Option<Uuid>,
    pub is_free: Option<bool>,
    pub price: Option<f64>,
    pub discount_pct: Option<i32>,
    pub language: Option<String>,
    pub level: Option<String>,
    pub syllabus_points: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_full_course: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateCourseRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub short_desc: Option<String>,
    pub thumbnail_url: Option<String>,
    pub instructor_photo_url: Option<String>,
    pub board_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub stream_id: Option<Uuid>,
    pub subject_id: Option<Uuid>,
    pub is_free: Option<bool>,
    pub price: Option<f64>,
    pub discount_pct: Option<i32>,
    pub language: Option<String>,
    pub level: Option<String>,
    pub syllabus_points: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_full_course: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateChapterRequest {
    #[validate(length(min = 1, message = "Title is required"))]
    pub title: String,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChapterRequest {
    pub title: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateLectureRequest {
    #[validate(length(min = 1, message = "Title is required"))]
    pub title: String,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_preview: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLectureRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub video_s3_key: Option<String>,
    pub video_url: Option<String>,
    pub duration: Option<i32>,
    pub video_status: Option<String>,
    pub is_preview: Option<bool>,
    pub is_published: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct InstructorDashboard {
    pub total_courses: i64,
    pub total_students: i64,
    pub total_earnings: f64,
    pub pending_payouts: f64,
    pub courses: Vec<InstructorCourseItem>,
}

#[derive(Debug, Serialize)]
pub struct InstructorCourseItem {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub status: String,
    pub total_enrollments: i32,
    pub total_lectures: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct EarningsSummary {
    pub total_earnings: f64,
    pub pending_payouts: f64,
    pub paid_out: f64,
    pub recent_earnings: Vec<EarningItem>,
}

#[derive(Debug, Serialize)]
pub struct EarningItem {
    pub id: Uuid,
    pub course_title: String,
    pub order_amount: f64,
    pub platform_pct: i32,
    pub instructor_amount: f64,
    pub payout_status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct UploadRequest {
    pub file_name: String,
    pub content_type: String,
    pub upload_type: String, // "video", "thumbnail", "attachment"
}

#[derive(Debug, Serialize)]
pub struct UploadResponse {
    pub upload_url: String,
    pub s3_key: String,
    pub public_url: String,
}
