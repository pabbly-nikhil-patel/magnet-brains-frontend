use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use std::sync::Arc;

use crate::dto::instructor_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::middleware::role_guard::require_role;
use crate::models::user::UserRole;
use crate::services::{course_service, revenue_service};
use crate::utils::pagination::PaginationParams;

/// GET /api/instructor/courses
pub async fn list_my_courses(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Vec<InstructorCourseItem>>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    let courses = sqlx::query_as::<_, InstructorCourseRow>(
        r#"
        SELECT id, title, slug, status, total_enrollments, total_lectures, created_at
        FROM courses WHERE instructor_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(auth_user.id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(courses.into_iter().map(|r| r.into()).collect()))
}

#[derive(sqlx::FromRow)]
struct InstructorCourseRow {
    id: uuid::Uuid,
    title: String,
    slug: String,
    status: String,
    total_enrollments: i32,
    total_lectures: i32,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<InstructorCourseRow> for InstructorCourseItem {
    fn from(r: InstructorCourseRow) -> Self {
        Self {
            id: r.id,
            title: r.title,
            slug: r.slug,
            status: r.status,
            total_enrollments: r.total_enrollments,
            total_lectures: r.total_lectures,
            created_at: r.created_at,
        }
    }
}

/// POST /api/instructor/courses
pub async fn create_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<CreateCourseRequest>,
) -> Result<Json<crate::models::course::Course>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;
    body.validate().map_err(|e| AppError::Validation(e))?;

    let course = course_service::create_course(
        &state.db,
        auth_user.id,
        &body.title,
        body.description.as_deref(),
        body.short_desc.as_deref(),
        body.board_id,
        body.class_id,
        body.stream_id,
        body.subject_id,
        body.is_free.unwrap_or(true),
        body.price,
        body.discount_pct,
        body.language.as_deref().unwrap_or("hindi"),
        body.level.as_deref(),
        body.syllabus_points.as_deref(),
        body.tags.as_deref(),
        body.is_full_course.unwrap_or(false),
    )
    .await?;

    Ok(Json(course))
}

use validator::Validate;

/// PUT /api/instructor/courses/:id
pub async fn update_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
    Json(body): Json<UpdateCourseRequest>,
) -> Result<Json<crate::models::course::Course>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    // Verify ownership
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2)",
    )
    .bind(course_id)
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if !exists.0 {
        return Err(AppError::NotFound("Course not found".to_string()));
    }

    let slug = body.title.as_ref().map(|t| crate::utils::validation::slugify(t));

    let course = sqlx::query_as::<_, crate::models::course::Course>(
        r#"
        UPDATE courses SET
            title = COALESCE($2, title),
            slug = COALESCE($3, slug),
            description = COALESCE($4, description),
            short_desc = COALESCE($5, short_desc),
            thumbnail_url = COALESCE($6, thumbnail_url),
            instructor_photo_url = COALESCE($7, instructor_photo_url),
            board_id = COALESCE($8, board_id),
            class_id = COALESCE($9, class_id),
            stream_id = COALESCE($10, stream_id),
            subject_id = COALESCE($11, subject_id),
            is_free = COALESCE($12, is_free),
            language = COALESCE($13, language),
            level = COALESCE($14, level),
            is_full_course = COALESCE($15, is_full_course),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(course_id)
    .bind(&body.title)
    .bind(&slug)
    .bind(&body.description)
    .bind(&body.short_desc)
    .bind(&body.thumbnail_url)
    .bind(&body.instructor_photo_url)
    .bind(body.board_id)
    .bind(body.class_id)
    .bind(body.stream_id)
    .bind(body.subject_id)
    .bind(body.is_free)
    .bind(&body.language)
    .bind(&body.level)
    .bind(body.is_full_course)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(course))
}

/// DELETE /api/instructor/courses/:id
pub async fn delete_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    // Only allow deleting draft courses with no enrollments
    let result = sqlx::query(
        "DELETE FROM courses WHERE id = $1 AND instructor_id = $2 AND status = 'draft' AND total_enrollments = 0",
    )
    .bind(course_id)
    .bind(auth_user.id)
    .execute(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "Cannot delete: course must be in draft status with no enrollments".to_string(),
        ));
    }

    Ok(Json(serde_json::json!({ "message": "Course deleted" })))
}

