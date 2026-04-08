use axum::{
    extract::{Path, Query, State},
    Extension, Json,
};
use std::sync::Arc;
use validator::Validate;

use crate::dto::admin_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::middleware::role_guard::require_role;
use crate::models::category::Category;
use crate::models::user::UserRole;
use crate::services::{analytics_service, revenue_service};
use crate::utils::validation::slugify;

/// GET /api/admin/users
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Query(params): Query<AdminUserFilter>,
) -> Result<Json<Vec<AdminUserItem>>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let users = sqlx::query_as::<_, AdminUserRow>(
        r#"
        SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.email_verified, u.created_at,
               (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) as total_enrollments,
               (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = u.id) as total_courses
        FROM users u
        WHERE ($1::text IS NULL OR u.role = $1)
          AND ($2::bool IS NULL OR u.is_active = $2)
          AND ($3::text IS NULL OR u.full_name ILIKE '%' || $3 || '%' OR u.email ILIKE '%' || $3 || '%')
        ORDER BY u.created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(params.role.as_deref())
    .bind(params.is_active)
    .bind(params.search.as_deref())
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(users.into_iter().map(|r| r.into()).collect()))
}

#[derive(sqlx::FromRow)]
struct AdminUserRow {
    id: uuid::Uuid,
    email: String,
    full_name: String,
    role: String,
    is_active: bool,
    email_verified: bool,
    created_at: chrono::DateTime<chrono::Utc>,
    total_enrollments: Option<i64>,
    total_courses: Option<i64>,
}

impl From<AdminUserRow> for AdminUserItem {
    fn from(r: AdminUserRow) -> Self {
        Self {
            id: r.id,
            email: r.email,
            full_name: r.full_name,
            role: r.role,
            is_active: r.is_active,
            email_verified: r.email_verified,
            created_at: r.created_at,
            total_enrollments: r.total_enrollments,
            total_courses: r.total_courses,
        }
    }
}

/// PUT /api/admin/users/:id/role
pub async fn update_user_role(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(user_id): Path<uuid::Uuid>,
    Json(body): Json<UpdateUserRoleRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    if !["student", "instructor", "admin"].contains(&body.role.as_str()) {
        return Err(AppError::BadRequest("Invalid role".to_string()));
    }

    sqlx::query("UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .bind(&body.role)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    Ok(Json(serde_json::json!({ "message": "User role updated" })))
}

/// PUT /api/admin/users/:id/active
pub async fn toggle_user_active(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(user_id): Path<uuid::Uuid>,
    Json(body): Json<ToggleUserActiveRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    if user_id == auth_user.id {
        return Err(AppError::BadRequest("Cannot deactivate yourself".to_string()));
    }

    sqlx::query("UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .bind(body.is_active)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    Ok(Json(serde_json::json!({ "message": "User status updated" })))
}

/// GET /api/admin/courses
pub async fn list_all_courses(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Query(params): Query<AdminCourseFilter>,
) -> Result<Json<Vec<AdminCourseItem>>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let courses = sqlx::query_as::<_, AdminCourseRow>(
        r#"
        SELECT c.id, c.title, c.slug, u.full_name as instructor_name, c.instructor_id,
               c.status, c.is_free, c.price, c.total_enrollments, c.created_at
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        WHERE ($1::text IS NULL OR c.status = $1)
          AND ($2::uuid IS NULL OR c.instructor_id = $2)
        ORDER BY c.created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(params.status.as_deref())
    .bind(params.instructor_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(courses.into_iter().map(|r| r.into()).collect()))
}

#[derive(sqlx::FromRow)]
struct AdminCourseRow {
    id: uuid::Uuid,
    title: String,
    slug: String,
    instructor_name: String,
    instructor_id: uuid::Uuid,
    status: String,
    is_free: bool,
    price: Option<sqlx::types::BigDecimal>,
    total_enrollments: i32,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<AdminCourseRow> for AdminCourseItem {
    fn from(r: AdminCourseRow) -> Self {
        Self {
            id: r.id,
            title: r.title,
            slug: r.slug,
            instructor_name: r.instructor_name,
            instructor_id: r.instructor_id,
            status: r.status,
            is_free: r.is_free,
            price: r.price,
            total_enrollments: r.total_enrollments,
            created_at: r.created_at,
        }
    }
}

/// PUT /api/admin/courses/:id/approve
pub async fn approve_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let result = sqlx::query(
        "UPDATE courses SET status = 'published', published_at = NOW(), rejection_reason = NULL, updated_at = NOW() WHERE id = $1 AND status = 'pending_review'",
    )
    .bind(course_id)
    .execute(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "Course not found or not in pending_review status".to_string(),
        ));
    }

    Ok(Json(serde_json::json!({ "message": "Course approved and published" })))
}

