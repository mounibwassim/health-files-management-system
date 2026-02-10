-- Migration: Add user_id and manager_id to records table
ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE records ADD COLUMN IF NOT EXISTS manager_id INTEGER REFERENCES users(id);

-- Optional: Backfill manager_id for existing records (if any) based on current user hierarchy
-- UPDATE records r SET manager_id = u.manager_id FROM users u WHERE r.user_id = u.id;
