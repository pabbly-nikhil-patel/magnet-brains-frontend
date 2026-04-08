use axum::{extract::State, Json};
use std::sync::Arc;

use crate::error::AppError;
use crate::handlers::AppState;
use crate::models::homepage::HomepageContent;

/// GET /api/homepage
pub async fn get_homepage(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<HomepageContent>>, AppError> {
    let content = sqlx::query_as::<_, HomepageContent>(
        "SELECT * FROM homepage_content WHERE is_active = true ORDER BY section, sort_order",
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(content))
}

/// PUT /api/admin/homepage/:id — admin update homepage content
pub async fn update_homepage_content(
    State(state): State<Arc<AppState>>,
    axum::Extension(auth_user): axum::Extension<crate::middleware::auth::AuthUser>,
    axum::extract::Path(content_id): axum::extract::Path<uuid::Uuid>,
    Json(body): Json<UpdateHomepageRequest>,
) -> Result<Json<HomepageContent>, AppError> {
    crate::middleware::role_guard::require_role(
        &auth_user,
        crate::models::user::UserRole::Admin,
    )?;

    let content = sqlx::query_as::<_, HomepageContent>(
        r#"
        UPDATE homepage_content SET
            title = COALESCE($2, title),
            content = COALESCE($3, content),
            image_url = COALESCE($4, image_url),
            link_url = COALESCE($5, link_url),
            sort_order = COALESCE($6, sort_order),
            is_active = COALESCE($7, is_active),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(content_id)
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.image_url)
    .bind(&body.link_url)
    .bind(body.sort_order)
    .bind(body.is_active)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(content))
}

/// POST /api/admin/homepage — admin create homepage content
pub async fn create_homepage_content(
    State(state): State<Arc<AppState>>,
    axum::Extension(auth_user): axum::Extension<crate::middleware::auth::AuthUser>,
    Json(body): Json<CreateHomepageRequest>,
) -> Result<Json<HomepageContent>, AppError> {
    crate::middleware::role_guard::require_role(
        &auth_user,
        crate::models::user::UserRole::Admin,
    )?;

    let content = sqlx::query_as::<_, HomepageContent>(
        r#"
        INSERT INTO homepage_content (section, title, content, image_url, link_url, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        "#,
    )
    .bind(&body.section)
    .bind(&body.title)
    .bind(&body.content)
    .bind(&body.image_url)
    .bind(&body.link_url)
    .bind(body.sort_order.unwrap_or(0))
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(content))
}

#[derive(serde::Deserialize)]
pub struct UpdateHomepageRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub image_url: Option<String>,
    pub link_url: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(serde::Deserialize)]
pub struct CreateHomepageRequest {
    pub section: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub image_url: Option<String>,
    pub link_url: Option<String>,
    pub sort_order: Option<i32>,
}