/// PUT /api/admin/courses/:id/reject
pub async fn reject_course(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(course_id): Path<uuid::Uuid>,
    Json(body): Json<RejectCourseRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let result = sqlx::query(
        "UPDATE courses SET status = 'rejected', rejection_reason = $2, updated_at = NOW() WHERE id = $1 AND status = 'pending_review'",
    )
    .bind(course_id)
    .bind(&body.reason)
    .execute(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "Course not found or not in pending_review status".to_string(),
        ));
    }

    Ok(Json(serde_json::json!({ "message": "Course rejected" })))
}

/// POST /api/admin/categories
pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<CreateCategoryRequest>,
) -> Result<Json<Category>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;
    body.validate().map_err(AppError::Validation)?;

    if !["board", "class", "stream", "subject"].contains(&body.category_type.as_str()) {
        return Err(AppError::BadRequest("Invalid category type".to_string()));
    }

    let slug = slugify(&body.name);

    let category = sqlx::query_as::<_, Category>(
        r#"
        INSERT INTO categories (name, slug, type, parent_id, sort_order, icon_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&body.name)
    .bind(&slug)
    .bind(&body.category_type)
    .bind(body.parent_id)
    .bind(body.sort_order.unwrap_or(0))
    .bind(&body.icon_url)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(category))
}

/// PUT /api/admin/categories/:id
pub async fn update_category(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(category_id): Path<uuid::Uuid>,
    Json(body): Json<UpdateCategoryRequest>,
) -> Result<Json<Category>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let slug = body.name.as_ref().map(|n| slugify(n));

    let category = sqlx::query_as::<_, Category>(
        r#"
        UPDATE categories SET
            name = COALESCE($2, name),
            slug = COALESCE($3, slug),
            sort_order = COALESCE($4, sort_order),
            icon_url = COALESCE($5, icon_url),
            is_active = COALESCE($6, is_active)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(category_id)
    .bind(&body.name)
    .bind(&slug)
    .bind(body.sort_order)
    .bind(&body.icon_url)
    .bind(body.is_active)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(category))
}

/// DELETE /api/admin/categories/:id
pub async fn delete_category(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Path(category_id): Path<uuid::Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    sqlx::query("DELETE FROM categories WHERE id = $1")
        .bind(category_id)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    Ok(Json(serde_json::json!({ "message": "Category deleted" })))
}

/// GET /api/admin/analytics
pub async fn get_analytics(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<PlatformAnalytics>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let analytics = analytics_service::get_platform_analytics(&state.db).await?;
    Ok(Json(analytics))
}

/// PUT /api/admin/revenue/settings
pub async fn update_revenue_settings(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<UpdateRevenueSettingsRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    revenue_service::update_default_platform_pct(&state.db, auth_user.id, body.default_platform_pct)
        .await?;

    Ok(Json(serde_json::json!({ "message": "Revenue settings updated" })))
}

/// PUT /api/admin/revenue/override
pub async fn set_instructor_revenue_override(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<SetInstructorOverrideRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    revenue_service::set_instructor_override(
        &state.db,
        auth_user.id,
        body.instructor_id,
        body.platform_pct,
    )
    .await?;

    Ok(Json(serde_json::json!({ "message": "Instructor override set" })))
}

/// GET /api/admin/payouts
pub async fn list_pending_payouts(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<PayoutItem>>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let payouts = sqlx::query_as::<_, PayoutRow>(
        r#"
        SELECT ie.id, ie.instructor_id, u.full_name as instructor_name,
               ie.instructor_amount, ie.payout_status, ie.created_at
        FROM instructor_earnings ie
        JOIN users u ON u.id = ie.instructor_id
        WHERE ie.payout_status = 'pending'
        ORDER BY ie.created_at ASC
        "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(payouts.into_iter().map(|r| r.into()).collect()))
}

#[derive(sqlx::FromRow)]
struct PayoutRow {
    id: uuid::Uuid,
    instructor_id: uuid::Uuid,
    instructor_name: String,
    instructor_amount: sqlx::types::BigDecimal,
    payout_status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<PayoutRow> for PayoutItem {
    fn from(r: PayoutRow) -> Self {
        Self {
            id: r.id,
            instructor_id: r.instructor_id,
            instructor_name: r.instructor_name,
            instructor_amount: r.instructor_amount.to_string().parse().unwrap_or(0.0),
            payout_status: r.payout_status,
            created_at: r.created_at,
        }
    }
}

/// POST /api/admin/payouts/process
pub async fn process_payouts(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<ProcessPayoutRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    require_role(&auth_user, UserRole::Admin)?;

    let count =
        revenue_service::process_payouts(&state.db, &body.earning_ids, &body.payout_reference)
            .await?;

    Ok(Json(serde_json::json!({
        "message": format!("{} payouts processed", count),
        "processed_count": count,
    })))
}
