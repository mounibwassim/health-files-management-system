-- Backfill NULL user_id with the first Admin ID
DO $$
DECLARE
    admin_id INTEGER;
BEGIN
    -- 1. Find the first admin
    SELECT id INTO admin_id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1;

    IF admin_id IS NOT NULL THEN
        -- 2. Update orphaned records
        UPDATE records 
        SET user_id = admin_id 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Assigned orphaned records to Admin ID %', admin_id;
    ELSE
        RAISE NOTICE 'No Admin found to assign records to.';
    END IF;
END $$;