/// POST /api/instructor/courses/:id/submit
pub async fn submit_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    course_service::submit_for_review(&state.db, course_id, auth_user.id).await?;
    Ok(Json(serde_json::json!({ "message": "Course submitted for review" })))
}

/// POST /api/instructor/courses/:course_id/chapters
pub async fn create_chapter(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
    Json(body): Json<CreateChapterRequest>,
) -> Result<Json<crate::models::chapter::Chapter>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;
    body.validate().map_err(|e| AppError::Validation(e))?;

    // Verify ownership
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM courses WHERE id = $1 AND instructor_id = $2)",
    )
    .bind(course_id)
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if !exists.0 {
        return Err(AppError::NotFound("Course not found".to_string()));
    }

    let sort_order = body.sort_order.unwrap_or_else(|| {
        // Will be set after insert if not provided
        0
    });

    let chapter = sqlx::query_as::<_, crate::models::chapter::Chapter>(
        "INSERT INTO chapters (course_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *",
    )
    .bind(course_id)
    .bind(&body.title)
    .bind(sort_order)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    course_service::recalculate_course_counts(&state.db, course_id).await?;

    Ok(Json(chapter))
}

/// PUT /api/instructor/chapters/:id
pub async fn update_chapter(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(chapter_id): Path<uuid::Uuid>,
    Json(body): Json<UpdateChapterRequest>,
) -> Result<Json<crate::models::chapter::Chapter>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    // Verify ownership through course
    let chapter = sqlx::query_as::<_, crate::models::chapter::Chapter>(
        r#"
        SELECT ch.* FROM chapters ch
        JOIN courses c ON c.id = ch.course_id
        WHERE ch.id = $1 AND c.instructor_id = $2
        "#,
    )
    .bind(chapter_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Chapter not found".to_string()))?;

    let updated = sqlx::query_as::<_, crate::models::chapter::Chapter>(
        r#"
        UPDATE chapters SET
            title = COALESCE($2, title),
            sort_order = COALESCE($3, sort_order),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(chapter_id)
    .bind(&body.title)
    .bind(body.sort_order)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(updated))
}

/// DELETE /api/instructor/chapters/:id
pub async fn delete_chapter(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(chapter_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    let chapter = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        SELECT ch.course_id FROM chapters ch
        JOIN courses c ON c.id = ch.course_id
        WHERE ch.id = $1 AND c.instructor_id = $2
        "#,
    )
    .bind(chapter_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Chapter not found".to_string()))?;

    sqlx::query("DELETE FROM chapters WHERE id = $1")
        .bind(chapter_id)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    course_service::recalculate_course_counts(&state.db, chapter.0).await?;

    Ok(Json(serde_json::json!({ "message": "Chapter deleted" })))
}

/// POST /api/instructor/chapters/:chapter_id/lectures
pub async fn create_lecture(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(chapter_id): Path<uuid::Uuid>,
    Json(body): Json<CreateLectureRequest>,
) -> Result<Json<crate::models::lecture::Lecture>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;
    body.validate().map_err(|e| AppError::Validation(e))?;

    // Get course_id and verify ownership
    let chapter = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        SELECT ch.course_id FROM chapters ch
        JOIN courses c ON c.id = ch.course_id
        WHERE ch.id = $1 AND c.instructor_id = $2
        "#,
    )
    .bind(chapter_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Chapter not found".to_string()))?;

    let lecture = sqlx::query_as::<_, crate::models::lecture::Lecture>(
        r#"
        INSERT INTO lectures (chapter_id, course_id, title, description, sort_order, is_preview)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(chapter_id)
    .bind(chapter.0)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.sort_order.unwrap_or(0))
    .bind(body.is_preview.unwrap_or(false))
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    course_service::recalculate_course_counts(&state.db, chapter.0).await?;

    Ok(Json(lecture))
}

