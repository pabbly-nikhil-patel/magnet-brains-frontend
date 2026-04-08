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
