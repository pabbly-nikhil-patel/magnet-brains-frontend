use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::admin_dto::*;
use crate::error::AppError;

/// Get platform-wide analytics for admin dashboard.
pub async fn get_platform_analytics(db: &PgPool) -> Result<PlatformAnalytics, AppError> {
    let total_users: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(db)
        .await
        .map_err(AppError::Sqlx)?;

    let total_students: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'student'")
            .fetch_one(db)
            .await
            .map_err(AppError::Sqlx)?;

    let total_instructors: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'instructor'")
            .fetch_one(db)
            .await
            .map_err(AppError::Sqlx)?;

    let total_courses: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM courses")
        .fetch_one(db)
        .await
        .map_err(AppError::Sqlx)?;

    let published_courses: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM courses WHERE status = 'published'")
            .fetch_one(db)
            .await
            .map_err(AppError::Sqlx)?;

    let total_enrollments: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM enrollments")
        .fetch_one(db)
        .await
        .map_err(AppError::Sqlx)?;

    let total_revenue: Option<(Option<sqlx::types::BigDecimal>,)> = sqlx::query_as(
        "SELECT SUM(final_amount) FROM orders WHERE payment_status = 'completed'",
    )
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let platform_earnings: Option<(Option<sqlx::types::BigDecimal>,)> = sqlx::query_as(
        "SELECT SUM(platform_amount) FROM instructor_earnings",
    )
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let to_f64 = |v: Option<(Option<sqlx::types::BigDecimal>,)>| -> f64 {
        v.and_then(|x| x.0)
            .map(|x| x.to_string().parse::<f64>().unwrap_or(0.0))
            .unwrap_or(0.0)
    };

    // Top courses by enrollment
    let top_courses = sqlx::query_as::<_, TopCourseRow>(
        r#"
        SELECT c.id, c.title, u.full_name as instructor_name, c.total_enrollments,
               COALESCE(SUM(ie.instructor_amount + ie.platform_amount), 0) as revenue
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        LEFT JOIN instructor_earnings ie ON ie.course_id = c.id
        WHERE c.status = 'published'
        GROUP BY c.id, c.title, u.full_name, c.total_enrollments
        ORDER BY c.total_enrollments DESC
        LIMIT 10
        "#,
    )
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(PlatformAnalytics {
        total_users: total_users.0,
        total_students: total_students.0,
        total_instructors: total_instructors.0,
        total_courses: total_courses.0,
        published_courses: published_courses.0,
        total_enrollments: total_enrollments.0,
        total_revenue: to_f64(total_revenue),
        platform_earnings: to_f64(platform_earnings),
        top_courses: top_courses.into_iter().map(|r| r.into()).collect(),
    })
}

#[derive(sqlx::FromRow)]
struct TopCourseRow {
    id: Uuid,
    title: String,
    instructor_name: String,
    total_enrollments: i32,
    revenue: sqlx::types::BigDecimal,
}

impl From<TopCourseRow> for TopCourseItem {
    fn from(r: TopCourseRow) -> Self {
        Self {
            id: r.id,
            title: r.title,
            instructor_name: r.instructor_name,
            total_enrollments: r.total_enrollments,
            revenue: r.revenue.to_string().parse().unwrap_or(0.0),
        }
    }
}
