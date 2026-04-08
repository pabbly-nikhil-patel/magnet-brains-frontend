use axum::{
    extract::{ConnectInfo, Request, State},
    middleware::Next,
    response::Response,
};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::error::AppError;
use crate::handlers::AppState;

/// Simple Redis-based rate limiter.
/// Allows `max_requests` per `window_secs` per IP.
pub async fn rate_limit_middleware(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let ip = addr.ip().to_string();
    let key = format!("rate_limit:{}", ip);
    let window_secs: u64 = 60;
    let max_requests: i64 = 100;

    let mut conn = state
        .redis
        .get_multiplexed_async_connection()
        .await
        .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;

    let count: i64 = redis::cmd("INCR")
        .arg(&key)
        .query_async(&mut conn)
        .await
        .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;

    if count == 1 {
        let _: () = redis::cmd("EXPIRE")
            .arg(&key)
            .arg(window_secs)
            .query_async(&mut conn)
            .await
            .map_err(|e| AppError::Internal(format!("Redis error: {}", e)))?;
    }

    if count > max_requests {
        return Err(AppError::BadRequest("Rate limit exceeded. Try again later.".to_string()));
    }

    Ok(next.run(request).await)
}
