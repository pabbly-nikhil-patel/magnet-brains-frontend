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
