use bigdecimal::FromPrimitive;
use sqlx::PgPool;
use uuid::Uuid;

use crate::dto::course_dto::*;
use crate::error::AppError;
use crate::models::chapter::Chapter;
use crate::models::lecture::Lecture;
use crate::utils::pagination::PaginatedResponse;
use crate::utils::validation::slugify;

/// List published courses with filters and pagination.
pub async fn list_courses(
    db: &PgPool,
    board: Option<&str>,
    class: Option<&str>,
    stream: Option<&str>,
    subject: Option<&str>,
    is_free: Option<bool>,
    language: Option<&str>,
    level: Option<&str>,
    page: i64,
    limit: i64,
) -> Result<PaginatedResponse<CourseListItem>, AppError> {
    let offset = (page - 1) * limit;

    // Use optional WHERE clauses for filtering
    let rows = sqlx::query_as::<_, CourseListItemRow>(
        r#"
        SELECT c.id, c.title, c.slug, c.short_desc, c.thumbnail_url,
               u.full_name as instructor_name, c.instructor_photo_url,
               c.is_free, c.price, c.discount_pct, c.language, c.level,
               c.total_lectures, c.total_duration, c.total_enrollments
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        LEFT JOIN categories b ON b.id = c.board_id
        LEFT JOIN categories cl ON cl.id = c.class_id
        LEFT JOIN categories s ON s.id = c.stream_id
        LEFT JOIN categories sub ON sub.id = c.subject_id
        WHERE c.status = 'published'
          AND ($1::text IS NULL OR b.slug = $1)
          AND ($2::text IS NULL OR cl.slug = $2)
          AND ($3::text IS NULL OR s.slug = $3)
          AND ($4::text IS NULL OR sub.slug = $4)
          AND ($5::bool IS NULL OR c.is_free = $5)
          AND ($6::text IS NULL OR c.language = $6)
          AND ($7::text IS NULL OR c.level = $7)
        ORDER BY c.created_at DESC
        LIMIT $8 OFFSET $9
        "#,
    )
    .bind(board)
    .bind(class)
    .bind(stream)
    .bind(subject)
    .bind(is_free)
    .bind(language)
    .bind(level)
    .bind(limit)
    .bind(offset)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    let total: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM courses c
        LEFT JOIN categories b ON b.id = c.board_id
        LEFT JOIN categories cl ON cl.id = c.class_id
        LEFT JOIN categories s ON s.id = c.stream_id
        LEFT JOIN categories sub ON sub.id = c.subject_id
        WHERE c.status = 'published'
          AND ($1::text IS NULL OR b.slug = $1)
          AND ($2::text IS NULL OR cl.slug = $2)
          AND ($3::text IS NULL OR s.slug = $3)
          AND ($4::text IS NULL OR sub.slug = $4)
          AND ($5::bool IS NULL OR c.is_free = $5)
          AND ($6::text IS NULL OR c.language = $6)
          AND ($7::text IS NULL OR c.level = $7)
        "#,
    )
    .bind(board)
    .bind(class)
    .bind(stream)
    .bind(subject)
    .bind(is_free)
    .bind(language)
    .bind(level)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let items: Vec<CourseListItem> = rows.into_iter().map(|r| r.into()).collect();
    Ok(PaginatedResponse::new(items, total.0, page, limit))
}

#[derive(sqlx::FromRow)]
struct CourseListItemRow {
    id: Uuid,
    title: String,
    slug: String,
    short_desc: Option<String>,
    thumbnail_url: Option<String>,
    instructor_name: String,
    instructor_photo_url: Option<String>,
    is_free: bool,
    price: Option<sqlx::types::BigDecimal>,
    discount_pct: Option<i32>,
    language: String,
    level: Option<String>,
    total_lectures: i32,
    total_duration: i32,
    total_enrollments: i32,
}

impl From<CourseListItemRow> for CourseListItem {
    fn from(r: CourseListItemRow) -> Self {
        Self {
            id: r.id,
            title: r.title,
            slug: r.slug,
            short_desc: r.short_desc,
            thumbnail_url: r.thumbnail_url,
            instructor_name: r.instructor_name,
            instructor_photo_url: r.instructor_photo_url,
            is_free: r.is_free,
            price: r.price,
            discount_pct: r.discount_pct,
            language: r.language,
            level: r.level,
            total_lectures: r.total_lectures,
            total_duration: r.total_duration,
            total_enrollments: r.total_enrollments,
        }
    }
}

