use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct EnrolledCourse {
    pub enrollment_id: Uuid,
    pub course_id: Uuid,
    pub title: String,
    pub slug: String,
    pub thumbnail_url: Option<String>,
    pub instructor_name: String,
    pub progress_pct: i32,
    pub enrolled_at: chrono::DateTime<chrono::Utc>,
    pub total_lectures: i32,
    pub completed_lectures: i64,
}

#[derive(Debug, Serialize)]
pub struct CourseProgress {
    pub course_id: Uuid,
    pub progress_pct: i32,
    pub total_lectures: i32,
    pub completed_lectures: i64,
    pub lectures: Vec<LectureProgress>,
}

#[derive(Debug, Serialize)]
pub struct LectureProgress {
    pub lecture_id: Uuid,
    pub title: String,
    pub watched_seconds: i32,
    pub is_completed: bool,
    pub last_watched_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProgressRequest {
    pub lecture_id: Uuid,
    pub course_id: Uuid,
    pub watched_seconds: i32,
    pub is_completed: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct AddBookmarkRequest {
    pub course_id: Option<Uuid>,
    pub lecture_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct BookmarkItem {
    pub id: Uuid,
    pub course_id: Option<Uuid>,
    pub course_title: Option<String>,
    pub course_slug: Option<String>,
    pub lecture_id: Option<Uuid>,
    pub lecture_title: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize)]
pub struct StudentDashboard {
    pub total_enrolled: i64,
    pub total_completed: i64,
    pub total_in_progress: i64,
    pub recent_courses: Vec<EnrolledCourse>,
    pub total_bookmarks: i64,
}