/// PUT /api/instructor/lectures/:id
pub async fn update_lecture(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(lecture_id): Path<uuid::Uuid>,
    Json(body): Json<UpdateLectureRequest>,
) -> Result<Json<crate::models::lecture::Lecture>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    // Verify ownership
    let lecture = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        SELECT l.course_id FROM lectures l
        JOIN courses c ON c.id = l.course_id
        WHERE l.id = $1 AND c.instructor_id = $2
        "#,
    )
    .bind(lecture_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Lecture not found".to_string()))?;

    let updated = sqlx::query_as::<_, crate::models::lecture::Lecture>(
        r#"
        UPDATE lectures SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            sort_order = COALESCE($4, sort_order),
            video_s3_key = COALESCE($5, video_s3_key),
            video_url = COALESCE($6, video_url),
            duration = COALESCE($7, duration),
            video_status = COALESCE($8, video_status),
            is_preview = COALESCE($9, is_preview),
            is_published = COALESCE($10, is_published),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(lecture_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.sort_order)
    .bind(&body.video_s3_key)
    .bind(&body.video_url)
    .bind(body.duration)
    .bind(&body.video_status)
    .bind(body.is_preview)
    .bind(body.is_published)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    course_service::recalculate_course_counts(&state.db, lecture.0).await?;

    Ok(Json(updated))
}

/// DELETE /api/instructor/lectures/:id
pub async fn delete_lecture(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(lecture_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    let lecture = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        SELECT l.course_id FROM lectures l
        JOIN courses c ON c.id = l.course_id
        WHERE l.id = $1 AND c.instructor_id = $2
        "#,
    )
    .bind(lecture_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Lecture not found".to_string()))?;

    sqlx::query("DELETE FROM lectures WHERE id = $1")
        .bind(lecture_id)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    course_service::recalculate_course_counts(&state.db, lecture.0).await?;

    Ok(Json(serde_json::json!({ "message": "Lecture deleted" })))
}

/// GET /api/instructor/dashboard
pub async fn instructor_dashboard(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<InstructorDashboard>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    let total_courses: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM courses WHERE instructor_id = $1",
    )
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    let total_students: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE c.instructor_id = $1
        "#,
    )
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    let (total_earnings, pending_payouts, _paid) =
        revenue_service::get_instructor_earnings(&state.db, auth_user.id).await?;

    let courses = sqlx::query_as::<_, InstructorCourseRow>(
        "SELECT id, title, slug, status, total_enrollments, total_lectures, created_at FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT 10",
    )
    .bind(auth_user.id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(InstructorDashboard {
        total_courses: total_courses.0,
        total_students: total_students.0,
        total_earnings,
        pending_payouts,
        courses: courses.into_iter().map(|r| r.into()).collect(),
    }))
}

/// GET /api/instructor/earnings
pub async fn get_earnings(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<EarningsSummary>, AppError> {
    require_role(&auth_user, UserRole::Instructor)?;

    let (total, pending, paid) =
        revenue_service::get_instructor_earnings(&state.db, auth_user.id).await?;

    let recent = sqlx::query_as::<_, EarningRow>(
        r#"
        SELECT ie.id, c.title as course_title, ie.order_amount, ie.platform_pct,
               ie.instructor_amount, ie.payout_status, ie.created_at
        FROM instructor_earnings ie
        JOIN courses c ON c.id = ie.course_id
        WHERE ie.instructor_id = $1
        ORDER BY ie.created_at DESC
        LIMIT 20
        "#,
    )
    .bind(auth_user.id)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(EarningsSummary {
        total_earnings: total,
        pending_payouts: pending,
        paid_out: paid,
        recent_earnings: recent.into_iter().map(|r| r.into()).collect(),
    }))
}

#[derive(sqlx::FromRow)]
struct EarningRow {
    id: uuid::Uuid,
    course_title: String,
    order_amount: sqlx::types::BigDecimal,
    platform_pct: i32,
    instructor_amount: sqlx::types::BigDecimal,
    payout_status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<EarningRow> for EarningItem {
    fn from(r: EarningRow) -> Self {
        Self {
            id: r.id,
            course_title: r.course_title,
            order_amount: r.order_amount.to_string().parse().unwrap_or(0.0),
            platform_pct: r.platform_pct,
            instructor_amount: r.instructor_amount.to_string().parse().unwrap_or(0.0),
            payout_status: r.payout_status,
            created_at: r.created_at,
        }
    }
}
