-- Seed admin user
-- Password: admin123 (you MUST replace this hash after running the app once)
-- Generate a proper hash by registering through the API, then copy the hash here
INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
VALUES (
  'admin@magnetbrains.com',
  '$argon2id$v=19$m=19456,t=2,p=1$placeholder_replace_after_first_run',
  'Platform Admin',
  'admin',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Seed a test instructor
INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
VALUES (
  'instructor@magnetbrains.com',
  '$argon2id$v=19$m=19456,t=2,p=1$placeholder_replace_after_first_run',
  'Test Instructor',
  'instructor',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Seed a test student
INSERT INTO users (email, password_hash, full_name, role, is_active, email_verified)
VALUES (
  'student@magnetbrains.com',
  '$argon2id$v=19$m=19456,t=2,p=1$placeholder_replace_after_first_run',
  'Test Student',
  'student',
  true,
  true
) ON CONFLICT (email) DO NOTHING;
