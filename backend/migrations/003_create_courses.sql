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
