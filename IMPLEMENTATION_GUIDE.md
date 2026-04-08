# Magnet Brains E-Learning Platform - Implementation Guide

> Step-by-step guide to build the entire application from scratch.
> Follow each step in order. Each step builds on the previous one.

---

## Prerequisites & Local Setup

### Step 1: Install Required Tools

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup default stable  # Ensure Rust 1.77+

# Node.js 20+ (use nvm or download from nodejs.org)
nvm install 20
nvm use 20

# PostgreSQL 16 & Redis 7 (via Docker)
docker --version  # Ensure Docker is installed

# SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres
```

### Step 2: Initialize the Project Repository

```bash
mkdir magnetbrains && cd magnetbrains
git init

# Create top-level structure
mkdir backend frontend
touch docker-compose.yml .gitignore
```

**.gitignore:**
```
# Rust
backend/target/
backend/.env

# Node
frontend/node_modules/
frontend/.env
frontend/dist/

# Keys
backend/keys/

# IDE
.vscode/
.idea/
*.swp
```

### Step 3: Docker Compose for Local Infrastructure

Create `docker-compose.yml` at the project root:

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: magnetbrains
      POSTGRES_USER: mb
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

```bash
docker-compose up -d db redis
```

### Step 4: Generate JWT Keys

```bash
mkdir -p backend/keys
openssl genpkey -algorithm RSA -out backend/keys/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in backend/keys/private.pem -out backend/keys/public.pem
```

---

## PHASE 1: Backend Foundation

### Step 5: Initialize Rust Backend

```bash
cd backend
cargo init --name magnetbrains-api
```

### Step 6: Add Dependencies to `Cargo.toml`

```toml
[package]
name = "magnetbrains-api"
version = "0.1.0"
edition = "2021"

[dependencies]
# Web framework
axum = { version = "0.7", features = ["macros"] }
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "compression-full", "trace"] }

# Database
sqlx = { version = "0.7", features = ["runtime-tokio", "tls-rustls", "postgres", "uuid", "chrono", "json"] }

# Redis
redis = { version = "0.25", features = ["tokio-comp", "connection-manager"] }

# Auth
jsonwebtoken = "9"
argon2 = "0.5"

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"

# Utils
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
dotenvy = "0.15"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
thiserror = "1"
validator = { version = "0.18", features = ["derive"] }

# AWS
aws-config = "1"
aws-sdk-s3 = "1"
aws-sdk-ses = "1"
```

### Step 7: Create Environment Configuration

Create `backend/.env.example` and copy to `backend/.env`:

```bash
HOST=0.0.0.0
PORT=8080
RUST_LOG=info

DATABASE_URL=postgres://mb:password@localhost:5432/magnetbrains
DATABASE_MAX_CONNECTIONS=20

REDIS_URL=redis://localhost:6379

JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY=900
JWT_REFRESH_EXPIRY=604800

AWS_REGION=ap-south-1
S3_BUCKET_NAME=magnetbrains-media
CLOUDFRONT_DOMAIN=d1234567.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY_PATH=./keys/cloudfront-private.pem

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

SES_FROM_EMAIL=noreply@magnetbrains.com
FRONTEND_URL=http://localhost:5173
```

```bash
cp .env.example .env
# Edit .env with your local values
```

### Step 8: Create Backend Source File Structure

```bash
cd backend/src
mkdir -p db models handlers services middleware utils dto
touch config.rs app.rs error.rs
touch db/mod.rs db/pool.rs
touch models/mod.rs models/user.rs models/course.rs models/chapter.rs models/lecture.rs models/enrollment.rs models/progress.rs models/order.rs models/earning.rs models/category.rs models/bookmark.rs models/homepage.rs
touch handlers/mod.rs handlers/auth.rs handlers/courses.rs handlers/student.rs handlers/instructor.rs handlers/admin.rs handlers/payments.rs handlers/upload.rs handlers/homepage.rs
touch services/mod.rs services/auth_service.rs services/course_service.rs services/enrollment_service.rs services/payment_service.rs services/revenue_service.rs services/upload_service.rs services/email_service.rs services/analytics_service.rs
touch middleware/mod.rs middleware/auth.rs middleware/role_guard.rs middleware/rate_limit.rs
touch utils/mod.rs utils/jwt.rs utils/password.rs utils/s3.rs utils/cloudfront.rs utils/pagination.rs utils/validation.rs
touch dto/mod.rs dto/auth_dto.rs dto/course_dto.rs dto/student_dto.rs dto/instructor_dto.rs dto/admin_dto.rs dto/payment_dto.rs
```

### Step 9: Implement `config.rs` - Environment Config

```rust
// src/config.rs
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub database_max_connections: u32,
    pub redis_url: String,
    pub jwt_private_key_path: String,
    pub jwt_public_key_path: String,
    pub jwt_access_expiry: i64,
    pub jwt_refresh_expiry: i64,
    pub aws_region: String,
    pub s3_bucket_name: String,
    pub cloudfront_domain: String,
    pub cloudfront_key_pair_id: String,
    pub cloudfront_private_key_path: String,
    pub razorpay_key_id: String,
    pub razorpay_key_secret: String,
    pub razorpay_webhook_secret: String,
    pub ses_from_email: String,
    pub frontend_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            port: env::var("PORT").unwrap_or_else(|_| "8080".to_string()).parse().expect("PORT must be a number"),
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL required"),
            database_max_connections: env::var("DATABASE_MAX_CONNECTIONS").unwrap_or_else(|_| "20".to_string()).parse().unwrap(),
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            jwt_private_key_path: env::var("JWT_PRIVATE_KEY_PATH").expect("JWT_PRIVATE_KEY_PATH required"),
            jwt_public_key_path: env::var("JWT_PUBLIC_KEY_PATH").expect("JWT_PUBLIC_KEY_PATH required"),
            jwt_access_expiry: env::var("JWT_ACCESS_EXPIRY").unwrap_or_else(|_| "900".to_string()).parse().unwrap(),
            jwt_refresh_expiry: env::var("JWT_REFRESH_EXPIRY").unwrap_or_else(|_| "604800".to_string()).parse().unwrap(),
            aws_region: env::var("AWS_REGION").unwrap_or_else(|_| "ap-south-1".to_string()),
            s3_bucket_name: env::var("S3_BUCKET_NAME").unwrap_or_default(),
            cloudfront_domain: env::var("CLOUDFRONT_DOMAIN").unwrap_or_default(),
            cloudfront_key_pair_id: env::var("CLOUDFRONT_KEY_PAIR_ID").unwrap_or_default(),
            cloudfront_private_key_path: env::var("CLOUDFRONT_PRIVATE_KEY_PATH").unwrap_or_default(),
            razorpay_key_id: env::var("RAZORPAY_KEY_ID").unwrap_or_default(),
            razorpay_key_secret: env::var("RAZORPAY_KEY_SECRET").unwrap_or_default(),
            razorpay_webhook_secret: env::var("RAZORPAY_WEBHOOK_SECRET").unwrap_or_default(),
            ses_from_email: env::var("SES_FROM_EMAIL").unwrap_or_default(),
            frontend_url: env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:5173".to_string()),
        }
    }
}
```

### Step 10: Implement `error.rs` - Unified Error Type

```rust
// src/error.rs
use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Conflict: {0}")]
    Conflict(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    Validation(#[from] validator::ValidationErrors),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, msg.clone()),
            AppError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.clone()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, "Forbidden".to_string()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, msg.clone()),
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, msg.clone()),
            AppError::Sqlx(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
            AppError::Validation(e) => (StatusCode::BAD_REQUEST, e.to_string()),
        };

        let body = Json(json!({ "error": message }));
        (status, body).into_response()
    }
}
```

### Step 11: Implement `db/pool.rs` - Database Connection Pool

```rust
// src/db/pool.rs
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn create_pool(database_url: &str, max_connections: u32) -> PgPool {
    PgPoolOptions::new()
        .max_connections(max_connections)
        .connect(database_url)
        .await
        .expect("Failed to create database pool")
}
```

```rust
// src/db/mod.rs
pub mod pool;
```

### Step 12: Create Database Migrations

```bash
mkdir -p backend/migrations
```

Create each migration file in order. These are the SQL files that will create your database tables.

**`migrations/001_create_users.sql`:**
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'instructor', 'admin')),
    bio             TEXT,
    phone           VARCHAR(20),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**`migrations/002_create_categories.sql`:**
```sql
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) UNIQUE NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('board', 'class', 'stream', 'subject')),
    parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    icon_url    TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_slug ON categories(slug);
