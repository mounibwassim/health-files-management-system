-- 1. Remove Manager Columns (Cleanup)
ALTER TABLE users DROP COLUMN IF EXISTS manager_id;
ALTER TABLE records DROP COLUMN IF EXISTS manager_id;

-- 2. Ensure User Link Exists (Crucial for Ownership)
ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- 3. Optional: Verify Admin Role Exists (Safety)
-- UPDATE users SET role = 'admin' WHERE username = 'admin';
