use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize)]
pub struct AdminUserFilter {
    pub role: Option<String>,
    pub is_active: Option<bool>,
    pub search: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AdminUserItem {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub is_active: bool,
    pub email_verified: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub total_enrollments: Option<i64>,
    pub total_courses: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct ToggleUserActiveRequest {
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct AdminCourseFilter {
    pub status: Option<String>,
    pub instructor_id: Option<Uuid>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct AdminCourseItem {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub instructor_name: String,
    pub instructor_id: Uuid,
    pub status: String,
    pub is_free: bool,
    pub price: Option<sqlx::types::BigDecimal>,
    pub total_enrollments: i32,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RejectCourseRequest {
    pub reason: String,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateCategoryRequest {
    #[validate(length(min = 1, message = "Name is required"))]
    pub name: String,
    #[serde(rename = "type")]
    pub category_type: String,
    pub parent_id: Option<Uuid>,
    pub sort_order: Option<i32>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCategoryRequest {
    pub name: Option<String>,
    pub sort_order: Option<i32>,
    pub icon_url: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRevenueSettingsRequest {
    pub default_platform_pct: i32,
}

#[derive(Debug, Deserialize)]
pub struct SetInstructorOverrideRequest {
    pub instructor_id: Uuid,
    pub platform_pct: i32,
}

#[derive(Debug, Serialize)]
pub struct PlatformAnalytics {
    pub total_users: i64,
    pub total_students: i64,
    pub total_instructors: i64,
    pub total_courses: i64,
    pub published_courses: i64,
    pub total_enrollments: i64,
    pub total_revenue: f64,
    pub platform_earnings: f64,
    pub top_courses: Vec<TopCourseItem>,
}

#[derive(Debug, Serialize)]
pub struct TopCourseItem {
    pub id: Uuid,
    pub title: String,
    pub instructor_name: String,
    pub total_enrollments: i32,
    pub revenue: f64,
}

#[derive(Debug, Serialize)]
pub struct PayoutItem {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub instructor_name: String,
    pub instructor_amount: f64,
    pub payout_status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ProcessPayoutRequest {
    pub earning_ids: Vec<Uuid>,
    pub payout_reference: String,
}
