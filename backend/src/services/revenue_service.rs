use bigdecimal::FromPrimitive;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::AppError;

/// Get the platform commission percentage for an instructor.
/// Checks for instructor-specific override, falls back to default.
pub async fn get_platform_pct(db: &PgPool, instructor_id: Uuid) -> Result<i32, AppError> {
    // Check for override
    let override_pct: Option<(i32,)> = sqlx::query_as(
        "SELECT platform_pct FROM instructor_revenue_overrides WHERE instructor_id = $1",
    )
    .bind(instructor_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    if let Some((pct,)) = override_pct {
        return Ok(pct);
    }

    // Fallback to default
    let default: Option<(i32,)> = sqlx::query_as(
        "SELECT default_platform_pct FROM revenue_settings ORDER BY updated_at DESC LIMIT 1",
    )
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(default.map(|(pct,)| pct).unwrap_or(30))
}

/// Create an earning record after a successful payment.
pub async fn create_earning_record(
    db: &PgPool,
    order_id: Uuid,
    course_id: Uuid,
    final_amount: f64,
) -> Result<(), AppError> {
    // Get instructor for this course
    let instructor_id: (Uuid,) = sqlx::query_as(
        "SELECT instructor_id FROM courses WHERE id = $1",
    )
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let platform_pct = get_platform_pct(db, instructor_id.0).await?;
    let platform_amount = final_amount * (platform_pct as f64 / 100.0);
    let instructor_amount = final_amount - platform_amount;

    sqlx::query(
        r#"
        INSERT INTO instructor_earnings (
            instructor_id, order_id, course_id, order_amount,
            platform_pct, platform_amount, instructor_amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        "#,
    )
    .bind(instructor_id.0)
    .bind(order_id)
    .bind(course_id)
    .bind(sqlx::types::BigDecimal::from_f64(final_amount).unwrap_or_default())
    .bind(platform_pct)
    .bind(sqlx::types::BigDecimal::from_f64(platform_amount).unwrap_or_default())
    .bind(sqlx::types::BigDecimal::from_f64(instructor_amount).unwrap_or_default())
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(())
}

/// Get earnings summary for an instructor.
pub async fn get_instructor_earnings(
    db: &PgPool,
    instructor_id: Uuid,
) -> Result<(f64, f64, f64), AppError> {
    let total: Option<(Option<sqlx::types::BigDecimal>,)> = sqlx::query_as(
        "SELECT SUM(instructor_amount) FROM instructor_earnings WHERE instructor_id = $1",
    )
    .bind(instructor_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let pending: Option<(Option<sqlx::types::BigDecimal>,)> = sqlx::query_as(
        "SELECT SUM(instructor_amount) FROM instructor_earnings WHERE instructor_id = $1 AND payout_status = 'pending'",
    )
    .bind(instructor_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let paid: Option<(Option<sqlx::types::BigDecimal>,)> = sqlx::query_as(
        "SELECT SUM(instructor_amount) FROM instructor_earnings WHERE instructor_id = $1 AND payout_status = 'paid'",
    )
    .bind(instructor_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let to_f64 = |v: Option<(Option<sqlx::types::BigDecimal>,)>| -> f64 {
        v.and_then(|x| x.0)
            .map(|x| x.to_string().parse::<f64>().unwrap_or(0.0))
            .unwrap_or(0.0)
    };

    Ok((to_f64(total), to_f64(pending), to_f64(paid)))
}

/// Update revenue settings (admin).
pub async fn update_default_platform_pct(
    db: &PgPool,
    admin_id: Uuid,
    pct: i32,
) -> Result<(), AppError> {
    if !(1..=100).contains(&pct) {
        return Err(AppError::BadRequest(
            "Platform percentage must be between 1 and 100".to_string(),
        ));
    }

    sqlx::query(
        r#"
        INSERT INTO revenue_settings (default_platform_pct, updated_by) VALUES ($1, $2)
        "#,
    )
    .bind(pct)
    .bind(admin_id)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(())
}

/// Set instructor-specific revenue override (admin).
pub async fn set_instructor_override(
    db: &PgPool,
    admin_id: Uuid,
    instructor_id: Uuid,
    pct: i32,
) -> Result<(), AppError> {
    if !(1..=100).contains(&pct) {
        return Err(AppError::BadRequest(
            "Platform percentage must be between 1 and 100".to_string(),
        ));
    }

    sqlx::query(
        r#"
        INSERT INTO instructor_revenue_overrides (instructor_id, platform_pct, updated_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (instructor_id)
        DO UPDATE SET platform_pct = $2, updated_by = $3, updated_at = NOW()
        "#,
    )
    .bind(instructor_id)
    .bind(pct)
    .bind(admin_id)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(())
}

/// Process payouts (mark as paid) — admin action.
pub async fn process_payouts(
    db: &PgPool,
    earning_ids: &[Uuid],
    payout_reference: &str,
) -> Result<u64, AppError> {
    let result = sqlx::query(
        r#"
        UPDATE instructor_earnings
        SET payout_status = 'paid', payout_date = NOW(), payout_reference = $2
        WHERE id = ANY($1) AND payout_status = 'pending'
        "#,
    )
    .bind(earning_ids)
    .bind(payout_reference)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(result.rows_affected())
}
