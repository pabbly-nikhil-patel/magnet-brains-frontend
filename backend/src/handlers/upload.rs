use axum::{extract::State, Extension, Json};
use std::sync::Arc;

use crate::dto::instructor_dto::{UploadRequest, UploadResponse};
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::middleware::role_guard::require_any_role;
use crate::models::user::UserRole;
use crate::services::upload_service;

/// POST /api/upload/presigned-url
pub async fn get_presigned_upload_url(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<UploadRequest>,
) -> Result<Json<UploadResponse>, AppError> {
    // Instructors and admins can upload
    require_any_role(&auth_user, &[UserRole::Instructor, UserRole::Admin])?;

    let response =
        upload_service::generate_upload_url(&state.s3_client, &state.config, auth_user.id, &body)
            .await?;

    Ok(Json(response))
}
