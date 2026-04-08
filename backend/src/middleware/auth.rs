use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use uuid::Uuid;

use crate::error::AppError;
use crate::handlers::AppState;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
}

/// Middleware that extracts and validates JWT from the Authorization header.
/// Sets AuthUser as a request extension.
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or(AppError::Unauthorized)?;

    let claims = state
        .jwt_manager
        .verify_token(token)
        .map_err(|_| AppError::Unauthorized)?;

    let auth_user = AuthUser {
        id: claims.sub,
        email: claims.email,
        role: claims.role,
    };

    request.extensions_mut().insert(auth_user);
    Ok(next.run(request).await)
}

/// Optional auth middleware — does not fail if no token is present,
/// but sets AuthUser if a valid token is found.
pub async fn optional_auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Response {
    if let Some(auth_header) = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
    {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            if let Ok(claims) = state.jwt_manager.verify_token(token) {
                let auth_user = AuthUser {
                    id: claims.sub,
                    email: claims.email,
                    role: claims.role,
                };
                request.extensions_mut().insert(auth_user);
            }
        }
    }

    next.run(request).await
}
