use chrono::Utc;
use rand::Rng;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::auth_dto::{AuthResponse, UserResponse};
use crate::error::AppError;
use crate::models::user::User;
use crate::utils::jwt::JwtManager;
use crate::utils::password;

/// Create a new refresh token, store its hash in DB, return the raw token.
pub async fn create_refresh_token(
    db: &PgPool,
    user_id: Uuid,
    expiry_seconds: i64,
) -> Result<String, AppError> {
    let raw_token: String = rand::thread_rng()
        .sample_iter(&rand::distributions::Alphanumeric)
        .take(64)
        .map(char::from)
        .collect();

    let token_hash = hex::encode(Sha256::digest(raw_token.as_bytes()));
    let expires_at = Utc::now() + chrono::Duration::seconds(expiry_seconds);

    sqlx::query(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    )
    .bind(user_id)
    .bind(&token_hash)
    .bind(expires_at)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(raw_token)
}

/// Validate a refresh token and return the associated user_id.
pub async fn validate_refresh_token(db: &PgPool, raw_token: &str) -> Result<Uuid, AppError> {
    let token_hash = hex::encode(Sha256::digest(raw_token.as_bytes()));

    let row: Option<(Uuid, bool)> = sqlx::query_as(
        "SELECT user_id, revoked FROM refresh_tokens WHERE token_hash = $1 AND expires_at > NOW()",
    )
    .bind(&token_hash)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    match row {
        Some((user_id, revoked)) => {
            if revoked {
                return Err(AppError::Unauthorized);
            }
            Ok(user_id)
        }
        None => Err(AppError::Unauthorized),
    }
}

/// Revoke all refresh tokens for a user.
pub async fn revoke_user_tokens(db: &PgPool, user_id: Uuid) -> Result<(), AppError> {
    sqlx::query("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1")
        .bind(user_id)
        .execute(db)
        .await
        .map_err(AppError::Sqlx)?;
    Ok(())
}

/// Build the full auth response with tokens.
pub fn build_auth_response(
    user: &User,
    jwt_manager: &JwtManager,
    access_expiry: i64,
    refresh_token: String,
) -> Result<AuthResponse, AppError> {
    let access_token = jwt_manager
        .generate_access_token(user.id, &user.email, &user.role, access_expiry)
        .map_err(|e| AppError::Internal(format!("JWT error: {}", e)))?;

    Ok(AuthResponse {
        access_token,
        refresh_token,
        user: UserResponse {
            id: user.id,
            email: user.email.clone(),
            full_name: user.full_name.clone(),
            role: user.role.clone(),
            avatar_url: user.avatar_url.clone(),
            bio: user.bio.clone(),
            phone: user.phone.clone(),
            is_active: user.is_active,
            email_verified: user.email_verified,
        },
    })
}

/// Register a new user.
pub async fn register_user(
    db: &PgPool,
    email: &str,
    raw_password: &str,
    full_name: &str,
    role: &str,
) -> Result<User, AppError> {
    // Check duplicate
    let exists: (bool,) =
        sqlx::query_as("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(email)
            .fetch_one(db)
            .await
            .map_err(AppError::Sqlx)?;

    if exists.0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let password_hash =
        password::hash_password(raw_password).map_err(|e| AppError::Internal(e.to_string()))?;

    let user = sqlx::query_as::<_, User>(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *",
    )
    .bind(email)
    .bind(&password_hash)
    .bind(full_name)
    .bind(role)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(user)
}

/// Authenticate a user with email and password.
pub async fn authenticate_user(
    db: &PgPool,
    email: &str,
    raw_password: &str,
) -> Result<User, AppError> {
    let user = sqlx::query_as::<_, User>(
        "SELECT * FROM users WHERE email = $1 AND is_active = true",
    )
    .bind(email)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or(AppError::Unauthorized)?;

    let valid = password::verify_password(raw_password, &user.password_hash)
        .map_err(|e| AppError::Internal(e.to_string()))?;

    if !valid {
        return Err(AppError::Unauthorized);
    }

    Ok(user)
}