```

**`migrations/003_create_courses.sql`:**
```sql
CREATE TABLE courses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) UNIQUE NOT NULL,
    description     TEXT,
    short_desc      VARCHAR(500),
    thumbnail_url   TEXT,
    instructor_photo_url TEXT,
    board_id        UUID REFERENCES categories(id),
    class_id        UUID REFERENCES categories(id),
    stream_id       UUID REFERENCES categories(id),
    subject_id      UUID REFERENCES categories(id),
    is_free         BOOLEAN NOT NULL DEFAULT true,
    price           DECIMAL(10, 2) DEFAULT 0.00,
    discount_pct    INT DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    language        VARCHAR(20) NOT NULL DEFAULT 'hindi',
    level           VARCHAR(20) DEFAULT 'beginner',
    syllabus_points TEXT[],
    tags            TEXT[],
    is_full_course  BOOLEAN NOT NULL DEFAULT false,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    rejection_reason TEXT,
    published_at    TIMESTAMPTZ,
    total_chapters  INT NOT NULL DEFAULT 0,
    total_lectures  INT NOT NULL DEFAULT 0,
    total_duration  INT NOT NULL DEFAULT 0,
    total_enrollments INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_board ON courses(board_id);
CREATE INDEX idx_courses_class ON courses(class_id);
CREATE INDEX idx_courses_stream ON courses(stream_id);
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_free ON courses(is_free);
CREATE INDEX idx_courses_search ON courses
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

**`migrations/004_create_chapters.sql`:**
```sql
CREATE TABLE chapters (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       VARCHAR(500) NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chapters_course ON chapters(course_id);
```

**`migrations/005_create_lectures.sql`:**
```sql
CREATE TABLE lectures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    sort_order      INT NOT NULL DEFAULT 0,
    video_s3_key    TEXT,
    video_url       TEXT,
    duration        INT DEFAULT 0,
    video_status    VARCHAR(20) DEFAULT 'pending'
                    CHECK (video_status IN ('pending', 'processing', 'ready', 'failed')),
    attachments     JSONB DEFAULT '[]',
    is_preview      BOOLEAN NOT NULL DEFAULT false,
    is_published    BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lectures_chapter ON lectures(chapter_id);
CREATE INDEX idx_lectures_course ON lectures(course_id);
```

**`migrations/006_create_enrollments.sql`:**
```sql
CREATE TABLE enrollments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    progress_pct INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
```

**`migrations/007_create_progress.sql`:**
```sql
CREATE TABLE progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecture_id      UUID NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    watched_seconds INT NOT NULL DEFAULT 0,
    is_completed    BOOLEAN NOT NULL DEFAULT false,
    last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lecture_id)
);

CREATE INDEX idx_progress_user_course ON progress(user_id, course_id);
```

**`migrations/008_create_orders.sql`:**
```sql
CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount              DECIMAL(10, 2) NOT NULL,
    discount_amount     DECIMAL(10, 2) DEFAULT 0.00,
    final_amount        DECIMAL(10, 2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_provider    VARCHAR(20) NOT NULL CHECK (payment_provider IN ('razorpay', 'stripe')),
    payment_id          VARCHAR(255),
    payment_status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    refund_reason       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_course ON orders(course_id);
CREATE INDEX idx_orders_status ON orders(payment_status);
```

**`migrations/009_create_earnings.sql`:**
```sql
CREATE TABLE instructor_earnings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_amount        DECIMAL(10, 2) NOT NULL,
    platform_pct        INT NOT NULL,
    platform_amount     DECIMAL(10, 2) NOT NULL,
    instructor_amount   DECIMAL(10, 2) NOT NULL,
    payout_status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
    payout_date         TIMESTAMPTZ,
    payout_reference    VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_earnings_instructor ON instructor_earnings(instructor_id);
CREATE INDEX idx_earnings_payout ON instructor_earnings(payout_status);

CREATE TABLE revenue_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_platform_pct INT NOT NULL DEFAULT 30,
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instructor_revenue_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id   UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_pct    INT NOT NULL,
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`migrations/010_create_bookmarks.sql`:**
```sql
CREATE TABLE bookmarks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
    lecture_id  UUID REFERENCES lectures(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id, lecture_id)
);

CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
```

**`migrations/011_create_homepage.sql`:**
```sql
CREATE TABLE homepage_content (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section     VARCHAR(50) NOT NULL,
    title       VARCHAR(500),
    content     TEXT,
    image_url   TEXT,
    link_url    TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**`migrations/012_create_refresh_tokens.sql`:**
```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

### Step 13: Run Migrations

```bash
cd backend
sqlx database create
sqlx migrate run
```

### Step 14: Implement Models

Each model maps to a database table. Implement them one by one.

**`src/models/user.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    Student,
    Instructor,
    Admin,
}

