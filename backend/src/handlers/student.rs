use axum::{
    extract::{Path, State},
    Extension, Json,
};
use std::sync::Arc;

use crate::dto::student_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::middleware::role_guard::require_role;
use crate::models::user::UserRole;
use crate::services::enrollment_service;

/// POST /api/student/enroll/:course_id
pub async fn enroll(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    enrollment_service::enroll_free_course(&state.db, auth_user.id, course_id).await?;

    Ok(Json(serde_json::json!({ "message": "Enrolled successfully" })))
}

/// GET /api/student/enrollments
pub async fn list_enrollments(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<EnrolledCourse>>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let enrollments = enrollment_service::list_enrollments(&state.db, auth_user.id).await?;
    Ok(Json(enrollments))
}

/// GET /api/student/progress/:course_id
pub async fn get_progress(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
) -> Result<Json<CourseProgress>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let progress =
        enrollment_service::get_course_progress(&state.db, auth_user.id, course_id).await?;
    Ok(Json(progress))
}

/// POST /api/student/progress
pub async fn update_progress(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<UpdateProgressRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    enrollment_service::update_progress(
        &state.db,
        auth_user.id,
        body.lecture_id,
        body.course_id,
        body.watched_seconds,
        body.is_completed.unwrap_or(false),
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "Progress updated" })))
}

/// GET /api/student/bookmarks
pub async fn list_bookmarks(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<BookmarkItem>>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let bookmarks = sqlx::query_as::<_, BookmarkRow>(
        r#"
        SELECT b.id, b.course_id, c.title as course_title, c.slug as course_slug,
               b.lecture_id, l.title as lecture_title, b.created_at
        FROM bookmarks b
        LEFT JOIN courses c ON c.id = b.course_id
        LEFT JOIN lectures l ON l.id = b.lecture_id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
        "#,
    )
    .bind(auth_user.id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(bookmarks.into_iter().map(|r| r.into()).collect()))
}

#[derive(sqlx::FromRow)]
struct BookmarkRow {
    id: uuid::Uuid,
    course_id: Option<uuid::Uuid>,
    course_title: Option<String>,
    course_slug: Option<String>,
    lecture_id: Option<uuid::Uuid>,
    lecture_title: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<BookmarkRow> for BookmarkItem {
    fn from(r: BookmarkRow) -> Self {
        Self {
            id: r.id,
            course_id: r.course_id,
            course_title: r.course_title,
            course_slug: r.course_slug,
            lecture_id: r.lecture_id,
            lecture_title: r.lecture_title,
            created_at: r.created_at,
        }
    }
}

/// POST /api/student/bookmarks
pub async fn add_bookmark(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<AddBookmarkRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    if body.course_id.is_none() && body.lecture_id.is_none() {
        return Err(AppError::BadRequest(
            "Either course_id or lecture_id is required".to_string(),
        ));
    }

    sqlx::query(
        "INSERT INTO bookmarks (user_id, course_id, lecture_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    )
    .bind(auth_user.id)
    .bind(body.course_id)
    .bind(body.lecture_id)
    .execute(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(serde_json::json!({ "message": "Bookmark added" })))
}

/// DELETE /api/student/bookmarks/:id
pub async fn remove_bookmark(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(bookmark_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let result = sqlx::query("DELETE FROM bookmarks WHERE id = $1 AND user_id = $2")
        .bind(bookmark_id)
        .bind(auth_user.id)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Bookmark not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "message": "Bookmark removed" })))
}

/// GET /api/student/dashboard
pub async fn dashboard(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<StudentDashboard>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let dashboard = enrollment_service::get_student_dashboard(&state.db, auth_user.id).await?;
    Ok(Json(dashboard))
}
