use axum::{
    extract::State,
    http::HeaderMap,
    Extension, Json,
};
use std::sync::Arc;

use crate::dto::payment_dto::*;
use crate::error::AppError;
use crate::handlers::AppState;
use crate::middleware::auth::AuthUser;
use crate::middleware::role_guard::require_role;
use crate::models::user::UserRole;
use crate::services::payment_service;

/// POST /api/payments/create-order
pub async fn create_order(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<CreateOrderRequest>,
) -> Result<Json<CreateOrderResponse>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let response =
        payment_service::create_razorpay_order(&state.db, &state.config, auth_user.id, body.course_id)
            .await?;

    Ok(Json(response))
}

/// POST /api/payments/verify
pub async fn verify_payment(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
    Json(body): Json<VerifyPaymentRequest>,
) -> Result<Json<VerifyPaymentResponse>, AppError> {
    require_role(&auth_user, UserRole::Student)?;

    let response = payment_service::verify_and_complete_payment(
        &state.db,
        &state.config,
        auth_user.id,
        &body.razorpay_payment_id,
        &body.razorpay_order_id,
        &body.razorpay_signature,
        body.course_id,
    )
    .await?;

    Ok(Json(response))
}

/// GET /api/payments/history
pub async fn payment_history(
    State(state): State<Arc<AppState>>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<Vec<PaymentHistoryItem>>, AppError> {
    let history = payment_service::get_payment_history(&state.db, auth_user.id).await?;
    Ok(Json(history))
}

/// POST /api/webhooks/razorpay
pub async fn razorpay_webhook(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    body: axum::body::Bytes,
) -> Result<Json<serde_json::Value>, AppError> {
    let signature = headers
        .get("x-razorpay-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or(AppError::Unauthorized)?;

    payment_service::handle_razorpay_webhook(&state.db, &state.config, signature, &body).await?;

    Ok(Json(serde_json::json!({ "status": "ok" })))
}
