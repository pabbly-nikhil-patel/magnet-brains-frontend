use axum::{
    extract::{Path, Query, State},
    Json,
};
use std::sync::Arc;

use crate::dto::course_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::models::category::Category;
use crate::services::course_service;
use crate::utils::pagination::PaginatedResponse;

/// GET /api/courses
pub async fn list_courses(
    State(state): State<Arc<AppState>>,
    Query(params): Query<CourseFilterParams>,
) -> Result<Json<PaginatedResponse<CourseListItem>>, AppError> {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);

    let result = course_service::list_courses(
        &state.db,
        params.board.as_deref(),
        params.class.as_deref(),
        params.stream.as_deref(),
        params.subject.as_deref(),
        params.is_free,
        params.language.as_deref(),
        params.level.as_deref(),
        page,
        limit,
    )
    .await?;

    Ok(Json(result))
}

/// GET /api/courses/search?q=...
pub async fn search_courses(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SearchParams>,
) -> Result<Json<PaginatedResponse<CourseListItem>>, AppError> {
    if params.q.trim().is_empty() {
        return Err(AppError::BadRequest("Search query is required".to_string()));
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);

    let result = course_service::search_courses(&state.db, &params.q, page, limit).await?;
    Ok(Json(result))
}

/// GET /api/courses/:slug
pub async fn get_course(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Json<CourseDetail>, AppError> {
    let course = course_service::get_course_by_slug(&state.db, &slug).await?;
    Ok(Json(course))
}

/// GET /api/categories
pub async fn get_categories(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Category>>, AppError> {
    let categories = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE is_active = true ORDER BY sort_order",
    )
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(categories))
}

/// GET /api/categories/:slug/courses
pub async fn get_category_courses(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
    Query(params): Query<CourseFilterParams>,
) -> Result<Json<PaginatedResponse<CourseListItem>>, AppError> {
    // Find the category
    let category = sqlx::query_as::<_, Category>(
        "SELECT * FROM categories WHERE slug = $1 AND is_active = true",
    )
    .bind(&slug)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Category not found".to_string()))?;

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);

    // Route by category type
    let (board, class, stream, subject) = match category.category_type.as_str() {
        "board" => (Some(slug.as_str()), None, None, None),
        "class" => (None, Some(slug.as_str()), None, None),
        "stream" => (None, None, Some(slug.as_str()), None),
        "subject" => (None, None, None, Some(slug.as_str())),
        _ => (None, None, None, None),
    };

    let result = course_service::list_courses(
        &state.db, board, class, stream, subject, None, None, None, page, limit,
    )
    .await?;

    Ok(Json(result))
}

/// GET /api/lectures/:id/stream — get a signed streaming URL
pub async fn get_lecture_stream(
    State(state): State<Arc<AppState>>,
    Path(lecture_id): Path<uuid::Uuid>,
    axum::Extension(auth_user): axum::Extension<crate::middleware::auth::AuthUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    // Fetch lecture
    let lecture = sqlx::query_as::<_, crate::models::lecture::Lecture>(
        "SELECT * FROM lectures WHERE id = $1",
    )
    .bind(lecture_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Lecture not found".to_string()))?;

    // Check access: enrolled or preview
    if !lecture.is_preview {
        let enrolled: (bool,) = sqlx::query_as(
            "SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)",
        )
        .bind(auth_user.id)
        .bind(lecture.course_id)
        .fetch_one(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

        if !enrolled.0 {
            return Err(AppError::Forbidden);
        }
    }

    let s3_key = lecture
        .video_s3_key
        .as_ref()
        .ok_or_else(|| AppError::NotFound("Video not available".to_string()))?;

    // Generate signed URL
    let stream_url = if !state.config.cloudfront_domain.is_empty()
        && !state.config.cloudfront_key_pair_id.is_empty()
    {
        let private_key = crate::utils::cloudfront::read_private_key(
            &state.config.cloudfront_private_key_path,
        )
        .map_err(|e| AppError::Internal(format!("CloudFront key error: {}", e)))?;

        crate::utils::cloudfront::generate_signed_url(
            &state.config.cloudfront_domain,
            s3_key,
            &state.config.cloudfront_key_pair_id,
            &private_key,
            7200, // 2 hours
        )
        .map_err(|e| AppError::Internal(format!("CloudFront sign error: {}", e)))?
    } else {
        // Fallback to S3 presigned URL
        crate::utils::s3::generate_presigned_download_url(
            &state.s3_client,
            &state.config.s3_bucket_name,
            s3_key,
            7200,
        )
        .await
        .map_err(|e| AppError::Internal(format!("S3 presign error: {}", e)))?
    };

    Ok(Json(serde_json::json!({
        "stream_url": stream_url,
        "duration": lecture.duration,
        "title": lecture.title,
    })))
}
