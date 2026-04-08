use bigdecimal::FromPrimitive;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::Config;
use crate::dto::payment_dto::*;
use crate::error::AppError;
use crate::services::{enrollment_service, revenue_service};

type HmacSha256 = Hmac<Sha256>;

/// Create a Razorpay order for a paid course.
pub async fn create_razorpay_order(
    db: &PgPool,
    config: &Config,
    user_id: Uuid,
    course_id: Uuid,
) -> Result<CreateOrderResponse, AppError> {
    // Get course details
    let course: Option<(String, bool, Option<sqlx::types::BigDecimal>, Option<i32>)> =
        sqlx::query_as(
            "SELECT title, is_free, price, discount_pct FROM courses WHERE id = $1 AND status = 'published'",
        )
        .bind(course_id)
        .fetch_optional(db)
        .await
        .map_err(AppError::Sqlx)?;

    let (title, is_free, price, discount_pct) = course
        .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    if is_free {
        return Err(AppError::BadRequest("This is a free course".to_string()));
    }

    // Check if already enrolled
    let enrolled: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    if enrolled.0 {
        return Err(AppError::Conflict("Already enrolled".to_string()));
    }

    let price_f64: f64 = price
        .map(|p| p.to_string().parse::<f64>().unwrap_or(0.0))
        .unwrap_or(0.0);
    let discount = discount_pct.unwrap_or(0) as f64 / 100.0;
    let final_amount = (price_f64 * (1.0 - discount) * 100.0) as i64; // Amount in paise

    // Call Razorpay API to create order
    let client = reqwest::Client::new();
    let razorpay_response = client
        .post("https://api.razorpay.com/v1/orders")
        .basic_auth(&config.razorpay_key_id, Some(&config.razorpay_key_secret))
        .json(&serde_json::json!({
            "amount": final_amount,
            "currency": "INR",
            "receipt": format!("rcpt_{}_{}", user_id, course_id),
        }))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("Razorpay API error: {}", e)))?;

    if !razorpay_response.status().is_success() {
        let err_text = razorpay_response.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("Razorpay error: {}", err_text)));
    }

    let rz_body: serde_json::Value = razorpay_response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("Razorpay parse error: {}", e)))?;

    let order_id = rz_body["id"]
        .as_str()
        .ok_or_else(|| AppError::Internal("Missing Razorpay order ID".to_string()))?
        .to_string();

    Ok(CreateOrderResponse {
        order_id,
        amount: final_amount,
        currency: "INR".to_string(),
        razorpay_key: config.razorpay_key_id.clone(),
        course_title: title,
    })
}

