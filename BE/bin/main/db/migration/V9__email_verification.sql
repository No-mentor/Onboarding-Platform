-- Email verification support
-- Adds email_verified flag to users and a separate table for verification codes.

ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE email_verification_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users (id),
    email           VARCHAR(320) NOT NULL,
    code            VARCHAR(6) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    attempts        INT NOT NULL DEFAULT 0,
    last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_codes_email ON email_verification_codes (email);
CREATE INDEX idx_verification_codes_user  ON email_verification_codes (user_id);