/// Get full course detail by slug (public view).
pub async fn get_course_by_slug(db: &PgPool, slug: &str) -> Result<CourseDetail, AppError> {
    let row = sqlx::query_as::<_, CourseDetailRow>(
        r#"
        SELECT c.*,
               u.full_name as instructor_name, u.bio as instructor_bio,
               b.name as board_name, cl.name as class_name,
               s.name as stream_name, sub.name as subject_name
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        LEFT JOIN categories b ON b.id = c.board_id
        LEFT JOIN categories cl ON cl.id = c.class_id
        LEFT JOIN categories s ON s.id = c.stream_id
        LEFT JOIN categories sub ON sub.id = c.subject_id
        WHERE c.slug = $1 AND c.status = 'published'
        "#,
    )
    .bind(slug)
    .fetch_optional(db)
    .await
    .map_err(AppError::Sqlx)?
    .ok_or_else(|| AppError::NotFound("Course not found".to_string()))?;

    // Fetch chapters and lectures
    let chapters = sqlx::query_as::<_, Chapter>(
        "SELECT * FROM chapters WHERE course_id = $1 ORDER BY sort_order",
    )
    .bind(row.id)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    let lectures = sqlx::query_as::<_, Lecture>(
        "SELECT * FROM lectures WHERE course_id = $1 ORDER BY sort_order",
    )
    .bind(row.id)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    let chapters_with_lectures: Vec<ChapterWithLectures> = chapters
        .into_iter()
        .map(|ch| {
            let ch_lectures: Vec<LectureItem> = lectures
                .iter()
                .filter(|l| l.chapter_id == ch.id)
                .map(|l| LectureItem {
                    id: l.id,
                    title: l.title.clone(),
                    description: l.description.clone(),
                    sort_order: l.sort_order,
                    duration: l.duration,
                    is_preview: l.is_preview,
                    is_published: l.is_published,
                })
                .collect();
            ChapterWithLectures {
                id: ch.id,
                title: ch.title,
                sort_order: ch.sort_order,
                lectures: ch_lectures,
            }
        })
        .collect();

    Ok(CourseDetail {
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        short_desc: row.short_desc,
        thumbnail_url: row.thumbnail_url,
        instructor_id: row.instructor_id,
        instructor_name: row.instructor_name,
        instructor_photo_url: row.instructor_photo_url,
        instructor_bio: row.instructor_bio,
        board_name: row.board_name,
        class_name: row.class_name,
        stream_name: row.stream_name,
        subject_name: row.subject_name,
        is_free: row.is_free,
        price: row.price,
        discount_pct: row.discount_pct,
        language: row.language,
        level: row.level,
        syllabus_points: row.syllabus_points,
        tags: row.tags,
        is_full_course: row.is_full_course,
        total_chapters: row.total_chapters,
        total_lectures: row.total_lectures,
        total_duration: row.total_duration,
        total_enrollments: row.total_enrollments,
        published_at: row.published_at,
        chapters: chapters_with_lectures,
    })
}

#[derive(sqlx::FromRow)]
struct CourseDetailRow {
    id: Uuid,
    instructor_id: Uuid,
    title: String,
    slug: String,
    description: Option<String>,
    short_desc: Option<String>,
    thumbnail_url: Option<String>,
    instructor_photo_url: Option<String>,
    is_free: bool,
    price: Option<sqlx::types::BigDecimal>,
    discount_pct: Option<i32>,
    language: String,
    level: Option<String>,
    syllabus_points: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    is_full_course: bool,
    total_chapters: i32,
    total_lectures: i32,
    total_duration: i32,
    total_enrollments: i32,
    published_at: Option<chrono::DateTime<chrono::Utc>>,
    instructor_name: String,
    instructor_bio: Option<String>,
    board_name: Option<String>,
    class_name: Option<String>,
    stream_name: Option<String>,
    subject_name: Option<String>,
    // Unused columns from courses.* that we need to accept
    board_id: Option<Uuid>,
    class_id: Option<Uuid>,
    stream_id: Option<Uuid>,
    subject_id: Option<Uuid>,
    status: String,
    rejection_reason: Option<String>,
    created_at: chrono::DateTime<chrono::Utc>,
    updated_at: chrono::DateTime<chrono::Utc>,
}