/// Verify Razorpay payment signature and complete the purchase.
pub async fn verify_and_complete_payment(
    db: &PgPool,
    config: &Config,
    user_id: Uuid,
    payment_id: &str,
    order_id: &str,
    signature: &str,
    course_id: Uuid,
) -> Result<VerifyPaymentResponse, AppError> {
    // Verify signature
    let payload = format!("{}|{}", order_id, payment_id);
    let mut mac = HmacSha256::new_from_slice(config.razorpay_key_secret.as_bytes())
        .map_err(|e| AppError::Internal(format!("HMAC error: {}", e)))?;
    mac.update(payload.as_bytes());

    let expected_signature = hex::encode(mac.finalize().into_bytes());
    if expected_signature != signature {
        return Err(AppError::BadRequest("Invalid payment signature".to_string()));
    }

    // Get course price info
    let course: (Option<sqlx::types::BigDecimal>, Option<i32>) = sqlx::query_as(
        "SELECT price, discount_pct FROM courses WHERE id = $1",
    )
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let price_f64: f64 = course.0
        .map(|p| p.to_string().parse::<f64>().unwrap_or(0.0))
        .unwrap_or(0.0);
    let discount_pct = course.1.unwrap_or(0);
    let discount_amount = price_f64 * (discount_pct as f64 / 100.0);
    let final_amount = price_f64 - discount_amount;

    // Create order record
    let db_order = sqlx::query_as::<_, (Uuid,)>(
        r#"
        INSERT INTO orders (user_id, course_id, amount, discount_amount, final_amount, payment_provider, payment_id, payment_status)
        VALUES ($1, $2, $3, $4, $5, 'razorpay', $6, 'completed')
        RETURNING id
        "#,
    )
    .bind(user_id)
    .bind(course_id)
    .bind(sqlx::types::BigDecimal::from_f64(price_f64).unwrap_or_default())
    .bind(sqlx::types::BigDecimal::from_f64(discount_amount).unwrap_or_default())
    .bind(sqlx::types::BigDecimal::from_f64(final_amount).unwrap_or_default())
    .bind(payment_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    // Create enrollment
    enrollment_service::enroll_after_payment(db, user_id, course_id).await?;

    // Calculate earnings
    revenue_service::create_earning_record(db, db_order.0, course_id, final_amount).await?;

    Ok(VerifyPaymentResponse {
        success: true,
        order_id: db_order.0,
        message: "Payment verified and enrollment completed".to_string(),
    })
}

/// Get payment history for a user.
pub async fn get_payment_history(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Vec<PaymentHistoryItem>, AppError> {
    let rows = sqlx::query_as::<_, PaymentHistoryRow>(
        r#"
        SELECT o.id, o.course_id, c.title as course_title, c.slug as course_slug,
               o.amount, o.discount_amount, o.final_amount, o.currency,
               o.payment_status, o.created_at
        FROM orders o
        JOIN courses c ON c.id = o.course_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

#[derive(sqlx::FromRow)]
struct PaymentHistoryRow {
    id: Uuid,
    course_id: Uuid,
    course_title: String,
    course_slug: String,
    amount: sqlx::types::BigDecimal,
    discount_amount: Option<sqlx::types::BigDecimal>,
    final_amount: sqlx::types::BigDecimal,
    currency: String,
    payment_status: String,
    created_at: chrono::DateTime<chrono::Utc>,
}

impl From<PaymentHistoryRow> for PaymentHistoryItem {
    fn from(r: PaymentHistoryRow) -> Self {
        Self {
            id: r.id,
            course_id: r.course_id,
            course_title: r.course_title,
            course_slug: r.course_slug,
            amount: r.amount.to_string().parse().unwrap_or(0.0),
            discount_amount: r.discount_amount.map(|d| d.to_string().parse().unwrap_or(0.0)).unwrap_or(0.0),
            final_amount: r.final_amount.to_string().parse().unwrap_or(0.0),
            currency: r.currency,
            payment_status: r.payment_status,
            created_at: r.created_at,
        }
    }
}

/// Handle Razorpay webhook events (idempotent).
pub async fn handle_razorpay_webhook(
    db: &PgPool,
    config: &Config,
    signature: &str,
    body: &[u8],
) -> Result<(), AppError> {
    // Verify webhook signature
    let mut mac = HmacSha256::new_from_slice(config.razorpay_webhook_secret.as_bytes())
        .map_err(|e| AppError::Internal(format!("HMAC error: {}", e)))?;
    mac.update(body);
    let expected = hex::encode(mac.finalize().into_bytes());

    if expected != signature {
        return Err(AppError::Unauthorized);
    }

    let payload: serde_json::Value =
        serde_json::from_slice(body).map_err(|e| AppError::BadRequest(e.to_string()))?;

    let event = payload["event"].as_str().unwrap_or("");

    match event {
        "payment.captured" => {
            let payment_id = payload["payload"]["payment"]["entity"]["id"]
                .as_str()
                .unwrap_or("");
            // Mark order as completed if it was pending
            sqlx::query(
                "UPDATE orders SET payment_status = 'completed', updated_at = NOW() WHERE payment_id = $1 AND payment_status = 'pending'",
            )
            .bind(payment_id)
            .execute(db)
            .await
            .map_err(AppError::Sqlx)?;
        }
        "payment.failed" => {
            let payment_id = payload["payload"]["payment"]["entity"]["id"]
                .as_str()
                .unwrap_or("");
            sqlx::query(
                "UPDATE orders SET payment_status = 'failed', updated_at = NOW() WHERE payment_id = $1",
            )
            .bind(payment_id)
            .execute(db)
            .await
            .map_err(AppError::Sqlx)?;
        }
        "refund.created" => {
            let payment_id = payload["payload"]["refund"]["entity"]["payment_id"]
                .as_str()
                .unwrap_or("");
            sqlx::query(
                "UPDATE orders SET payment_status = 'refunded', updated_at = NOW() WHERE payment_id = $1",
            )
            .bind(payment_id)
            .execute(db)
            .await
            .map_err(AppError::Sqlx)?;
        }
        _ => {
            tracing::info!("Unhandled Razorpay webhook event: {}", event);
        }
    }

    Ok(())
}