impl UserRole {
    pub fn as_str(&self) -> &str {
        match self {
            UserRole::Student => "student",
            UserRole::Instructor => "instructor",
            UserRole::Admin => "admin",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "student" => Some(UserRole::Student),
            "instructor" => Some(UserRole::Instructor),
            "admin" => Some(UserRole::Admin),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub full_name: String,
    pub avatar_url: Option<String>,
    pub role: String,
    pub bio: Option<String>,
    pub phone: Option<String>,
    pub is_active: bool,
    pub email_verified: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/category.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Category {
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub category_type: String,
    pub parent_id: Option<Uuid>,
    pub sort_order: i32,
    pub icon_url: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}
```

**`src/models/course.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Course {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub title: String,
    pub slug: String,
    pub description: Option<String>,
    pub short_desc: Option<String>,
    pub thumbnail_url: Option<String>,
    pub instructor_photo_url: Option<String>,
    pub board_id: Option<Uuid>,
    pub class_id: Option<Uuid>,
    pub stream_id: Option<Uuid>,
    pub subject_id: Option<Uuid>,
    pub is_free: bool,
    pub price: Option<sqlx::types::BigDecimal>,
    pub discount_pct: Option<i32>,
    pub language: String,
    pub level: Option<String>,
    pub syllabus_points: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub is_full_course: bool,
    pub status: String,
    pub rejection_reason: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub total_chapters: i32,
    pub total_lectures: i32,
    pub total_duration: i32,
    pub total_enrollments: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/chapter.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Chapter {
    pub id: Uuid,
    pub course_id: Uuid,
    pub title: String,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/lecture.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Lecture {
    pub id: Uuid,
    pub chapter_id: Uuid,
    pub course_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub sort_order: i32,
    pub video_s3_key: Option<String>,
    pub video_url: Option<String>,
    pub duration: Option<i32>,
    pub video_status: Option<String>,
    pub attachments: Option<serde_json::Value>,
    pub is_preview: bool,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/enrollment.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Enrollment {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub enrolled_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub progress_pct: i32,
}
```

**`src/models/progress.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Progress {
    pub id: Uuid,
    pub user_id: Uuid,
    pub lecture_id: Uuid,
    pub course_id: Uuid,
    pub watched_seconds: i32,
    pub is_completed: bool,
    pub last_watched_at: DateTime<Utc>,
}
```

**`src/models/order.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Order {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Uuid,
    pub amount: sqlx::types::BigDecimal,
    pub discount_amount: Option<sqlx::types::BigDecimal>,
    pub final_amount: sqlx::types::BigDecimal,
    pub currency: String,
    pub payment_provider: String,
    pub payment_id: Option<String>,
    pub payment_status: String,
    pub refund_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/earning.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InstructorEarning {
    pub id: Uuid,
    pub instructor_id: Uuid,
    pub order_id: Uuid,
    pub course_id: Uuid,
    pub order_amount: sqlx::types::BigDecimal,
    pub platform_pct: i32,
    pub platform_amount: sqlx::types::BigDecimal,
    pub instructor_amount: sqlx::types::BigDecimal,
    pub payout_status: String,
    pub payout_date: Option<DateTime<Utc>>,
    pub payout_reference: Option<String>,
    pub created_at: DateTime<Utc>,
}
```

**`src/models/bookmark.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Bookmark {
    pub id: Uuid,
    pub user_id: Uuid,
    pub course_id: Option<Uuid>,
    pub lecture_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}
```

**`src/models/homepage.rs`:**
```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HomepageContent {
    pub id: Uuid,
    pub section: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub image_url: Option<String>,
    pub link_url: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

**`src/models/mod.rs`:**
```rust
pub mod user;
pub mod category;
pub mod course;
pub mod chapter;
pub mod lecture;
pub mod enrollment;
pub mod progress;
pub mod order;
pub mod earning;
pub mod bookmark;
pub mod homepage;
```

### Step 15: Implement JWT Utilities

**`src/utils/jwt.rs`:**
```rust
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, Algorithm};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::fs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: Uuid,       // user id
    pub email: String,
    pub role: String,
    pub iat: i64,
    pub exp: i64,
}

pub struct JwtKeys {
    encoding: EncodingKey,
    decoding: DecodingKey,
}

impl JwtKeys {
    pub fn new(private_key_path: &str, public_key_path: &str) -> Self {
        let private_key = fs::read(private_key_path).expect("Failed to read private key");
        let public_key = fs::read(public_key_path).expect("Failed to read public key");

        Self {
            encoding: EncodingKey::from_rsa_pem(&private_key).expect("Invalid private key"),
            decoding: DecodingKey::from_rsa_pem(&public_key).expect("Invalid public key"),
        }
    }

    pub fn generate_access_token(&self, user_id: Uuid, email: &str, role: &str, expiry_seconds: i64) -> Result<String, jsonwebtoken::errors::Error> {
        let now = Utc::now().timestamp();
        let claims = Claims {
            sub: user_id,
            email: email.to_string(),
            role: role.to_string(),
            iat: now,
            exp: now + expiry_seconds,
        };

        let header = Header::new(Algorithm::RS256);
        encode(&header, &claims, &self.encoding)
    }

    pub fn validate_token(&self, token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
        let validation = Validation::new(Algorithm::RS256);
        let token_data = decode::<Claims>(token, &self.decoding, &validation)?;
        Ok(token_data.claims)
    }
}
```

### Step 16: Implement Password Utilities

**`src/utils/password.rs`:**
```rust
use argon2::{self, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::SaltString;
use argon2::password_hash::rand_core::OsRng;

pub fn hash_password(password: &str) -> Result<String, argon2::password_hash::Error> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2.hash_password(password.as_bytes(), &salt)?;
    Ok(hash.to_string())
}

pub fn verify_password(password: &str, hash: &str) -> Result<bool, argon2::password_hash::Error> {
    let parsed_hash = PasswordHash::new(hash)?;
    Ok(Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok())
}
```

### Step 17: Implement Pagination Utility

**`src/utils/pagination.rs`:**
```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

impl PaginationParams {
    pub fn page(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn limit(&self) -> i64 {
        self.limit.unwrap_or(20).min(100).max(1)
    }

    pub fn offset(&self) -> i64 {
        (self.page() - 1) * self.limit()
    }
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T: Serialize> {
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    pub total_pages: i64,
}

impl PaginationMeta {
    pub fn new(page: i64, limit: i64, total: i64) -> Self {
        Self {
            page,
            limit,
            total,
            total_pages: (total as f64 / limit as f64).ceil() as i64,
        }
    }
}
```

**`src/utils/mod.rs`:**
```rust
pub mod jwt;
pub mod password;
pub mod pagination;
pub mod s3;
pub mod cloudfront;
pub mod validation;
```

**`src/utils/validation.rs`:** (initially empty, add validators as needed)
```rust
// Input validation helpers - add as needed
```

**`src/utils/s3.rs`:** (stub for now, implement in Phase 2)
```rust
// S3 presigned URL generation - implement when adding upload feature
```

**`src/utils/cloudfront.rs`:** (stub for now)
```rust
// CloudFront signed URL generation - implement when adding video streaming
```

### Step 18: Implement Auth DTOs

**`src/dto/auth_dto.rs`:**
```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(email(message = "Invalid email"))]
    pub email: String,
    #[validate(length(min = 8, message = "Password must be at least 8 characters"))]
    pub password: String,
    #[validate(length(min = 1, message = "Full name is required"))]
    pub full_name: String,
    pub role: Option<String>, // defaults to "student"
}

#[derive(Debug, Deserialize, Validate)]
pub struct LoginRequest {
    #[validate(email)]
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: UserResponse,
    pub access_token: String,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub full_name: String,
    pub role: String,
    pub avatar_url: Option<String>,
}
```

**`src/dto/mod.rs`:**
```rust
pub mod auth_dto;
pub mod course_dto;
pub mod student_dto;
pub mod instructor_dto;
pub mod admin_dto;
pub mod payment_dto;
```

(Create empty stubs for the other DTOs for now, fill them in as you implement each feature.)

**`src/dto/course_dto.rs`:**
```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct CourseListItem {
    pub id: Uuid,
    pub title: String,
    pub slug: String,
    pub thumbnail_url: Option<String>,
    pub instructor_name: String,
    pub instructor_avatar: Option<String>,
    pub is_free: bool,
    pub is_full_course: bool,
    pub total_chapters: i32,
    pub total_lectures: i32,
    pub total_enrollments: i32,
}

#[derive(Debug, Deserialize)]
pub struct CourseFilters {
    pub board: Option<String>,
    pub class: Option<String>,
    pub stream: Option<String>,
    pub q: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}
```

**`src/dto/student_dto.rs`:**
```rust
// Student-specific DTOs - implement during Phase 2
```

**`src/dto/instructor_dto.rs`:**
```rust
// Instructor-specific DTOs - implement during Phase 4
```

**`src/dto/admin_dto.rs`:**
```rust
// Admin-specific DTOs - implement during Phase 5
```

**`src/dto/payment_dto.rs`:**
```rust
// Payment DTOs - implement during Phase 3
```

### Step 19: Implement Auth Middleware

**`src/middleware/auth.rs`:**
```rust
use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use crate::error::AppError;
use crate::utils::jwt::{Claims, JwtKeys};
use std::sync::Arc;

/// Extractor that validates JWT and provides Claims
#[derive(Debug, Clone)]
pub struct AuthUser(pub Claims);

#[axum::async_trait]
impl<S: Send + Sync> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized)?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AppError::Unauthorized)?;

        let jwt_keys = parts
            .extensions
            .get::<Arc<JwtKeys>>()
            .ok_or(AppError::Internal("JWT keys not configured".to_string()))?;

        let claims = jwt_keys.validate_token(token).map_err(|_| AppError::Unauthorized)?;
        Ok(AuthUser(claims))
    }
}
```

**`src/middleware/role_guard.rs`:**
```rust
use crate::error::AppError;
use crate::middleware::auth::AuthUser;

/// Check that the authenticated user has the required role
pub fn require_role(auth: &AuthUser, required: &str) -> Result<(), AppError> {
    if auth.0.role == required || auth.0.role == "admin" {
        Ok(())
    } else {
        Err(AppError::Forbidden)
    }
}
```

**`src/middleware/rate_limit.rs`:**
```rust
// Redis-based rate limiting - implement as needed
// For MVP, can start without rate limiting and add later
```

**`src/middleware/mod.rs`:**
```rust
pub mod auth;
pub mod role_guard;
pub mod rate_limit;
```

### Step 20: Implement Auth Handler

**`src/handlers/auth.rs`:**
```rust
use axum::{extract::State, Json};
use sqlx::PgPool;
use validator::Validate;
use std::sync::Arc;

use crate::dto::auth_dto::*;
use crate::error::AppError;
use crate::utils::jwt::JwtKeys;
use crate::utils::password;
use crate::middleware::auth::AuthUser;

pub struct AppState {
    pub db: PgPool,
    pub jwt_keys: Arc<JwtKeys>,
    pub config: crate::config::Config,
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate()?;

    let role = body.role.unwrap_or_else(|| "student".to_string());
    if !["student", "instructor"].contains(&role.as_str()) {
        return Err(AppError::BadRequest("Invalid role".to_string()));
    }

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)"
    )
    .bind(&body.email)
    .fetch_one(&state.db)
    .await?;

    if existing {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    let hash = password::hash_password(&body.password)
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        "INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING *"
    )
    .bind(&body.email)
    .bind(&hash)
    .bind(&body.full_name)
    .bind(&role)
    .fetch_one(&state.db)
    .await?;

    let token = state.jwt_keys
        .generate_access_token(user.id, &user.email, &user.role, state.config.jwt_access_expiry)
        .map_err(|e| AppError::Internal(format!("Token generation failed: {}", e)))?;

    Ok(Json(AuthResponse {
        user: UserResponse {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url,
        },
        access_token: token,
    }))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    body.validate()?;

    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE email = $1 AND is_active = true"
    )
    .bind(&body.email)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::Unauthorized)?;

    let valid = password::verify_password(&body.password, &user.password_hash)
        .map_err(|_| AppError::Internal("Password verification failed".to_string()))?;

    if !valid {
        return Err(AppError::Unauthorized);
    }

    let token = state.jwt_keys
        .generate_access_token(user.id, &user.email, &user.role, state.config.jwt_access_expiry)
        .map_err(|e| AppError::Internal(format!("Token generation failed: {}", e)))?;

    Ok(Json(AuthResponse {
        user: UserResponse {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url,
        },
        access_token: token,
    }))
}

pub async fn me(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<Json<UserResponse>, AppError> {
    let user = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(auth.0.sub)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("User not found".to_string()))?;

    Ok(Json(UserResponse {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url,
    }))
}
```

**`src/handlers/mod.rs`:**
```rust
pub mod auth;
pub mod courses;
pub mod student;
pub mod instructor;
pub mod admin;
pub mod payments;
pub mod upload;
pub mod homepage;
```

### Step 21: Implement Course Handlers (Public)

**`src/handlers/courses.rs`:**
```rust
use axum::{extract::{Path, Query, State}, Json};
use sqlx::PgPool;
use std::sync::Arc;

use crate::dto::course_dto::*;
use crate::error::AppError;
use crate::handlers::auth::AppState;
use crate::utils::pagination::*;

pub async fn list_courses(
    State(state): State<Arc<AppState>>,
    Query(filters): Query<CourseFilters>,
) -> Result<Json<PaginatedResponse<CourseListItem>>, AppError> {
    let page = filters.page.unwrap_or(1).max(1);
    let limit = filters.limit.unwrap_or(20).min(100).max(1);
    let offset = (page - 1) * limit;

    // Build dynamic query based on filters
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM courses WHERE status = 'published'"
    )
    .fetch_one(&state.db)
    .await?;

    let rows = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, String, Option<String>, bool, bool, i32, i32, i32)>(
        r#"
        SELECT c.id, c.title, c.slug, c.thumbnail_url,
               u.full_name as instructor_name, u.avatar_url as instructor_avatar,
               c.is_free, c.is_full_course, c.total_chapters, c.total_lectures, c.total_enrollments
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.status = 'published'
        ORDER BY c.created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<CourseListItem> = rows.into_iter().map(|r| CourseListItem {
        id: r.0,
        title: r.1,
        slug: r.2,
        thumbnail_url: r.3,
        instructor_name: r.4,
        instructor_avatar: r.5,
        is_free: r.6,
        is_full_course: r.7,
        total_chapters: r.8,
        total_lectures: r.9,
        total_enrollments: r.10,
    }).collect();

    Ok(Json(PaginatedResponse {
        data,
        pagination: PaginationMeta::new(page, limit, total),
    }))
}

pub async fn get_course(
    State(state): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let course = sqlx::query_as::<_, crate::models::course::Course>(
        "SELECT * FROM courses WHERE slug = $1 AND status = 'published'"
    )
    .bind(&slug)
    .fetch_optional(&state.db)
    .await?
    .ok_or(AppError::NotFound("Course not found".to_string()))?;

    let chapters = sqlx::query_as::<_, crate::models::chapter::Chapter>(
        "SELECT * FROM chapters WHERE course_id = $1 ORDER BY sort_order"
    )
    .bind(course.id)
    .fetch_all(&state.db)
    .await?;

    let instructor = sqlx::query_as::<_, crate::models::user::User>(
        "SELECT * FROM users WHERE id = $1"
    )
    .bind(course.instructor_id)
    .fetch_one(&state.db)
    .await?;

    Ok(Json(serde_json::json!({
        "course": course,
        "chapters": chapters,
        "instructor": {
            "id": instructor.id,
            "full_name": instructor.full_name,
            "avatar_url": instructor.avatar_url,
            "bio": instructor.bio,
        }
    })))
}

pub async fn get_categories(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<crate::models::category::Category>>, AppError> {
    let categories = sqlx::query_as::<_, crate::models::category::Category>(
        "SELECT * FROM categories WHERE is_active = true ORDER BY sort_order"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(categories))
}

pub async fn search_courses(
    State(state): State<Arc<AppState>>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<CourseListItem>>, AppError> {
    let q = params.get("q").cloned().unwrap_or_default();

    let rows = sqlx::query_as::<_, (uuid::Uuid, String, String, Option<String>, String, Option<String>, bool, bool, i32, i32, i32)>(
        r#"
        SELECT c.id, c.title, c.slug, c.thumbnail_url,
               u.full_name, u.avatar_url,
               c.is_free, c.is_full_course, c.total_chapters, c.total_lectures, c.total_enrollments
        FROM courses c
        JOIN users u ON c.instructor_id = u.id
        WHERE c.status = 'published'
          AND to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')) @@ plainto_tsquery('english', $1)
        LIMIT 20
        "#
    )
    .bind(&q)
    .fetch_all(&state.db)
    .await?;

    let data: Vec<CourseListItem> = rows.into_iter().map(|r| CourseListItem {
        id: r.0, title: r.1, slug: r.2, thumbnail_url: r.3,
        instructor_name: r.4, instructor_avatar: r.5,
        is_free: r.6, is_full_course: r.7,
        total_chapters: r.8, total_lectures: r.9, total_enrollments: r.10,
    }).collect();

    Ok(Json(data))
}
```

### Step 22: Stub Remaining Handlers

Create empty handler files with placeholder functions. Implement them in their respective phases.

**`src/handlers/student.rs`:**
```rust
// Phase 2: Student endpoints (enroll, progress, bookmarks, dashboard)
```

**`src/handlers/instructor.rs`:**
```rust
// Phase 4: Instructor endpoints (course CRUD, upload, analytics, earnings)
```

**`src/handlers/admin.rs`:**
```rust
// Phase 5: Admin endpoints (users, moderation, categories, revenue, analytics)
```

**`src/handlers/payments.rs`:**
```rust
// Phase 3: Payment endpoints (create order, verify, history)
```

**`src/handlers/upload.rs`:**
```rust
// Phase 2: S3 presigned URL generation for uploads
```

**`src/handlers/homepage.rs`:**
```rust
use axum::{extract::State, Json};
use std::sync::Arc;
use crate::error::AppError;
use crate::handlers::auth::AppState;
use crate::models::homepage::HomepageContent;

pub async fn get_homepage(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<HomepageContent>>, AppError> {
    let content = sqlx::query_as::<_, HomepageContent>(
        "SELECT * FROM homepage_content WHERE is_active = true ORDER BY section, sort_order"
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(content))
}
```

### Step 23: Stub Service Files

```rust
// src/services/mod.rs
pub mod auth_service;
pub mod course_service;
pub mod enrollment_service;
pub mod payment_service;
pub mod revenue_service;
pub mod upload_service;
pub mod email_service;
pub mod analytics_service;
```

Create each file as empty for now. Move business logic from handlers into services as the codebase grows.

### Step 24: Implement `app.rs` - Router Assembly

```rust
// src/app.rs
use axum::{
    routing::{get, post},
    Router, Extension,
};
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::compression::CompressionLayer;

use crate::handlers;
use crate::handlers::auth::AppState;
use crate::utils::jwt::JwtKeys;

pub fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any) // Restrict in production to frontend_url
        .allow_methods(Any)
        .allow_headers(Any);

    let jwt_keys = state.jwt_keys.clone();

    // Public auth routes
    let auth_routes = Router::new()
        .route("/register", post(handlers::auth::register))
        .route("/login", post(handlers::auth::login))
        .route("/me", get(handlers::auth::me));

    // Public course routes
    let course_routes = Router::new()
        .route("/", get(handlers::courses::list_courses))
        .route("/search", get(handlers::courses::search_courses))
        .route("/{slug}", get(handlers::courses::get_course));

    // Public content routes
    let public_routes = Router::new()
        .route("/homepage", get(handlers::homepage::get_homepage))
        .route("/categories", get(handlers::courses::get_categories));

    // Assemble API
    let api = Router::new()
        .nest("/auth", auth_routes)
        .nest("/courses", course_routes)
        .merge(public_routes);

    Router::new()
        .nest("/api", api)
        .layer(Extension(jwt_keys))
        .layer(cors)
        .layer(CompressionLayer::new())
        .with_state(state)
}
```

### Step 25: Implement `main.rs` - Server Entry Point

```rust
// src/main.rs
mod config;
mod app;
mod error;
mod db;
mod models;
mod handlers;
mod services;
mod middleware;
mod utils;
mod dto;

use std::sync::Arc;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::db::pool::create_pool;
use crate::handlers::auth::AppState;
use crate::utils::jwt::JwtKeys;

#[tokio::main]
async fn main() {
    // Load env
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = Config::from_env();

    // Init database pool
    let db = create_pool(&config.database_url, config.database_max_connections).await;
    tracing::info!("Database connected");

    // Run pending migrations
    sqlx::migrate!("./migrations")
        .run(&db)
        .await
        .expect("Failed to run migrations");
    tracing::info!("Migrations applied");

    // Init JWT keys
    let jwt_keys = Arc::new(JwtKeys::new(
        &config.jwt_private_key_path,
        &config.jwt_public_key_path,
    ));

    // Build app state
    let state = Arc::new(AppState {
        db,
        jwt_keys,
        config: config.clone(),
    });

    // Build router
    let app = app::create_router(state);

    // Start server
    let addr = format!("{}:{}", config.host, config.port);
    tracing::info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
```

### Step 26: Verify Backend Compiles & Runs

```bash
cd backend
cargo build
cargo run
# Should see: Server starting on 0.0.0.0:8080
```

Test with:
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## PHASE 2: Frontend Foundation

### Step 27: Initialize React Frontend

```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

### Step 28: Install Frontend Dependencies

```bash
npm install \
  react-router-dom \
  zustand \
  axios \
  tailwindcss @tailwindcss/vite \
  lucide-react \
  react-hot-toast \
  clsx
```

### Step 29: Configure Tailwind CSS

**`tailwind.config.js`:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',
        navy: '#1A1A2E',
        'gray-body': '#333333',
        'gray-secondary': '#666666',
        'green-accent': '#4CAF50',
        'red-accent': '#FF4444',
        'blue-accent': '#2196F3',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      maxWidth: {
        container: '1200px',
      },
    },
  },
  plugins: [],
};
```

**`vite.config.ts`:**
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
```

**`src/index.css`:**
```css
@import "tailwindcss";
```

### Step 30: Create Frontend Source Structure

```bash
cd frontend/src
mkdir -p api store hooks types
mkdir -p components/layout components/common components/course components/home components/video components/dashboard components/forms
mkdir -p pages/public pages/student pages/instructor pages/admin
mkdir -p routes utils
```

### Step 31: Set Up API Client

**`src/api/client.ts`:**
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**`src/api/auth.ts`:**
```ts
import api from './client';

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterData) => api.post('/auth/register', data),
  login: (data: LoginData) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};
```

**`src/api/courses.ts`:**
```ts
import api from './client';

export const coursesApi = {
  list: (params?: Record<string, string>) => api.get('/courses', { params }),
  getBySlug: (slug: string) => api.get(`/courses/${slug}`),
  search: (q: string) => api.get('/courses/search', { params: { q } }),
  getCategories: () => api.get('/categories'),
};
```

### Step 32: Set Up Zustand Auth Store

**`src/store/authStore.ts`:**
```ts
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),

  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },

  isAuthenticated: () => !!get().token,
}));
```

### Step 33: Set Up React Router

**`src/routes/index.tsx`:**
```tsx
import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/public/LoginPage';
import RegisterPage from '../pages/public/RegisterPage';
import CourseListingPage from '../pages/public/CourseListingPage';
import CourseDetailPage from '../pages/public/CourseDetailPage';

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/courses', element: <CourseListingPage /> },
  { path: '/courses/:slug', element: <CourseDetailPage /> },
]);
```

**`src/App.tsx`:**
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

### Step 34: Build Layout Components

**`src/components/layout/Header.tsx`:**
```tsx
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-green-accent">
          Magnet Brains
        </Link>

        <div className="flex-1 mx-8">
          <input
            type="text"
            placeholder="Search courses..."
            className="w-full max-w-md px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-secondary">{user.full_name}</span>
              <button onClick={logout} className="text-sm text-red-accent hover:underline">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-body hover:text-primary">Login</Link>
              <Link to="/register" className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-600">
                Register
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
```

**`src/components/layout/Footer.tsx`:**
```tsx
export default function Footer() {
  return (
    <footer className="bg-navy text-white py-12">
      <div className="max-w-container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <h3 className="font-bold text-lg mb-4">Company</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><a href="/about">About Us</a></li>
            <li><a href="/contact">Contact Us</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms and Conditions</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-4">Study Material</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>English Medium E-Notes</li>
            <li>Hindi Medium E-Books</li>
            <li>Sample Papers</li>
            <li>Previous Year Papers</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-4">Our Top Courses</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>Class 12 Science</li>
            <li>Class 12 Commerce</li>
            <li>Class 11 Science</li>
            <li>Class 10</li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-lg mb-4">Magnet Brains</h3>
          <p className="text-sm text-gray-300 mb-2">India's No.1 Free Online Education Platform</p>
          <p className="text-sm text-gray-400">support@magnetbrains.com</p>
        </div>
      </div>
      <div className="max-w-container mx-auto px-4 mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} Magnet Brains. All rights reserved.
      </div>
    </footer>
  );
}
```

### Step 35: Build Page Components

**`src/pages/public/HomePage.tsx`:**
```tsx
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-green-accent to-blue-accent text-white py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            INDIA'S NO.1 100% Free Online Education Platform
          </h1>
          <p className="text-lg mb-8">High-Quality Video Lectures for All Classes & Boards</p>
          <a href="/courses" className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-orange-600">
            Explore Courses
          </a>
        </section>

        {/* Course Discovery: Sidebar + Grid */}
        <section className="max-w-container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Explore Top Courses</h2>
          {/* TODO: Category sidebar + CourseGrid */}
          <p className="text-center text-gray-secondary">Courses will load here from the API.</p>
        </section>

        {/* Features Grid */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">Why Choose Magnet Brains?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {['100% Free Quality Education', '100% Complete Syllabus', 'Doubt Solving Sessions',
                'Recorded Video Lectures', 'Live Interactive Classes', 'Exam Preparation Videos',
                'Previous Year Questions', 'Sample Paper & E-Notes'].map((feature) => (
                <div key={feature} className="bg-white p-6 rounded-lg text-center shadow-sm">
                  <p className="font-medium text-gray-body">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="max-w-container mx-auto px-4 py-12">
          <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          {/* TODO: Accordion FAQ component */}
        </section>
      </main>
      <Footer />
    </div>
  );
}
```

**`src/pages/public/LoginPage.tsx`:**
```tsx
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import Header from '../../components/layout/Header';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.login({ email, password });
      setAuth(res.data.user, res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center py-16">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
          {error && <p className="text-red-accent text-sm mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary" required />
          </div>
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-orange-600">
            Login
          </button>
          <p className="text-center text-sm mt-4 text-gray-secondary">
            Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

**`src/pages/public/RegisterPage.tsx`:**
```tsx
import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import Header from '../../components/layout/Header';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authApi.register({ email, password, full_name: fullName, role });
      setAuth(res.data.user, res.data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center py-16">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
          {error && <p className="text-red-accent text-sm mb-4">{error}</p>}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md" required minLength={8} />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">I am a</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full px-3 py-2 border rounded-md">
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-md font-medium hover:bg-orange-600">
            Register
          </button>
          <p className="text-center text-sm mt-4 text-gray-secondary">
            Already have an account? <Link to="/login" className="text-primary hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
```

**`src/pages/public/CourseListingPage.tsx`:**
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { coursesApi } from '../../api/courses';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function CourseListingPage() {
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    coursesApi.list().then(res => setCourses(res.data.data));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">All Courses</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {courses.map(course => (
            <Link key={course.id} to={`/courses/${course.slug}`}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
              <div className="h-40 bg-gray-200">
                {course.thumbnail_url && <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                {course.is_full_course && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">FULL COURSE</span>}
                <h3 className="font-semibold mt-2 text-sm line-clamp-2">{course.title}</h3>
                <p className="text-xs text-gray-secondary mt-1">{course.instructor_name}</p>
                <button className="mt-3 w-full bg-primary text-white py-1.5 rounded text-sm font-medium">
                  WATCH NOW
                </button>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
```

**`src/pages/public/CourseDetailPage.tsx`:**
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { coursesApi } from '../../api/courses';
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';

export default function CourseDetailPage() {
  const { slug } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (slug) coursesApi.getBySlug(slug).then(res => setData(res.data));
  }, [slug]);

  if (!data) return <div>Loading...</div>;

  const { course, chapters, instructor } = data;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Dark header section */}
      <section className="bg-navy text-white py-12">
        <div className="max-w-container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          <p className="text-gray-300 mb-4">By {instructor.full_name}</p>
          {course.syllabus_points && (
            <ul className="space-y-1">
              {course.syllabus_points.map((point: string, i: number) => (
                <li key={i} className="text-sm text-gray-300">✓ {point}</li>
              ))}
            </ul>
          )}
          <span className="inline-block mt-4 bg-green-accent text-white px-4 py-1 rounded text-sm font-medium">
            {course.is_free ? 'Free Course' : `₹${course.price}`}
          </span>
        </div>
      </section>

      {/* Chapters + Sidebar */}
      <main className="max-w-container mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-4">Watch all Videos</h2>
          <div className="space-y-2">
            {chapters.map((ch: any) => (
              <details key={ch.id} className="border rounded-lg">
                <summary className="px-4 py-3 cursor-pointer font-medium flex justify-between">
                  {ch.title}
                </summary>
                <div className="px-4 pb-3 text-sm text-gray-secondary">
                  Lectures will appear here.
                </div>
              </details>
            ))}
          </div>
        </div>

        <aside className="w-full md:w-72 shrink-0">
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold mb-4">What We Offer</h3>
            <ul className="space-y-2 text-sm">
              {['Quality Education', 'Top Teachers', 'Notes & eBooks', 'Sample Papers',
                'Previous Year Questions', 'Detailed E-Notes', 'Exam Preparation Videos'].map(item => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
```

### Step 36: Create `.env` for Frontend

**`frontend/.env`:**
```
VITE_API_URL=http://localhost:8080/api
```

### Step 37: Verify Frontend Runs

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

---

## PHASE 3: Student Features (Enrollment, Progress, Bookmarks)

### Step 38: Implement Student API Endpoints (Backend)

Add student routes to `src/handlers/student.rs`:

```rust
// Implement these endpoints:
// POST /api/student/enroll/:course_id   - Enroll in free course
// GET  /api/student/enrollments         - List enrolled courses
// GET  /api/student/progress/:course_id - Get course progress
// POST /api/student/progress            - Update lecture progress
// GET  /api/student/bookmarks           - List bookmarks
// POST /api/student/bookmarks           - Add bookmark
// DELETE /api/student/bookmarks/:id     - Remove bookmark
// GET  /api/student/dashboard           - Dashboard summary
```

Each handler should:
1. Extract `AuthUser` from the request
2. Verify the user has `student` role using `require_role`
3. Perform the database operation
4. Return the result as JSON

### Step 39: Add Student Routes to Router

In `src/app.rs`, add:
```rust
let student_routes = Router::new()
    .route("/enroll/:course_id", post(handlers::student::enroll))
    .route("/enrollments", get(handlers::student::list_enrollments))
    .route("/progress/:course_id", get(handlers::student::get_progress))
    .route("/progress", post(handlers::student::update_progress))
    .route("/bookmarks", get(handlers::student::list_bookmarks))
    .route("/bookmarks", post(handlers::student::add_bookmark))
    .route("/bookmarks/:id", delete(handlers::student::remove_bookmark))
    .route("/dashboard", get(handlers::student::dashboard));

// Nest under /api/student
api.nest("/student", student_routes)
```

### Step 40: Build Student Dashboard Frontend

Create pages:
- `src/pages/student/StudentDashboard.tsx` - Enrolled courses overview with progress bars
- `src/pages/student/MyCoursesPage.tsx` - Grid of enrolled courses
- `src/pages/student/BookmarksPage.tsx` - Bookmarked courses/lectures
- `src/pages/student/ProfilePage.tsx` - Edit profile form

Add routes:
```tsx
{ path: '/dashboard', element: <ProtectedRoute><StudentDashboard /></ProtectedRoute> }
{ path: '/my-courses', element: <ProtectedRoute><MyCoursesPage /></ProtectedRoute> }
{ path: '/bookmarks', element: <ProtectedRoute><BookmarksPage /></ProtectedRoute> }
```

### Step 41: Implement Video Player Page

Create `src/pages/public/VideoPlayerPage.tsx`:
- Fetch signed stream URL from `GET /api/lectures/:id/stream`
- Render HTML5 video player with the signed URL
- Show chapter/lecture navigation sidebar
- Track progress: send `POST /api/student/progress` periodically while watching

---

## PHASE 4: Payment Integration

### Step 42: Implement Razorpay Backend

In `src/handlers/payments.rs`:

```rust
// POST /api/payments/create-order
//   - Validate course exists and is paid
//   - Call Razorpay API to create an order
//   - Return order_id, amount, currency, razorpay_key
//
// POST /api/payments/verify
//   - Receive razorpay_payment_id, razorpay_order_id, razorpay_signature
//   - Verify signature using HMAC SHA256
//   - Create order record in DB
//   - Create enrollment
//   - Calculate instructor earnings (platform commission split)
//
// POST /api/webhooks/razorpay
//   - Verify webhook signature
//   - Handle payment.captured, payment.failed, refund.created events
//   - Idempotent processing using payment_id
```

### Step 43: Frontend Payment Flow

Add Razorpay checkout to `CourseDetailPage.tsx`:
1. Show "Buy Course" button for paid courses
2. On click: call `POST /api/payments/create-order`
3. Open Razorpay checkout modal with returned order details
4. On success callback: call `POST /api/payments/verify`
5. On verification success: redirect to course player

Include the Razorpay script in `index.html`:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Step 44: Purchase History Page

Create `src/pages/student/PurchaseHistoryPage.tsx`:
- Fetch `GET /api/payments/history`
- Display table: course name, amount, date, status

---

## PHASE 5: Instructor Features

### Step 45: Implement Instructor Backend Endpoints

In `src/handlers/instructor.rs`:

```rust
// Course CRUD:
// GET    /api/instructor/courses           - List own courses
// POST   /api/instructor/courses           - Create course (multi-field form)
// PUT    /api/instructor/courses/:id       - Update course
// DELETE /api/instructor/courses/:id       - Delete course (only if draft/no enrollments)

// Chapter CRUD:
// POST   /api/instructor/courses/:id/chapters   - Add chapter
// PUT    /api/instructor/chapters/:id           - Update chapter
// DELETE /api/instructor/chapters/:id           - Delete chapter

// Lecture CRUD:
// POST   /api/instructor/chapters/:id/lectures  - Add lecture
// PUT    /api/instructor/lectures/:id           - Update lecture
// DELETE /api/instructor/lectures/:id           - Delete lecture

// Upload:
// POST   /api/instructor/upload/presign         - Get S3 presigned URL

// Analytics:
// GET    /api/instructor/dashboard              - Dashboard summary
// GET    /api/instructor/earnings               - Revenue breakdown
// GET    /api/instructor/analytics              - Performance stats
```

### Step 46: Implement S3 Presigned URL Generation

In `src/utils/s3.rs`:
```rust
// Use aws-sdk-s3 to generate presigned PUT URLs
// Key format: videos/{instructor_uuid}/{course_uuid}/{filename}
// Expiry: 1 hour
// Content-Type restriction based on file type
```

### Step 47: Build Instructor Frontend Pages

Create:
- `src/pages/instructor/InstructorDashboard.tsx` - Stats overview, recent activity
- `src/pages/instructor/ManageCoursesPage.tsx` - List courses with status badges, edit/delete actions
- `src/pages/instructor/CourseEditorPage.tsx` - Multi-step form for course creation/editing:
  - Step 1: Basic info (title, description, board, class, stream, subject)
  - Step 2: Pricing (free/paid, price, discount)
  - Step 3: Content structure (add chapters, add lectures to chapters)
  - Step 4: Upload videos (drag-drop, direct S3 upload with progress bar)
  - Step 5: Review & submit for approval
- `src/pages/instructor/EarningsPage.tsx` - Revenue chart, payout history
- `src/pages/instructor/AnalyticsPage.tsx` - Views, enrollments, completion rates

### Step 48: Build Video Uploader Component

`src/components/forms/VideoUploader.tsx`:
1. User selects file
2. Frontend calls `POST /api/instructor/upload/presign` with file metadata
3. Receives presigned URL and S3 key
4. Frontend uploads directly to S3 using `XMLHttpRequest` (for progress tracking)
5. On complete, saves the S3 key with the lecture record

---

## PHASE 6: Admin Panel

### Step 49: Implement Admin Backend Endpoints

In `src/handlers/admin.rs`:

```rust
// User Management:
// GET  /api/admin/users              - Paginated user list with filters
// PUT  /api/admin/users/:id          - Activate/deactivate user

// Course Moderation:
// GET  /api/admin/courses            - All courses with status filter
// PUT  /api/admin/courses/:id/approve - Approve pending course
// PUT  /api/admin/courses/:id/reject  - Reject with reason

// Category Management:
// GET/POST/PUT/DELETE /api/admin/categories

// Revenue & Payouts:
// GET  /api/admin/revenue            - Platform revenue dashboard
// PUT  /api/admin/revenue/settings   - Update default commission %
// PUT  /api/admin/revenue/instructor/:id - Override per-instructor %
// GET  /api/admin/payouts            - Pending payouts list
// POST /api/admin/payouts/:id/process - Mark payout processed

// Homepage CMS:
// GET/POST/PUT/DELETE /api/admin/homepage

// Analytics:
// GET  /api/admin/analytics          - Platform-wide stats
```

### Step 50: Build Admin Frontend Pages

Create:
- `src/pages/admin/AdminDashboard.tsx` - Platform stats (total users, courses, revenue)
- `src/pages/admin/UserManagementPage.tsx` - Searchable user table, activate/deactivate toggle
- `src/pages/admin/CourseModerationPage.tsx` - Review queue, approve/reject workflow
- `src/pages/admin/CategoryManagementPage.tsx` - CRUD for boards, classes, streams, subjects
- `src/pages/admin/RevenueSettingsPage.tsx` - Commission % settings, per-instructor overrides
- `src/pages/admin/PayoutManagementPage.tsx` - Pending payouts table, process button
- `src/pages/admin/HomepageEditorPage.tsx` - Manage banners, testimonials, FAQ, announcements
- `src/pages/admin/PlatformAnalyticsPage.tsx` - Charts: users over time, revenue, top courses

### Step 51: Add Route Guards

**`src/routes/ProtectedRoute.tsx`:**
```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" />;
  return <>{children}</>;
}
```

**`src/routes/RoleRoute.tsx`:**
```tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RoleRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role && user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}
```

---

## PHASE 7: Polish, Performance & Security

### Step 52: Add Security Headers (Backend)

In `src/app.rs`, add security middleware:
```rust
// Add these response headers to all routes:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// Referrer-Policy: strict-origin-when-cross-origin
```

### Step 53: Add Redis Caching

Cache hot data:
- Course listings (TTL: 5 minutes)
- Categories (TTL: 1 hour)
- Homepage content (TTL: 15 minutes)

Pattern:
```rust
// 1. Check Redis for cached data
// 2. If cache miss, query PostgreSQL
// 3. Store result in Redis with TTL
// 4. Return data
```

### Step 54: Add Rate Limiting

In `src/middleware/rate_limit.rs`:
- Auth endpoints: 5 requests/minute per IP
- API endpoints: 100 requests/minute per user
- Use Redis INCR with TTL

### Step 55: Frontend Performance

- Add `React.lazy()` for route-level code splitting
- Add `loading="lazy"` to all images
- Implement search debouncing (300ms delay)
- Add error boundaries around major sections

### Step 56: CORS Configuration (Production)

Restrict CORS to your frontend domain only:
```rust
let cors = CorsLayer::new()
    .allow_origin(config.frontend_url.parse().unwrap())
    .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
    .allow_headers([AUTHORIZATION, CONTENT_TYPE]);
```

---

## PHASE 8: Deployment

### Step 57: Create Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM rust:1.77-slim AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src/ src/
COPY migrations/ migrations/
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/magnetbrains-api /usr/local/bin/
EXPOSE 8080
CMD ["magnetbrains-api"]
```

### Step 58: Deploy Frontend to Vercel

```bash
cd frontend
npm run build

# Create vercel.json
# Deploy: vercel --prod
```

### Step 59: Set Up AWS Infrastructure

1. **RDS PostgreSQL** - db.t3.medium, enable automated backups
2. **ElastiCache Redis** - cache.t3.micro
3. **S3 Bucket** - private, versioning enabled
4. **CloudFront** - OAI for S3, signed URLs configured
5. **EC2/ECS** - Run Docker container behind ALB
6. **SES** - Verify domain, set up transactional emails
7. **Secrets Manager** - Store all env vars
8. **ACM** - SSL certificates for your domain

### Step 60: DNS & Go Live

1. Point `api.magnetbrains.com` to ALB
2. Point `magnetbrains.com` to Vercel
3. Update frontend `.env` with production API URL
4. Run migrations on production database
5. Seed initial admin user and categories
6. Test end-to-end flow
7. Go live!

---

## Quick Reference: API Endpoints Summary

| Group | Endpoints Count | Phase |
|-------|----------------|-------|
| Auth | 8 endpoints | Phase 1 |
| Courses (Public) | 7 endpoints | Phase 1 |
| Student | 8 endpoints | Phase 3 |
| Video Streaming | 2 endpoints | Phase 3 |
| Payments | 3 endpoints | Phase 4 |
| Instructor | 14 endpoints | Phase 5 |
| Admin | 18 endpoints | Phase 6 |
| Public Content | 3 endpoints | Phase 1 |

---

## Seed Data Script

After setup, seed your database with initial data:

```sql
-- Create admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
VALUES ('admin@magnetbrains.com', '<argon2_hash>', 'Admin', 'admin', true, true);

-- Seed categories: Boards
INSERT INTO categories (name, slug, type, sort_order) VALUES
('CBSE English Medium', 'cbse-english', 'board', 1),
('CBSE Hindi Medium', 'cbse-hindi', 'board', 2),
('MP Board', 'mp-board', 'board', 3),
('UP Board', 'up-board', 'board', 4),
('Bihar Board', 'bihar-board', 'board', 5);

-- Seed categories: Classes (under CBSE English)
INSERT INTO categories (name, slug, type, parent_id, sort_order)
SELECT name, slug, 'class', (SELECT id FROM categories WHERE slug = 'cbse-english'), sort_order
FROM (VALUES
  ('Class 12', 'cbse-en-class-12', 1),
  ('Class 11', 'cbse-en-class-11', 2),
  ('Class 10', 'cbse-en-class-10', 3),
  ('Class 9', 'cbse-en-class-9', 4)
) AS t(name, slug, sort_order);

-- Seed categories: Streams (under Class 12)
INSERT INTO categories (name, slug, type, parent_id, sort_order)
SELECT name, slug, 'stream', (SELECT id FROM categories WHERE slug = 'cbse-en-class-12'), sort_order
FROM (VALUES
  ('Science', 'cbse-en-12-science', 1),
  ('Commerce', 'cbse-en-12-commerce', 2),
  ('Humanities', 'cbse-en-12-humanities', 3)
) AS t(name, slug, sort_order);

-- Add revenue settings default
INSERT INTO revenue_settings (default_platform_pct) VALUES (30);
```

---

*Follow each phase in order. Get Phase 1 working end-to-end before moving to Phase 2. Each phase should result in a working, testable application.*
