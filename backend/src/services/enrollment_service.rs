use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::student_dto::*;
use crate::error::AppError;

/// Enroll a user in a free course.
pub async fn enroll_free_course(
    db: &PgPool,
    user_id: Uuid,
    course_id: Uuid,
) -> Result<(), AppError> {
    // Verify course is free and published
    let course: Option<(bool, String)> = sqlx::query_as(
        "SELECT is_free, status FROM courses WHERE id = $1",
    )
    .bind(course_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    match course {
        None => return Err(AppError::NotFound("Course not found".to_string())),
        Some((is_free, status)) => {
            if status != "published" {
                return Err(AppError::BadRequest("Course is not published".to_string()));
            }
            if !is_free {
                return Err(AppError::BadRequest(
                    "This is a paid course. Please purchase it.".to_string(),
                ));
            }
        }
    }

    // Check if already enrolled
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    if exists.0 {
        return Err(AppError::Conflict("Already enrolled in this course".to_string()));
    }

    sqlx::query("INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)")
        .bind(user_id)
        .bind(course_id)
        .execute(db)
        .await
        .map_err(AppError::Sqlx)?;

    // Update enrollment count
    sqlx::query("UPDATE courses SET total_enrollments = total_enrollments + 1 WHERE id = $1")
        .bind(course_id)
        .execute(db)
        .await
        .map_err(AppError::Sqlx)?;

    Ok(())
}

/// Create enrollment after payment (paid course).
pub async fn enroll_after_payment(
    db: &PgPool,
    user_id: Uuid,
    course_id: Uuid,
) -> Result<(), AppError> {
    // Idempotent: skip if already enrolled
    let exists: (bool,) = sqlx::query_as(
        "SELECT EXISTS(SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    if !exists.0 {
        sqlx::query("INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)")
            .bind(user_id)
            .bind(course_id)
            .execute(db)
            .await
            .map_err(AppError::Sqlx)?;

        sqlx::query("UPDATE courses SET total_enrollments = total_enrollments + 1 WHERE id = $1")
            .bind(course_id)
            .execute(db)
            .await
            .map_err(AppError::Sqlx)?;
    }

    Ok(())
}

/// List enrolled courses for a student.
pub async fn list_enrollments(
    db: &PgPool,
    user_id: Uuid,
) -> Result<Vec<EnrolledCourse>, AppError> {
    let rows = sqlx::query_as::<_, EnrolledCourseRow>(
        r#"
        SELECT e.id as enrollment_id, e.course_id, c.title, c.slug, c.thumbnail_url,
               u.full_name as instructor_name, e.progress_pct, e.enrolled_at,
               c.total_lectures,
               (SELECT COUNT(*) FROM progress p WHERE p.user_id = $1 AND p.course_id = e.course_id AND p.is_completed = true) as completed_lectures
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        JOIN users u ON u.id = c.instructor_id
        WHERE e.user_id = $1
        ORDER BY e.enrolled_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

#[derive(sqlx::FromRow)]
struct EnrolledCourseRow {
    enrollment_id: Uuid,
    course_id: Uuid,
    title: String,
    slug: String,
    thumbnail_url: Option<String>,
    instructor_name: String,
    progress_pct: i32,
    enrolled_at: chrono::DateTime<chrono::Utc>,
    total_lectures: i32,
    completed_lectures: i64,
}

impl From<EnrolledCourseRow> for EnrolledCourse {
    fn from(r: EnrolledCourseRow) -> Self {
        Self {
            enrollment_id: r.enrollment_id,
            course_id: r.course_id,
            title: r.title,
            slug: r.slug,
            thumbnail_url: r.thumbnail_url,
            instructor_name: r.instructor_name,
            progress_pct: r.progress_pct,
            enrolled_at: r.enrolled_at,
            total_lectures: r.total_lectures,
            completed_lectures: r.completed_lectures,
        }
    }
}

/// Get detailed progress for a course.
pub async fn get_course_progress(
    db: &PgPool,
    user_id: Uuid,
    course_id: Uuid,
) -> Result<CourseProgress, AppError> {
    // Verify enrollment
    let enrollment: Option<(i32,)> = sqlx::query_as(
        "SELECT progress_pct FROM enrollments WHERE user_id = $1 AND course_id = $2",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?;

    let progress_pct = enrollment
        .ok_or_else(|| AppError::NotFound("Not enrolled in this course".to_string()))?
        .0;

    let total_lectures: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM lectures WHERE course_id = $1",
    )
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let completed_lectures: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM progress WHERE user_id = $1 AND course_id = $2 AND is_completed = true",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let lectures = sqlx::query_as::<_, LectureProgressRow>(
        r#"
        SELECT l.id as lecture_id, l.title,
               COALESCE(p.watched_seconds, 0) as watched_seconds,
               COALESCE(p.is_completed, false) as is_completed,
               p.last_watched_at
        FROM lectures l
        LEFT JOIN progress p ON p.lecture_id = l.id AND p.user_id = $1
        WHERE l.course_id = $2
        ORDER BY l.sort_order
        "#,
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(CourseProgress {
        course_id,
        progress_pct,
        total_lectures: total_lectures.0 as i32,
        completed_lectures: completed_lectures.0,
        lectures: lectures.into_iter().map(|r| r.into()).collect(),
    })
}

#[derive(sqlx::FromRow)]
struct LectureProgressRow {
    lecture_id: Uuid,
    title: String,
    watched_seconds: i32,
    is_completed: bool,
    last_watched_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<LectureProgressRow> for LectureProgress {
    fn from(r: LectureProgressRow) -> Self {
        Self {
            lecture_id: r.lecture_id,
            title: r.title,
            watched_seconds: r.watched_seconds,
            is_completed: r.is_completed,
            last_watched_at: r.last_watched_at,
        }
    }
}

/// Update lecture progress (upsert).
pub async fn update_progress(
    db: &PgPool,
    user_id: Uuid,
    lecture_id: Uuid,
    course_id: Uuid,
    watched_seconds: i32,
    is_completed: bool,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO progress (user_id, lecture_id, course_id, watched_seconds, is_completed, last_watched_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, lecture_id)
        DO UPDATE SET watched_seconds = GREATEST(progress.watched_seconds, $4),
                      is_completed = $5 OR progress.is_completed,
                      last_watched_at = NOW()
        "#,
    )
    .bind(user_id)
    .bind(lecture_id)
    .bind(course_id)
    .bind(watched_seconds)
    .bind(is_completed)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    // Recalculate enrollment progress
    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM lectures WHERE course_id = $1",
    )
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let completed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM progress WHERE user_id = $1 AND course_id = $2 AND is_completed = true",
    )
    .bind(user_id)
    .bind(course_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let pct = if total.0 > 0 {
        ((completed.0 as f64 / total.0 as f64) * 100.0) as i32
    } else {
        0
    };

    let completed_at = if pct >= 100 {
        Some(chrono::Utc::now())
    } else {
        None
    };

    sqlx::query(
        "UPDATE enrollments SET progress_pct = $3, completed_at = COALESCE($4, completed_at) WHERE user_id = $1 AND course_id = $2",
    )
    .bind(user_id)
    .bind(course_id)
    .bind(pct)
    .bind(completed_at)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(())
}

/// Student dashboard summary.
pub async fn get_student_dashboard(
    db: &PgPool,
    user_id: Uuid,
) -> Result<StudentDashboard, AppError> {
    let total_enrolled: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM enrollments WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let total_completed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM enrollments WHERE user_id = $1 AND completed_at IS NOT NULL",
    )
    .bind(user_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let total_bookmarks: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM bookmarks WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let recent = list_enrollments(db, user_id).await?;
    let recent_courses: Vec<EnrolledCourse> = recent.into_iter().take(5).collect();

    Ok(StudentDashboard {
        total_enrolled: total_enrolled.0,
        total_completed: total_completed.0,
        total_in_progress: total_enrolled.0 - total_completed.0,
        recent_courses,
        total_bookmarks: total_bookmarks.0,
    })
}
