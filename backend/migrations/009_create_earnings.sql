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