/// Full-text search across courses.
pub async fn search_courses(
    db: &PgPool,
    query: &str,
    page: i64,
    limit: i64,
) -> Result<PaginatedResponse<CourseListItem>, AppError> {
    let offset = (page - 1) * limit;
    let search_query = query.split_whitespace().collect::<Vec<_>>().join(" & ");

    let rows = sqlx::query_as::<_, CourseListItemRow>(
        r#"
        SELECT c.id, c.title, c.slug, c.short_desc, c.thumbnail_url,
               u.full_name as instructor_name, c.instructor_photo_url,
               c.is_free, c.price, c.discount_pct, c.language, c.level,
               c.total_lectures, c.total_duration, c.total_enrollments
        FROM courses c
        JOIN users u ON u.id = c.instructor_id
        WHERE c.status = 'published'
          AND to_tsvector('english', c.title || ' ' || COALESCE(c.description, ''))
              @@ to_tsquery('english', $1)
        ORDER BY ts_rank(
            to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')),
            to_tsquery('english', $1)
        ) DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_query)
    .bind(limit)
    .bind(offset)
    .fetch_all(db)
    .await
    .map_err(AppError::Sqlx)?;

    let total: (i64,) = sqlx::query_as(
        r#"
        SELECT COUNT(*)
        FROM courses c
        WHERE c.status = 'published'
          AND to_tsvector('english', c.title || ' ' || COALESCE(c.description, ''))
              @@ to_tsquery('english', $1)
        "#,
    )
    .bind(&search_query)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    let items: Vec<CourseListItem> = rows.into_iter().map(|r| r.into()).collect();
    Ok(PaginatedResponse::new(items, total.0, page, limit))
}

/// Create a new course (instructor).
pub async fn create_course(
    db: &PgPool,
    instructor_id: Uuid,
    title: &str,
    description: Option<&str>,
    short_desc: Option<&str>,
    board_id: Option<Uuid>,
    class_id: Option<Uuid>,
    stream_id: Option<Uuid>,
    subject_id: Option<Uuid>,
    is_free: bool,
    price: Option<f64>,
    discount_pct: Option<i32>,
    language: &str,
    level: Option<&str>,
    syllabus_points: Option<&[String]>,
    tags: Option<&[String]>,
    is_full_course: bool,
) -> Result<crate::models::course::Course, AppError> {
    let slug = slugify(title);

    let course = sqlx::query_as::<_, crate::models::course::Course>(
        r#"
        INSERT INTO courses (
            instructor_id, title, slug, description, short_desc,
            board_id, class_id, stream_id, subject_id,
            is_free, price, discount_pct, language, level,
            syllabus_points, tags, is_full_course
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
        "#,
    )
    .bind(instructor_id)
    .bind(title)
    .bind(&slug)
    .bind(description)
    .bind(short_desc)
    .bind(board_id)
    .bind(class_id)
    .bind(stream_id)
    .bind(subject_id)
    .bind(is_free)
    .bind(price.and_then(|p| sqlx::types::BigDecimal::from_f64(p)))
    .bind(discount_pct)
    .bind(language)
    .bind(level)
    .bind(syllabus_points)
    .bind(tags)
    .bind(is_full_course)
    .fetch_one(db)
    .await
    .map_err(AppError::Sqlx)?;

    Ok(course)
}

/// Submit course for review.
pub async fn submit_for_review(
    db: &PgPool,
    course_id: Uuid,
    instructor_id: Uuid,
) -> Result<(), AppError> {
    let result = sqlx::query(
        "UPDATE courses SET status = 'pending_review', updated_at = NOW() WHERE id = $1 AND instructor_id = $2 AND status = 'draft'",
    )
    .bind(course_id)
    .bind(instructor_id)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;

    if result.rows_affected() == 0 {
        return Err(AppError::BadRequest(
            "Course not found or not in draft status".to_string(),
        ));
    }
    Ok(())
}

/// Recalculate denormalized counts for a course.
pub async fn recalculate_course_counts(db: &PgPool, course_id: Uuid) -> Result<(), AppError> {
    sqlx::query(
        r#"
        UPDATE courses SET
            total_chapters = (SELECT COUNT(*) FROM chapters WHERE course_id = $1),
            total_lectures = (SELECT COUNT(*) FROM lectures WHERE course_id = $1),
            total_duration = COALESCE((SELECT SUM(duration) FROM lectures WHERE course_id = $1), 0),
            updated_at = NOW()
        WHERE id = $1
        "#,
    )
    .bind(course_id)
    .execute(db)
    .await
    .map_err(AppError::Sqlx)?;
    Ok(())
}
