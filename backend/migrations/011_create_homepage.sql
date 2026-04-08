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
