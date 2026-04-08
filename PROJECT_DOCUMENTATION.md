# Magnet Brains E-Learning Platform - Full Project Documentation

> **Migration from WordPress to a custom, scalable web application**
> **Version:** 1.0 | **Date:** April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Feature Breakdown](#6-feature-breakdown)
7. [Database Schema](#7-database-schema)
8. [API Endpoints](#8-api-endpoints)
9. [Folder Structure](#9-folder-structure)
10. [UI/UX Component Structure](#10-uiux-component-structure)
11. [Video System & CDN](#11-video-system--cdn)
12. [Payment Integration](#12-payment-integration)
13. [Performance & Scalability](#13-performance--scalability)
14. [Security Best Practices](#14-security-best-practices)
15. [Deployment Guide](#15-deployment-guide)
16. [Setup Instructions](#16-setup-instructions)

---

## 1. Project Overview

### Current State
The existing platform (Magnet Brains) runs on WordPress and serves as India's leading free online education platform. It offers structured video courses across multiple education boards (CBSE, MP Board, UP Board, Bihar Board), classes (Kindergarten through Class 12), and streams (Science, Commerce, Humanities). The platform features instructor-led video lectures organized by Class > Subject > Chapter > Lecture, with supporting study materials like E-Notes and E-Books.

### Migration Goal
Build a **production-ready, scalable e-learning web application** that:
- Replicates the existing UI/UX faithfully (clean card-based layout, category sidebar, chapter-wise content structure)
- Replaces WordPress with a high-performance Rust backend
- Adds monetization capabilities (free + paid courses, revenue sharing)
- Supports multi-role access (Student, Instructor, Admin)
- Delivers video content via CDN for global performance
- Scales horizontally to handle growing user base

### Key Pages (Derived from Screenshots)

| Page | Description |
|------|-------------|
| **Home** | Hero banner, promotional popups, category sidebar (boards/classes), course grid cards, features section, YouTube channels, mobile app CTA, student testimonials, FAQ, footer |
| **Course Listing** | Board/Class/Stream-specific page showing subject course cards with instructor photos, badges (e.g., "FULL COURSE"), and "Watch Now" CTAs |
| **Course Detail** | Course title, instructor info, syllabus coverage list, chapter-wise lecture breakdown with counts, sidebar ("What We Offer" features, E-Notes CTA, app download, YouTube link), "Students Also Read" recommendations |
| **Lecture View** | Expandable chapter accordion revealing individual lectures with "Watch Now" links, video player page |
| **Student Dashboard** | Enrolled courses, progress tracking, bookmarks, purchase history |
| **Instructor Dashboard** | Course management, analytics, revenue tracking |
| **Admin Panel** | User management, course moderation, platform analytics, revenue settings |

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18+ (Vite) | Single Page Application with TypeScript |
| **Styling** | Tailwind CSS | Utility-first CSS matching existing clean design |
| **State Management** | Zustand | Lightweight global state |
| **Backend** | Rust (Axum) | High-performance REST API server |
| **Database** | PostgreSQL 16 | Relational data storage with full-text search |
| **ORM** | SQLx | Compile-time checked SQL queries for Rust |
| **Cache** | Redis | Session caching, rate limiting, hot data |
| **Object Storage** | Amazon S3 | Videos, PDFs, images, E-Notes |
| **CDN** | Amazon CloudFront | Global video delivery with signed URLs |
| **Auth** | JWT (RS256) | Stateless token-based authentication |
| **Payments** | Razorpay / Stripe | Course purchases, payouts |
| **Email** | Amazon SES | Transactional emails (signup, purchase, reset) |
| **Search** | PostgreSQL Full-Text / Meilisearch (optional) | Course and content search |
| **Containerization** | Docker + Docker Compose | Consistent dev/prod environments |

---

## 3. Architecture Overview

```
                         ┌──────────────┐
                         │   CloudFront │
                         │     (CDN)    │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼─────┐    │    ┌──────▼──────┐
              │   React    │    │    │   S3 Bucket  │
              │  Frontend  │    │    │  (Media)     │
              │ (Vercel)   │    │    └─────────────┘
              └─────┬──────┘    │
                    │           │
                    ▼           │
           ┌───────────────┐   │
           │  API Gateway  │   │
           │  (optional)   │   │
           └───────┬───────┘   │
                   │           │
                   ▼           │
          ┌────────────────┐   │
          │   Rust (Axum)  │───┘
          │   Backend API  │
          └───┬────────┬───┘
              │        │
         ┌────▼──┐ ┌───▼───┐
         │ Redis │ │ Postgres│
         │ Cache │ │  (RDS)  │
         └───────┘ └─────────┘
```

### Request Flow
1. User opens the React SPA (served via Vercel/Netlify CDN)
2. React app makes REST API calls to the Axum backend
3. Backend authenticates via JWT, processes business logic
4. Data is read/written to PostgreSQL; hot data cached in Redis
5. Media uploads go to S3 via presigned URLs (client-direct upload)
6. Video playback uses CloudFront signed URLs for secure streaming

---

## 4. Authentication & Authorization

### Auth Flow

```
┌────────┐     POST /api/auth/register      ┌──────────┐
│ Client │ ─────────────────────────────────▶│  Backend │
│        │◀───────────── JWT Token ──────────│          │
│        │                                   │          │
│        │     POST /api/auth/login          │          │
│        │ ─────────────────────────────────▶│          │
│        │◀───────────── JWT Token ──────────│          │
│        │                                   │          │
│        │  GET /api/courses (Bearer token)  │          │
│        │ ─────────────────────────────────▶│          │
│        │◀───────────── Response ───────────│          │
└────────┘                                   └──────────┘
```

### JWT Token Structure
```json
{
  "sub": "user_uuid",
  "email": "user@example.com",
  "role": "student",
  "iat": 1712400000,
  "exp": 1712486400
}
```

### Token Management
- **Access Token:** Short-lived (15 minutes), sent in `Authorization: Bearer <token>` header
- **Refresh Token:** Long-lived (7 days), stored in HTTP-only secure cookie
- **Token Refresh:** `POST /api/auth/refresh` rotates both tokens
- **Logout:** Refresh token is invalidated server-side (stored in Redis blacklist)

### Password Security
- Hashed with **Argon2id** (memory-hard, resistant to GPU attacks)
- Minimum 8 characters, enforced server-side
- Password reset via time-limited email link (30-minute expiry)

---

## 5. User Roles & Permissions

### Role-Based Access Control (RBAC)

| Permission | Student | Instructor | Admin |
|------------|---------|------------|-------|
| Browse/search courses | Yes | Yes | Yes |
| Watch free lectures | Yes | Yes | Yes |
| Purchase courses | Yes | No | No |
| Track progress | Yes | No | No |
| Bookmark content | Yes | No | No |
| Create/edit own courses | No | Yes | Yes |
| Upload videos/materials | No | Yes | Yes |
| View own revenue/analytics | No | Yes | Yes |
| Manage all users | No | No | Yes |
| Approve/reject courses | No | No | Yes |
| Configure platform settings | No | No | Yes |
| View platform-wide analytics | No | No | Yes |

### Middleware Implementation
```rust
// Role guard middleware for Axum
async fn require_role(
    role: UserRole,
    claims: Claims,
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    if claims.role != role && claims.role != UserRole::Admin {
        return Err(AppError::Forbidden);
    }
    Ok(next.run(request).await)
}
```

---

## 6. Feature Breakdown

### 6.1 Public-Facing Features (Homepage)

Based on the existing platform screenshots, the homepage includes:

#### Hero Section
- Large banner: branding, tagline ("India's No.1 100% Free Online Education Platform")
- Promotional popup/modal for E-Notes & E-Books with feature bullets and CTA
- Top announcement bar linking to initiatives (e.g., "Support Our Free School Education Initiative")

#### Course Discovery
- **Category Sidebar** (left panel): Hierarchical navigation
  - Education Board (CBSE English/Hindi Medium, MP Board, UP Board, Bihar Board, etc.)
  - Special categories: Sanskrit Sahitya, Vedic Maths, Olympiad, CUET, IIT-JEE, NDA, UPSC, Bank & Commerce, JAIIB & CAIIB
- **Course Grid** (main area): Cards showing Class number, Stream name, badge icons, and "Complete Course" links
- Courses organized as: **Board > Class > Stream > Subject**

#### Features Section
- Icon grid showcasing platform value props:
  - 100% Free Quality Education
  - 100% Complete Syllabus
  - Doubt Solving Sessions
  - Recorded Video Lectures
  - Live Interactive Classes
  - Exam Preparation Videos
  - Previous Year Questions
  - Sample Paper & E-Notes

#### Social Proof
- YouTube Channel links (English Medium, Hindi Medium) with subscriber context
- Student testimonials with photos, names, and achievement quotes
- Mobile app download CTA (Google Play badge)

#### FAQ Section
- Expandable accordion with common questions:
  - Why Choose Magnet Brains?
  - Our Vision?
  - What Magnet Brains provide?
  - Does Magnet Brains have a learning App?
  - Does Magnet Brains have any other channels?
  - Do we provide other Features?
  - How to get our expert notes?
  - How to contact Magnet Brains?

#### Footer
- **Company:** Contact Us, About Us, Privacy Policy, Terms and Conditions, Careers
- **Study Material:** English Medium E-Notes, Hindi Medium E-Books, Sample Papers, Previous Year Papers, Spoken English
- **Our Top Courses:** Quick links to popular class/stream combinations
- **Brand section:** Logo, physical address, phone numbers, email, Google Play link, social icons

### 6.2 Course Listing Page

As seen in the CBSE Class 12th Science Stream screenshot:

- Page title: "[Board] [Class] [Stream] Full Video Course"
- Subtitle: Platform value proposition
- **Subject cards** in responsive grid (4 columns on desktop):
  - Instructor photo (prominent)
  - Subject overlay badge (e.g., "Class 12th PHYSICS")
  - Color-coded subject labels
  - "FULL COURSE" badge where applicable
  - Course title with book/syllabus reference
  - Instructor name
  - "WATCH NOW" CTA button (orange)

### 6.3 Course Detail Page

- **Header section** (dark background):
  - Breadcrumb navigation
  - Course title (e.g., "Class 12th Physics NCERT (Part I Book) CBSE - Updated Course")
  - Instructor name
  - "This Course Covers The Following:" checklist (NCERT Syllabus, Explanation, Chapter-wise Summary, MCQs, etc.)
  - Instructor photo with subject/class badge
  - Course type badge ("Free Course" or price)

- **Chapter/Lecture Breakdown** ("Watch all Videos"):
  - Expandable chapter accordion
  - Each chapter shows: chapter number, title, lecture count
  - Expanded view: individual lecture titles with "Watch Now" links
  - Sections like "Syllabus Overview" at the top

- **Right Sidebar** ("What We Offer"):
  - Feature checklist (Quality Education, Top Teachers, Notes & eBooks, Sample Papers, Previous Year Papers, Detailed E-Notes, Exam Preparation Videos)
  - "Grab E-Notes" CTA button
  - Mobile app download badge
  - YouTube channel link

- **Students Also Read** section:
  - Horizontal list of related course recommendations
  - Instructor photo, course title, instructor name, "Full Course" label

### 6.4 Video Player Page
- Embedded video player (full-width or 16:9 ratio)
- Course/chapter navigation sidebar
- Current lecture title and description
- Next/previous lecture buttons
- Progress indicator

### 6.5 Student Features

| Feature | Description |
|---------|-------------|
| **Course Browsing** | Navigate by Board > Class > Stream > Subject hierarchy |
| **Search** | Full-text search across courses, subjects, and instructors |
| **Free Course Access** | Watch all lectures of free courses without payment |
| **Course Purchase** | Buy paid courses via Razorpay/Stripe |
| **Video Playback** | Stream lectures via CloudFront CDN with adaptive quality |
| **Progress Tracking** | Per-lecture and per-course completion tracking |
| **Bookmarks** | Save courses and individual lectures for later |
| **E-Notes Access** | Download PDF notes and e-books (free or paid) |
| **Student Dashboard** | Overview: enrolled courses, progress bars, recent activity |
| **Purchase History** | List of all paid course transactions |
| **Profile Management** | Update name, email, password, avatar |

### 6.6 Instructor Features

| Feature | Description |
|---------|-------------|
| **Course Creation** | Multi-step form: title, description, board, class, stream, subject, pricing |
| **Content Structure** | Organize as: Course > Chapters > Lectures (matching existing hierarchy) |
| **Video Upload** | Direct-to-S3 upload via presigned URLs with progress tracking |
| **Material Upload** | Attach PDFs, E-Notes, sample papers to courses/lectures |
| **Pricing Control** | Set course as Free or Paid, define price, apply discount percentage |
| **Course Analytics** | Views, enrollments, completion rates, revenue per course |
| **Revenue Dashboard** | Total earnings, platform commission breakdown, payout history |
| **Payout Tracking** | View pending/completed payouts (manual initially, automated later) |
| **Course Editor** | Edit published courses, reorder chapters/lectures, replace videos |

### 6.7 Admin Features

| Feature | Description |
|---------|-------------|
| **User Management** | List, search, activate/deactivate students and instructors |
| **Course Moderation** | Review queue for new/updated courses, approve or reject with feedback |
| **Category Management** | CRUD for boards, classes, streams, subjects |
| **Revenue Settings** | Configure platform commission percentage (global and per-instructor) |
| **Platform Analytics** | Dashboard: total users, active users, revenue, top courses, engagement |
| **Payment Management** | View all transactions, process instructor payouts, handle refunds |
| **Content Management** | Manage homepage banners, announcements, FAQ entries, testimonials |
| **System Settings** | Email templates, feature flags, maintenance mode |

---

## 7. Database Schema

### Entity-Relationship Overview

```
users ──────┐
   │        │
   │ (1:N)  │ (1:N)
   ▼        ▼
courses   enrollments
   │        │
   │ (1:N)  │
   ▼        │
chapters    │
   │        │
   │ (1:N)  │
   ▼        │
lectures ◄──┘
   │
   │ (1:N)
   ▼
progress
```

### Table Definitions

#### `users`
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

#### `categories`
```sql
-- Represents: Board, Class, Stream hierarchy
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

#### `courses`
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

    -- Categorization (Board > Class > Stream > Subject)
    board_id        UUID REFERENCES categories(id),
    class_id        UUID REFERENCES categories(id),
    stream_id       UUID REFERENCES categories(id),
    subject_id      UUID REFERENCES categories(id),

    -- Pricing
    is_free         BOOLEAN NOT NULL DEFAULT true,
    price           DECIMAL(10, 2) DEFAULT 0.00,
    discount_pct    INT DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100),

    -- Course meta
    language        VARCHAR(20) NOT NULL DEFAULT 'hindi',
    level           VARCHAR(20) DEFAULT 'beginner',
    syllabus_points TEXT[],                       -- array of "This course covers" bullet points
    tags            TEXT[],
    is_full_course  BOOLEAN NOT NULL DEFAULT false,

    -- Status
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
    rejection_reason TEXT,
    published_at    TIMESTAMPTZ,

    -- Stats (denormalized for read performance)
    total_chapters  INT NOT NULL DEFAULT 0,
    total_lectures  INT NOT NULL DEFAULT 0,
    total_duration  INT NOT NULL DEFAULT 0,       -- total seconds
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

-- Full-text search index
CREATE INDEX idx_courses_search ON courses
    USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
```

#### `chapters`
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

#### `lectures`
```sql
CREATE TABLE lectures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    sort_order      INT NOT NULL DEFAULT 0,

    -- Video
    video_s3_key    TEXT,
    video_url       TEXT,                          -- CloudFront URL (generated)
    duration        INT DEFAULT 0,                 -- seconds
    video_status    VARCHAR(20) DEFAULT 'pending'
                    CHECK (video_status IN ('pending', 'processing', 'ready', 'failed')),

    -- Attachments
    attachments     JSONB DEFAULT '[]',            -- [{name, s3_key, type, size}]

    -- Access
    is_preview      BOOLEAN NOT NULL DEFAULT false, -- free preview even in paid courses
    is_published    BOOLEAN NOT NULL DEFAULT false,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lectures_chapter ON lectures(chapter_id);
CREATE INDEX idx_lectures_course ON lectures(course_id);
```

#### `enrollments`
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

#### `progress`
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

#### `bookmarks`
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

#### `orders`
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
    payment_id          VARCHAR(255),               -- provider's payment ID
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

#### `instructor_earnings`
```sql
CREATE TABLE instructor_earnings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id            UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    order_amount        DECIMAL(10, 2) NOT NULL,
    platform_pct        INT NOT NULL,               -- platform commission %
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
```

#### `revenue_settings`
```sql
CREATE TABLE revenue_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_platform_pct INT NOT NULL DEFAULT 30,   -- default platform takes 30%
    updated_by          UUID REFERENCES users(id),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE instructor_revenue_overrides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id   UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_pct    INT NOT NULL,                    -- custom % for this instructor
    updated_by      UUID REFERENCES users(id),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `homepage_content`
```sql
CREATE TABLE homepage_content (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section     VARCHAR(50) NOT NULL,               -- 'banner', 'announcement', 'feature', 'testimonial', 'faq'
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

#### `refresh_tokens`
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

---

## 8. API Endpoints

### 8.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register new user | Public |
| `POST` | `/api/auth/login` | Login, returns JWT | Public |
| `POST` | `/api/auth/refresh` | Refresh access token | Cookie |
| `POST` | `/api/auth/logout` | Revoke refresh token | Auth |
| `POST` | `/api/auth/forgot-password` | Send reset email | Public |
| `POST` | `/api/auth/reset-password` | Reset with token | Public |
| `GET`  | `/api/auth/verify-email/:token` | Verify email address | Public |
| `GET`  | `/api/auth/me` | Get current user profile | Auth |

#### Example: Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "securePassword123",
  "full_name": "Rahul Sharma",
  "role": "student"
}

Response 201:
{
  "user": { "id": "uuid", "email": "...", "full_name": "...", "role": "student" },
  "access_token": "eyJhbGciOi..."
}
```

### 8.2 Courses (Public)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/courses` | List courses (filterable, paginated) | Public |
| `GET` | `/api/courses/:slug` | Get course detail with chapters | Public |
| `GET` | `/api/courses/:slug/chapters` | List chapters with lecture counts | Public |
| `GET` | `/api/courses/:slug/chapters/:id/lectures` | List lectures in chapter | Public |
| `GET` | `/api/courses/search?q=physics` | Full-text search | Public |
| `GET` | `/api/categories` | List all categories (boards, classes, etc.) | Public |
| `GET` | `/api/categories/:slug/courses` | Courses in a category | Public |

#### Example: List Courses with Filters
```
GET /api/courses?board=cbse&class=12&stream=science&page=1&limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "title": "Class 12th Physics NCERT (Part I Book) CBSE",
      "slug": "class-12-physics-ncert-part-1-cbse",
      "thumbnail_url": "https://cdn.example.com/...",
      "instructor": { "id": "uuid", "full_name": "...", "avatar_url": "..." },
      "is_free": true,
      "is_full_course": true,
      "total_chapters": 8,
      "total_lectures": 180,
      "total_enrollments": 15000
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 11, "total_pages": 1 }
}
```

### 8.3 Student Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/student/enroll/:course_id` | Enroll in free course | Student |
| `GET` | `/api/student/enrollments` | List enrolled courses | Student |
| `GET` | `/api/student/progress/:course_id` | Get course progress | Student |
| `POST` | `/api/student/progress` | Update lecture progress | Student |
| `GET` | `/api/student/bookmarks` | List bookmarks | Student |
| `POST` | `/api/student/bookmarks` | Add bookmark | Student |
| `DELETE` | `/api/student/bookmarks/:id` | Remove bookmark | Student |
| `GET` | `/api/student/dashboard` | Dashboard summary | Student |

#### Example: Update Progress
```
POST /api/student/progress
Authorization: Bearer <token>

{
  "lecture_id": "uuid",
  "course_id": "uuid",
  "watched_seconds": 450,
  "is_completed": true
}
```

### 8.4 Video Streaming

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/lectures/:id/stream` | Get signed CloudFront URL | Auth |
| `GET` | `/api/lectures/:id/attachments/:key` | Get signed S3 download URL | Auth |

#### Example: Get Stream URL
```
GET /api/lectures/uuid/stream
Authorization: Bearer <token>

Response 200:
{
  "stream_url": "https://d1234.cloudfront.net/videos/lecture-uuid.mp4?Policy=...&Signature=...&Key-Pair-Id=...",
  "expires_in": 3600
}
```

### 8.5 Instructor Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/instructor/courses` | List own courses | Instructor |
| `POST` | `/api/instructor/courses` | Create course | Instructor |
| `PUT` | `/api/instructor/courses/:id` | Update course | Instructor |
| `DELETE` | `/api/instructor/courses/:id` | Delete course | Instructor |
| `POST` | `/api/instructor/courses/:id/chapters` | Add chapter | Instructor |
| `PUT` | `/api/instructor/chapters/:id` | Update chapter | Instructor |
| `DELETE` | `/api/instructor/chapters/:id` | Delete chapter | Instructor |
| `POST` | `/api/instructor/chapters/:id/lectures` | Add lecture | Instructor |
| `PUT` | `/api/instructor/lectures/:id` | Update lecture | Instructor |
| `DELETE` | `/api/instructor/lectures/:id` | Delete lecture | Instructor |
| `POST` | `/api/instructor/upload/presign` | Get S3 presigned URL for upload | Instructor |
| `GET` | `/api/instructor/dashboard` | Dashboard summary | Instructor |
| `GET` | `/api/instructor/earnings` | Revenue breakdown | Instructor |
| `GET` | `/api/instructor/analytics` | Performance analytics | Instructor |

#### Example: Create Course
```
POST /api/instructor/courses
Authorization: Bearer <token>

{
  "title": "Class 12th Physics NCERT Part I - CBSE",
  "description": "Complete coverage of NCERT Physics...",
  "board_id": "uuid",
  "class_id": "uuid",
  "stream_id": "uuid",
  "subject_id": "uuid",
  "is_free": true,
  "language": "hindi",
  "syllabus_points": [
    "NCERT Syllabus Based Topic Wise",
    "Explanation",
    "Full Chapter Videos",
    "Quick Revision",
    "Chapter-wise Summary",
    "MCQs"
  ]
}
```

#### Example: Get Presigned Upload URL
```
POST /api/instructor/upload/presign
Authorization: Bearer <token>

{
  "file_name": "lecture-1-intro.mp4",
  "content_type": "video/mp4",
  "file_size": 524288000
}

Response 200:
{
  "upload_url": "https://s3.amazonaws.com/bucket/...",
  "s3_key": "videos/instructor-uuid/course-uuid/lecture-1-intro.mp4",
  "expires_in": 3600
}
```

### 8.6 Payment Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/payments/create-order` | Create payment order | Student |
| `POST` | `/api/payments/verify` | Verify payment and enroll | Student |
| `GET` | `/api/payments/history` | Student purchase history | Student |

#### Example: Create Order (Razorpay)
```
POST /api/payments/create-order
Authorization: Bearer <token>

{
  "course_id": "uuid"
}

Response 200:
{
  "order_id": "order_xxx",
  "amount": 49900,
  "currency": "INR",
  "razorpay_key": "rzp_live_xxx"
}
```

### 8.7 Admin Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/admin/users` | List all users (paginated, filterable) | Admin |
| `PUT` | `/api/admin/users/:id` | Update user (activate/deactivate) | Admin |
| `GET` | `/api/admin/courses` | List all courses with moderation status | Admin |
| `PUT` | `/api/admin/courses/:id/approve` | Approve course | Admin |
| `PUT` | `/api/admin/courses/:id/reject` | Reject course with reason | Admin |
| `GET` | `/api/admin/analytics` | Platform-wide analytics | Admin |
| `GET` | `/api/admin/revenue` | Revenue dashboard | Admin |
| `PUT` | `/api/admin/revenue/settings` | Update revenue share % | Admin |
| `PUT` | `/api/admin/revenue/instructor/:id` | Override instructor % | Admin |
| `GET` | `/api/admin/payouts` | List pending payouts | Admin |
| `POST` | `/api/admin/payouts/:id/process` | Mark payout as processed | Admin |
| `GET` | `/api/admin/categories` | List categories | Admin |
| `POST` | `/api/admin/categories` | Create category | Admin |
| `PUT` | `/api/admin/categories/:id` | Update category | Admin |
| `DELETE`| `/api/admin/categories/:id` | Delete category | Admin |
| `GET` | `/api/admin/homepage` | List homepage content | Admin |
| `POST` | `/api/admin/homepage` | Create homepage section | Admin |
| `PUT` | `/api/admin/homepage/:id` | Update homepage section | Admin |
| `DELETE`| `/api/admin/homepage/:id` | Delete homepage section | Admin |

### 8.8 Public Content

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/homepage` | Get all active homepage content | Public |
| `GET` | `/api/faqs` | Get FAQ entries | Public |
| `GET` | `/api/testimonials` | Get student testimonials | Public |

---

## 9. Folder Structure

### 9.1 Backend (Rust / Axum)

```
backend/
├── Cargo.toml
├── Cargo.lock
├── .env.example
├── Dockerfile
├── migrations/                    # SQLx migrations
│   ├── 001_create_users.sql
│   ├── 002_create_categories.sql
│   ├── 003_create_courses.sql
│   ├── 004_create_chapters.sql
│   ├── 005_create_lectures.sql
│   ├── 006_create_enrollments.sql
│   ├── 007_create_progress.sql
│   ├── 008_create_orders.sql
│   ├── 009_create_earnings.sql
│   ├── 010_create_bookmarks.sql
│   ├── 011_create_homepage.sql
│   └── 012_create_refresh_tokens.sql
├── src/
│   ├── main.rs                    # Entry point: server startup
│   ├── config.rs                  # Env config (dotenv + struct)
│   ├── app.rs                     # Axum router assembly
│   ├── error.rs                   # Unified error type + responses
│   │
│   ├── db/
│   │   ├── mod.rs
│   │   └── pool.rs                # PostgreSQL connection pool setup
│   │
│   ├── models/                    # Database row structs
│   │   ├── mod.rs
│   │   ├── user.rs
│   │   ├── course.rs
│   │   ├── chapter.rs
│   │   ├── lecture.rs
│   │   ├── enrollment.rs
│   │   ├── progress.rs
│   │   ├── order.rs
│   │   ├── earning.rs
│   │   ├── category.rs
│   │   ├── bookmark.rs
│   │   └── homepage.rs
│   │
│   ├── handlers/                  # Request handlers (controllers)
│   │   ├── mod.rs
│   │   ├── auth.rs                # register, login, refresh, logout
│   │   ├── courses.rs             # public course endpoints
│   │   ├── student.rs             # student-specific endpoints
│   │   ├── instructor.rs          # instructor CRUD + analytics
│   │   ├── admin.rs               # admin management endpoints
│   │   ├── payments.rs            # payment creation + verification
│   │   ├── upload.rs              # S3 presigned URL generation
│   │   └── homepage.rs            # public homepage content
│   │
│   ├── services/                  # Business logic layer
│   │   ├── mod.rs
│   │   ├── auth_service.rs
│   │   ├── course_service.rs
│   │   ├── enrollment_service.rs
│   │   ├── payment_service.rs
│   │   ├── revenue_service.rs
│   │   ├── upload_service.rs
│   │   ├── email_service.rs
│   │   └── analytics_service.rs
│   │
│   ├── middleware/
│   │   ├── mod.rs
│   │   ├── auth.rs                # JWT extraction + validation
│   │   ├── role_guard.rs          # RBAC middleware
│   │   └── rate_limit.rs          # Redis-based rate limiting
│   │
│   ├── utils/
│   │   ├── mod.rs
│   │   ├── jwt.rs                 # Token creation + verification
│   │   ├── password.rs            # Argon2 hashing
│   │   ├── s3.rs                  # S3 client + presigned URLs
│   │   ├── cloudfront.rs          # CloudFront signed URL generation
│   │   ├── pagination.rs          # Pagination helpers
│   │   └── validation.rs          # Input validation helpers
│   │
│   └── dto/                       # Request/Response types
│       ├── mod.rs
│       ├── auth_dto.rs
│       ├── course_dto.rs
│       ├── student_dto.rs
│       ├── instructor_dto.rs
│       ├── admin_dto.rs
│       └── payment_dto.rs
│
└── tests/
    ├── common/
    │   └── mod.rs                 # Test helpers, DB setup
    ├── auth_tests.rs
    ├── course_tests.rs
    ├── student_tests.rs
    ├── instructor_tests.rs
    └── payment_tests.rs
```

### 9.2 Frontend (React + Vite + TypeScript)

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.example
├── Dockerfile
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── main.tsx                   # Entry point
│   ├── App.tsx                    # Router setup
│   ├── vite-env.d.ts
│   │
│   ├── api/                       # API client layer
│   │   ├── client.ts              # Axios instance with interceptors
│   │   ├── auth.ts
│   │   ├── courses.ts
│   │   ├── student.ts
│   │   ├── instructor.ts
│   │   ├── admin.ts
│   │   └── payments.ts
│   │
│   ├── store/                     # Zustand stores
│   │   ├── authStore.ts
│   │   ├── courseStore.ts
│   │   └── uiStore.ts
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useCourses.ts
│   │   ├── useProgress.ts
│   │   └── useDebounce.ts
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── category.ts
│   │   └── api.ts
│   │
│   ├── components/                # Reusable UI components
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Top nav with logo, search, auth buttons
│   │   │   ├── Footer.tsx         # Multi-column footer (company, study material, top courses)
│   │   │   ├── Sidebar.tsx        # Category navigation sidebar
│   │   │   ├── AnnouncementBar.tsx # Top announcement strip
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Accordion.tsx      # FAQ + Chapter expandable sections
│   │   │   ├── Badge.tsx          # "FULL COURSE", "FREE", price badges
│   │   │   ├── Pagination.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── course/
│   │   │   ├── CourseCard.tsx      # Grid card with thumbnail, instructor, title, CTA
│   │   │   ├── CourseGrid.tsx      # Responsive course card grid
│   │   │   ├── CourseHeader.tsx    # Dark header section on course detail page
│   │   │   ├── ChapterList.tsx     # Expandable chapter accordion
│   │   │   ├── LectureItem.tsx     # Individual lecture row with "Watch Now"
│   │   │   ├── CourseSidebar.tsx   # "What We Offer" + CTAs sidebar
│   │   │   ├── RelatedCourses.tsx  # "Students Also Read" horizontal list
│   │   │   └── InstructorBadge.tsx # Instructor photo with subject overlay
│   │   │
│   │   ├── home/
│   │   │   ├── HeroBanner.tsx     # Main hero with tagline + student image
│   │   │   ├── CategorySidebar.tsx # Board/class navigation panel
│   │   │   ├── FeatureGrid.tsx    # Platform features icon grid
│   │   │   ├── TestimonialSlider.tsx # Student testimonials carousel
│   │   │   ├── YouTubeChannels.tsx # Channel links section
│   │   │   ├── MobileAppCTA.tsx   # App download section
│   │   │   ├── FAQSection.tsx     # Accordion FAQ
│   │   │   └── PromoModal.tsx     # E-Notes/E-Books popup
│   │   │
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx    # Main video player component
│   │   │   └── PlaylistSidebar.tsx # Lecture navigation during playback
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── DataTable.tsx
│   │   │
│   │   └── forms/
│   │       ├── CourseForm.tsx     # Multi-step course creation/edit form
│   │       ├── ChapterForm.tsx
│   │       ├── LectureForm.tsx
│   │       └── VideoUploader.tsx  # S3 direct upload with progress bar
│   │
│   ├── pages/                     # Route-level page components
│   │   ├── public/
│   │   │   ├── HomePage.tsx
│   │   │   ├── CourseListingPage.tsx
│   │   │   ├── CourseDetailPage.tsx
│   │   │   ├── VideoPlayerPage.tsx
│   │   │   ├── SearchResultsPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── AboutPage.tsx
│   │   │   ├── ContactPage.tsx
│   │   │   └── PrivacyPolicyPage.tsx
│   │   │
│   │   ├── student/
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── MyCoursesPage.tsx
│   │   │   ├── BookmarksPage.tsx
│   │   │   ├── PurchaseHistoryPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   │
│   │   ├── instructor/
│   │   │   ├── InstructorDashboard.tsx
│   │   │   ├── ManageCoursesPage.tsx
│   │   │   ├── CourseEditorPage.tsx
│   │   │   ├── EarningsPage.tsx
│   │   │   └── AnalyticsPage.tsx
│   │   │
│   │   └── admin/
│   │       ├── AdminDashboard.tsx
│   │       ├── UserManagementPage.tsx
│   │       ├── CourseModerationPage.tsx
│   │       ├── CategoryManagementPage.tsx
│   │       ├── RevenueSettingsPage.tsx
│   │       ├── PayoutManagementPage.tsx
│   │       ├── HomepageEditorPage.tsx
│   │       └── PlatformAnalyticsPage.tsx
│   │
│   ├── routes/
│   │   ├── index.tsx              # Route definitions
│   │   ├── ProtectedRoute.tsx     # Auth guard wrapper
│   │   └── RoleRoute.tsx          # Role-based route guard
│   │
│   └── utils/
│       ├── formatters.ts          # Date, currency, duration formatting
│       ├── validators.ts          # Form validation helpers
│       └── constants.ts           # App-wide constants
│
└── tests/
    └── components/
        ├── CourseCard.test.tsx
        └── ChapterList.test.tsx
```

---

## 10. UI/UX Component Structure

### 10.1 Page Layouts (Matching Existing Screenshots)

#### Homepage Layout
```
┌──────────────────────────────────────────────────────┐
│  AnnouncementBar ("Support Our Free School...")       │
├──────────────────────────────────────────────────────┤
│  Header (Logo | Search | View E-Notes | Login)       │
├──────────────────────────────────────────────────────┤
│  HeroBanner                                          │
│  "INDIA'S NO.1 100% Free Online Education Platform"  │
│  [Student Image]                                     │
├──────────────────────────────────────────────────────┤
│  PromoModal (E-Notes & E-Books popup)                │
├──────────────┬───────────────────────────────────────┤
│  Category    │  "Explore Top Courses"                │
│  Sidebar     │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│              │  │Card  │ │Card  │ │Card  │ │Card  ││
│  ○ CBSE EN   │  │Cl.12 │ │Cl.12 │ │Cl.12 │ │Cl.11 ││
│  ○ CBSE HI   │  │Sci   │ │Com   │ │Hum   │ │Sci   ││
│  ○ MP Board  │  └──────┘ └──────┘ └──────┘ └──────┘│
│  ○ UP Board  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  ○ Bihar Bd  │  │Card  │ │Card  │ │Card  │ │Card  ││
│  ○ Sanskrit  │  │Cl.11 │ │Cl.11 │ │Cl.10 │ │Cl.9  ││
│  ○ Vedic Mth │  │Com   │ │Hum   │ │      │ │      ││
│  ○ Olympiad  │  └──────┘ └──────┘ └──────┘ └──────┘│
│  ○ CUET      │  ... more cards                      │
│  ○ IIT-JEE   │                                      │
│  ○ NDA       │                                      │
│  ○ UPSC      │                                      │
│  ○ Bank      │                                      │
│  ○ JAIIB     │                                      │
├──────────────┴───────────────────────────────────────┤
│  YouTubeChannels (English Medium | Hindi Medium)     │
├──────────────────────────────────────────────────────┤
│  FeatureGrid (8 feature icons in 2 rows)             │
├──────────────────────────────────────────────────────┤
│  MobileAppCTA (Download text + phone mockups)        │
├──────────────────────────────────────────────────────┤
│  TestimonialSlider (3 student cards)                 │
├──────────────────────────────────────────────────────┤
│  FAQSection (Accordion - 8 questions)                │
├──────────────────────────────────────────────────────┤
│  Footer (Company | Study Material | Top Courses |    │
│          Brand + Contact + Social)                   │
└──────────────────────────────────────────────────────┘
```

#### Course Listing Layout
```
┌──────────────────────────────────────────────────────┐
│  AnnouncementBar + Header                            │
├──────────────────────────────────────────────────────┤
│  Page Title: "CBSE Class 12th (Science Stream)       │
│               Full Video Course"                     │
│  Subtitle: "High-Quality Education to help..."       │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Instr.   │ │ Instr.   │ │ Instr.   │ │ Instr.   ││
│  │ Photo    │ │ Photo    │ │ Photo    │ │ Photo    ││
│  │┌────────┐│ │┌────────┐│ │┌────────┐│ │┌────────┐││
│  ││PHYSICS ││ ││PHYSICS ││ ││PHYSICS ││ ││CHEMIST.│││
│  │└────────┘│ │└────────┘│ │└────────┘│ │└────────┘││
│  │FULL CRSE │ │FULL CRSE │ │FULL CRSE │ │          ││
│  │Title...  │ │Title...  │ │Title...  │ │Title...  ││
│  │Instr name│ │Instr name│ │Instr name│ │Instr name││
│  │[WATCH]   │ │[WATCH]   │ │[WATCH]   │ │[WATCH]   ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│
│  ... more rows                                       │
├──────────────────────────────────────────────────────┤
│  Footer                                              │
└──────────────────────────────────────────────────────┘
```

#### Course Detail Layout
```
┌──────────────────────────────────────────────────────┐
│  AnnouncementBar + Header                            │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │  DARK HEADER SECTION                           │  │
│  │  Breadcrumb: Home > Class 12 > Physics         │  │
│  │  Course Title                                  │  │
│  │  Instructor Name        ┌──────────────┐       │  │
│  │  This Course Covers:    │ Instr. Photo │       │  │
│  │  ✓ NCERT Syllabus       │ Subject Badge│       │  │
│  │  ✓ Full Chapter Videos  │ "FULL COURSE"│       │  │
│  │  ✓ Quick Revision       └──────────────┘       │  │
│  │  ✓ MCQs                 "Free Course"          │  │
│  └────────────────────────────────────────────────┘  │
├───────────────────────────────┬───────────────────────┤
│  "Watch all Videos"           │ "What We Offer"      │
│                               │ ✓ Quality Education  │
│  ▼ Syllabus Overview  1 Lec  │ ✓ Top Teachers       │
│  ▶ Ch 1: Electric...  39 Lec │ ✓ Notes & eBooks     │
│  ▶ Ch 2: Electrostatic 27 Lc│ ✓ Sample Papers      │
│  ▶ Ch 3: Current...   24 Lec │ ✓ Previous Year Qns  │
│  ▶ Ch 4: Moving...    32 Lec │ ✓ E-Notes            │
│  ▶ Ch 5: Magnetism    22 Lec │ ✓ Exam Prep Videos   │
│  ▶ Ch 6: EMI          19 Lec │                      │
│  ▶ Ch 7: AC           19 Lec │ [Grab E-Notes]       │
│  ▶ Ch 8: EM Waves      9 Lec │ [Google Play]        │
│                               │ [YouTube]            │
├───────────────────────────────┴───────────────────────┤
│  "Students Also Read"                                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Course  │ │ Course  │ │ Course  │ │ Course  │   │
│  │ Card    │ │ Card    │ │ Card    │ │ Card    │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
├──────────────────────────────────────────────────────┤
│  Footer                                              │
└──────────────────────────────────────────────────────┘
```

### 10.2 Design System Tokens

```
Colors (derived from screenshots):
  Primary Orange:  #FF6B35 (CTAs, "Watch Now" buttons, badges)
  Dark Navy:       #1A1A2E (course header background, footer background)
  Text Dark:       #333333 (body text)
  Text Gray:       #666666 (secondary text)
  White:           #FFFFFF (card backgrounds)
  Light Gray:      #F5F5F5 (page backgrounds)
  Green Accent:    #4CAF50 (Magnet Brains logo green)
  Red Accent:      #FF4444 (sale badges, "INDIA'S NO.1" text)
  Blue Accent:     #2196F3 (links, category icons)

Typography:
  Headings: Inter or Poppins, 600-700 weight
  Body: Inter, 400 weight
  Font sizes: 14px (body), 16px (large body), 24px (h3), 32px (h2), 48px (h1)

Spacing:
  Card padding: 16px
  Section padding: 48px vertical
  Grid gap: 24px
  Container max-width: 1200px

Border Radius:
  Cards: 8px
  Buttons: 6px
  Badges: 4px
  Avatars: 50% (circular)
```

---

## 11. Video System & CDN

### Upload Flow (Instructor)

```
Instructor                    Frontend                     Backend                      S3
    │                            │                            │                          │
    │  Select video file         │                            │                          │
    ├───────────────────────────▶│                            │                          │
    │                            │  POST /upload/presign      │                          │
    │                            ├───────────────────────────▶│                          │
    │                            │  {upload_url, s3_key}      │                          │
    │                            │◀───────────────────────────┤                          │
    │                            │                            │                          │
    │                            │  PUT (direct upload to S3) │                          │
    │                            ├────────────────────────────┼─────────────────────────▶│
    │  Progress bar updates      │                            │                          │
    │◀───────────────────────────┤                            │                          │
    │                            │  POST /lectures (s3_key)   │                          │
    │                            ├───────────────────────────▶│  Verify upload exists    │
    │                            │                            ├─────────────────────────▶│
    │                            │  201 Created               │                          │
    │                            │◀───────────────────────────┤                          │
```

### Playback Flow (Student)

```
Student                       Frontend                     Backend                  CloudFront
    │                            │                            │                          │
    │  Click "Watch Now"         │                            │                          │
    ├───────────────────────────▶│                            │                          │
    │                            │  GET /lectures/:id/stream  │                          │
    │                            ├───────────────────────────▶│                          │
    │                            │                            │  Generate signed URL     │
    │                            │  {signed_stream_url}       │                          │
    │                            │◀───────────────────────────┤                          │
    │                            │                            │                          │
    │  Video player loads URL    │  GET video (signed URL)    │                          │
    │◀───────────────────────────┼────────────────────────────┼─────────────────────────▶│
    │  Streams video             │                            │     Serves from edge     │
    │◀───────────────────────────┼────────────────────────────┼──────────────────────────┤
```

### CloudFront Signed URL Configuration

```rust
// Simplified CloudFront signed URL generation
fn generate_signed_url(s3_key: &str, expires_minutes: u64) -> String {
    let resource = format!("https://{}/{}", CLOUDFRONT_DOMAIN, s3_key);
    let expires = Utc::now() + Duration::minutes(expires_minutes as i64);

    // Use CloudFront key pair for signing
    CloudFrontSigner::new(KEY_PAIR_ID, PRIVATE_KEY)
        .sign(&resource, expires)
}
```

### S3 Bucket Structure

```
s3://magnetbrains-media/
├── videos/
│   └── {instructor_uuid}/
│       └── {course_uuid}/
│           └── {lecture_uuid}.mp4
├── thumbnails/
│   └── courses/
│       └── {course_uuid}.jpg
├── avatars/
│   └── {user_uuid}.jpg
├── materials/
│   └── {course_uuid}/
│       ├── notes/
│       │   └── chapter-1-notes.pdf
│       └── papers/
│           └── sample-paper-2025.pdf
└── homepage/
    ├── banners/
    └── testimonials/
```

### S3 Bucket Policy (Key Points)
- **Private bucket** - no public access
- CloudFront Origin Access Identity (OAI) for read access
- Presigned URLs for instructor uploads (PUT, 1-hour expiry)
- Lifecycle policy: move incomplete multipart uploads to abort after 24h
- Versioning enabled for video files

---

## 12. Payment Integration

### Razorpay Flow (Primary - India)

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Student  │   │ Frontend │   │ Backend  │   │ Razorpay │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │ Buy Course    │              │              │
     ├──────────────▶│              │              │
     │               │ POST /create │              │
     │               ├─────────────▶│              │
     │               │              │ Create Order │
     │               │              ├─────────────▶│
     │               │              │  order_id    │
     │               │              │◀─────────────┤
     │               │  order_id    │              │
     │               │◀─────────────┤              │
     │               │              │              │
     │  Razorpay     │              │              │
     │  Checkout UI  │              │              │
     │◀──────────────┤              │              │
     │               │              │              │
     │  Payment Done │              │              │
     ├──────────────▶│              │              │
     │               │ POST /verify │              │
     │               ├─────────────▶│              │
     │               │              │ Verify Sig.  │
     │               │              ├─────────────▶│
     │               │              │  Confirmed   │
     │               │              │◀─────────────┤
     │               │              │              │
     │               │              │ Create Order │
     │               │              │ Create Enroll│
     │               │              │ Calc Revenue │
     │               │   Success    │              │
     │               │◀─────────────┤              │
     │  Enrolled!    │              │              │
     │◀──────────────┤              │              │
```

### Revenue Calculation on Purchase

```
Order Amount: ₹499
Platform Commission: 30% (configurable per instructor)
Platform Share: ₹149.70
Instructor Share: ₹349.30

→ Record in instructor_earnings table
→ Accumulate until payout threshold (e.g., ₹1000)
→ Admin processes payout manually (Phase 1)
```

### Webhook Handling
- Register Razorpay webhook endpoint: `POST /api/webhooks/razorpay`
- Verify webhook signature using Razorpay secret
- Handle events: `payment.captured`, `payment.failed`, `refund.created`
- Idempotent processing using payment_id

---

## 13. Performance & Scalability

### Frontend Optimizations
- **Code Splitting:** React.lazy() for route-level splitting (each page loaded on demand)
- **Lazy Loading:** Images loaded with `loading="lazy"`, IntersectionObserver for below-fold content
- **Asset Optimization:** Vite build with tree-shaking, minification, Brotli compression
- **Caching:** Service worker for static assets, SWR/React Query for API data caching
- **CDN Delivery:** Frontend assets served from Vercel/Netlify edge network

### Backend Optimizations
- **Connection Pooling:** SQLx with configurable pool size (min 5, max 20 connections)
- **Redis Caching:** Cache hot data (course listings, categories, homepage content) with TTL
- **Pagination:** Cursor-based pagination for large datasets, limit/offset for simpler queries
- **Database Indexes:** Covering indexes on all query patterns (see schema above)
- **Async I/O:** Tokio runtime for non-blocking I/O across all request handling
- **Response Compression:** Tower middleware for gzip/brotli response compression

### Database Optimizations
- **Read Replicas:** Use RDS read replica for analytics and heavy read queries
- **Denormalized Counts:** `total_chapters`, `total_lectures`, `total_enrollments` on courses table (updated via triggers/application logic) to avoid expensive JOINs on listing pages
- **Full-Text Search:** PostgreSQL GIN index for course search (upgrade to Meilisearch for advanced search later)
- **Partitioning:** Consider partitioning `progress` and `orders` tables by date when they grow large

### Video Delivery Optimizations
- **CloudFront Edge Caching:** Videos cached at 400+ edge locations globally
- **Cache Policy:** Long TTL (24h+) for video assets, short TTL for signed URLs
- **Origin Shield:** Enable CloudFront Origin Shield to reduce S3 origin load

### Scalability Path
```
Phase 1 (MVP):     Single Axum server + RDS + S3/CloudFront
Phase 2 (Growth):  Multiple Axum instances behind ALB + RDS read replica
Phase 3 (Scale):   Kubernetes/ECS + Redis cluster + Meilisearch + CDN optimization
```

---

## 14. Security Best Practices

### Authentication & Tokens
- Passwords hashed with Argon2id (memory: 64MB, iterations: 3, parallelism: 4)
- JWT signed with RS256 (asymmetric keys) — public key distributed, private key secured
- Access tokens: 15-minute expiry, no storage (memory only)
- Refresh tokens: HTTP-only, Secure, SameSite=Strict cookies
- Token rotation on every refresh (old refresh token invalidated)
- Rate limiting on auth endpoints: 5 attempts per minute per IP

### API Security
- All endpoints require HTTPS (TLS 1.2+)
- CORS: Whitelist only the frontend domain
- Input validation on all endpoints (request body, query params, path params)
- SQL injection prevention: parameterized queries via SQLx (compile-time checked)
- Request size limits: 10MB for API calls, 5GB for video uploads (S3 direct)
- Rate limiting: Redis-based, per-user and per-IP

### Media Security
- S3 bucket: private, no public access
- Video access: CloudFront signed URLs with 1-hour expiry
- PDF downloads: S3 presigned URLs with 15-minute expiry
- CloudFront: restrict viewer access using signed URLs or signed cookies
- Referrer checking on CloudFront distribution

### Data Protection
- Environment variables for all secrets (DB credentials, JWT keys, S3 keys, payment secrets)
- No secrets in code or version control — use `.env` locally, AWS Secrets Manager in production
- User data encryption at rest (RDS encryption enabled)
- PII handling: minimize storage, provide data export/deletion capability (GDPR-ready)
- Payment data: never store card details — handled entirely by Razorpay/Stripe

### Headers & Middleware
```rust
// Security headers applied to all responses
SecurityHeaders {
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    X-XSS-Protection: 1; mode=block
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    Content-Security-Policy: default-src 'self'; ...
    Referrer-Policy: strict-origin-when-cross-origin
}
```

---

## 15. Deployment Guide

### Infrastructure Overview

```
┌──────────────────── AWS Cloud ────────────────────────┐
│                                                       │
│   ┌────────────┐     ┌────────────┐                   │
│   │  Vercel    │     │ CloudFront │                   │
│   │ (Frontend) │     │   (CDN)    │                   │
│   └─────┬──────┘     └─────┬──────┘                   │
│         │                  │                          │
│         │            ┌─────┴──────┐                   │
│         │            │  S3 Bucket │                   │
│         │            │  (Media)   │                   │
│         │            └────────────┘                   │
│         │                                             │
│   ┌─────▼──────────────┐                              │
│   │  ALB (Load Balancer)│                             │
│   └─────┬──────────────┘                              │
│         │                                             │
│   ┌─────▼──────┐  ┌───────────┐  ┌─────────────┐     │
│   │ EC2 / ECS  │  │ RDS       │  │ ElastiCache │     │
│   │ (Axum API) │  │ (Postgres)│  │ (Redis)     │     │
│   └────────────┘  └───────────┘  └─────────────┘     │
│                                                       │
│   ┌────────────┐  ┌���──────────┐                       │
│   │ SES        │  │ Secrets   │                       │
│   │ (Email)    │  │ Manager   │                       │
│   └────────────┘  └───────────┘                       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Deployment Configurations

#### Frontend (Vercel)
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

#### Backend (Docker)
```dockerfile
# Multi-stage Rust build
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

#### Docker Compose (Development)
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgres://mb:password@db:5432/magnetbrains
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=dev-secret-key
      - AWS_REGION=ap-south-1
    depends_on:
      - db
      - redis

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

### Environment Variables

```bash
# .env.example

# Server
HOST=0.0.0.0
PORT=8080
RUST_LOG=info

# Database
DATABASE_URL=postgres://user:password@localhost:5432/magnetbrains
DATABASE_MAX_CONNECTIONS=20

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY=900          # 15 minutes
JWT_REFRESH_EXPIRY=604800      # 7 days

# AWS
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=magnetbrains-media
CLOUDFRONT_DOMAIN=d1234567.cloudfront.net
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY_PATH=./keys/cloudfront-private.pem

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Email (SES)
SES_FROM_EMAIL=noreply@magnetbrains.com

# Frontend
FRONTEND_URL=https://magnetbrains.com
```

---

## 16. Setup Instructions

### Prerequisites
- Rust 1.77+ (`rustup` installed)
- Node.js 20+ and npm
- PostgreSQL 16
- Redis 7
- AWS account with S3, CloudFront, SES configured
- Docker & Docker Compose (for local dev)

### Quick Start (Development)

#### 1. Clone and Setup
```bash
git clone https://github.com/your-org/magnetbrains.git
cd magnetbrains
```

#### 2. Start Infrastructure
```bash
docker-compose up -d db redis
```

#### 3. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your local values

# Install SQLx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Run migrations
sqlx database create
sqlx migrate run

# Start dev server
cargo run
# API available at http://localhost:8080
```

#### 4. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8080

npm install
npm run dev
# App available at http://localhost:5173
```

#### 5. Generate JWT Keys
```bash
mkdir -p backend/keys
openssl genpkey -algorithm RSA -out backend/keys/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in backend/keys/private.pem -out backend/keys/public.pem
```

### Production Deployment

#### 1. Build Frontend
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel: vercel --prod
```

#### 2. Build & Deploy Backend
```bash
cd backend
docker build -t magnetbrains-api:latest .
# Push to ECR and deploy to ECS/EC2
```

#### 3. Database
- Create RDS PostgreSQL instance (db.t3.medium minimum)
- Run migrations: `sqlx migrate run`
- Enable automated backups

#### 4. S3 + CloudFront
- Create S3 bucket with private access
- Create CloudFront distribution pointing to S3
- Configure Origin Access Identity
- Generate CloudFront key pair for signed URLs

#### 5. DNS & SSL
- Point domain to Vercel (frontend) and ALB (API)
- SSL certificates via ACM (AWS Certificate Manager)

---

## Appendix: MVP Priority Order

For a phased rollout, implement in this order:

| Phase | Features | Timeline |
|-------|----------|----------|
| **Phase 1** | Auth, course browsing, category navigation, video playback (free courses), course detail pages, homepage | Core MVP |
| **Phase 2** | Student dashboard, progress tracking, bookmarks, search, instructor course creation | User engagement |
| **Phase 3** | Payment integration, paid courses, order management, enrollment on purchase | Monetization |
| **Phase 4** | Instructor dashboard, analytics, revenue tracking, payout management | Instructor tools |
| **Phase 5** | Admin panel, course moderation, platform analytics, homepage CMS | Administration |
| **Phase 6** | Performance optimization, CDN tuning, mobile responsiveness polish, SEO | Polish & scale |

---

*Generated for the Magnet Brains e-learning platform migration project.*
*Architecture designed for MVP-first development with clear scalability path.*
