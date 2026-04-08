use axum::{extract::State, Extension, Json};
use std::sync::Arc;
use validator::Validate;

use crate::dto::auth_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::services::auth_service;
use crate::utils::password;

/// POST /api/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate().map_err(AppError::Validation)?;

    let role = body.role.as_deref().unwrap_or("student");
    if !["student", "instructor"].contains(&role) {
        return Err(AppError::BadRequest("Invalid role".to_string()));
    }

    let user = auth_service::register_user(&state.db, &body.email, &body.password, &body.full_name, role).await?;

    let refresh_token =
        auth_service::create_refresh_token(&state.db, user.id, state.config.jwt_refresh_expiry)
            .await?;

    let response =
        auth_service::build_auth_response(&user, &state.jwt_manager, state.config.jwt_access_expiry, refresh_token)?;

    Ok(Json(response))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate().map_err(AppError::Validation)?;

    let user = auth_service::authenticate_user(&state.db, &body.email, &body.password).await?;

    let refresh_token =
        auth_service::create_refresh_token(&state.db, user.id, state.config.jwt_refresh_expiry)
            .await?;

    let response =
        auth_service::build_auth_response(&user, &state.jwt_manager, state.config.jwt_access_expiry, refresh_token)?;

    Ok(Json(response))
}

/// POST /api/auth/refresh
pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RefreshTokenRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let user_id =
        auth_service::validate_refresh_token(&state.db, &body.refresh_token).await?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1 AND is_active = true",
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or(AppError::Unauthorized)?;

    let new_refresh =
        auth_service::create_refresh_token(&state.db, user.id, state.config.jwt_refresh_expiry)
            .await?;

    let response =
        auth_service::build_auth_response(&user, &state.jwt_manager, state.config.jwt_access_expiry, new_refresh)?;

    Ok(Json(response))
}

/// POST /api/auth/logout
pub async fn logout(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<serde_json::Value>, AppError> {
    auth_service::revoke_user_tokens(&state.db, auth_user.id).await?;
    Ok(Json(serde_json::json!({ "message": "Logged out successfully" })))
}

/// GET /api/auth/me
pub async fn get_me(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<UserResponse>, AppError> {
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(UserResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        bio: user.bio,
        phone: user.phone,
        is_active: user.is_active,
        email_verified: user.email_verified,
    }))
}

/// PUT /api/auth/profile
pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<UpdateProfileRequest>,
) -> Result<Json<UserResponse>, AppError> {
    let user = sqlx::query_as::<_, crate::models::user::User>(
        r#"
        UPDATE users SET
            full_name = COALESCE($2, full_name),
            bio = COALESCE($3, bio),
            phone = COALESCE($4, phone),
            avatar_url = COALESCE($5, avatar_url),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(auth_user.id)
    .bind(&body.full_name)
    .bind(&body.bio)
    .bind(&body.phone)
    .bind(&body.avatar_url)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(Json(UserResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
        bio: user.bio,
        phone: user.phone,
        is_active: user.is_active,
        email_verified: user.email_verified,
    }))
}

/// PUT /api/auth/change-password
pub async fn change_password(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    body.validate().map_err(AppError::Validation)?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(auth_user.id)
    .fetch_one(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    let valid = password::verify_password(&body.current_password, &user.password_hash)
        .map_err(|e| AppError::Internal(e.to_string()))?;
    if !valid {
        return Err(AppError::BadRequest("Current password is incorrect".to_string()));
    }

    let new_hash = password::hash_password(&body.new_password)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1")
        .bind(auth_user.id)
        .bind(&new_hash)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    // Revoke all refresh tokens
    auth_service::revoke_user_tokens(&state.db, auth_user.id).await?;

    Ok(Json(serde_json::json!({ "message": "Password changed successfully" })))
}

/// POST /api/auth/forgot-password
pub async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ForgotPasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    body.validate().map_err(AppError::Validation)?;

    // Always return success to prevent email enumeration
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await
    .map_err(AppError::Sqlx)?;

    if let Some(user) = user {
        // Generate a reset token (reuse refresh token mechanism with short expiry)
        let reset_token =
            auth_service::create_refresh_token(&state.db, user.id, 1800).await?; // 30 min

        // Send email (best-effort, don't fail the request)
        let _ = crate::services::email_service::send_password_reset_email(
            &state.ses_client,
            &state.config,
            &user.email,
            &reset_token,
        )
        .await;
    }

    Ok(Json(serde_json::json!({ "message": "If an account with that email exists, a reset link has been sent." })))
}

/// POST /api/auth/reset-password
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(body): Json<ResetPasswordRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    body.validate().map_err(AppError::Validation)?;

    let user_id = auth_service::validate_refresh_token(&state.db, &body.token).await?;

    let new_hash = password::hash_password(&body.new_password)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1")
        .bind(user_id)
        .bind(&new_hash)
        .execute(&state.db)
        .await
        .map_err(AppError::Sqlx)?;

    auth_service::revoke_user_tokens(&state.db, user_id).await?;

    Ok(Json(serde_json::json!({ "message": "Password reset successfully" })))
}
