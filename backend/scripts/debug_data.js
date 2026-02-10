const pool = require('../db');

const debug = async () => {
    try {
        console.log("🔍 Debugging Data...");

        // 1. Users
        const users = await pool.query("SELECT id, username, role, visible_password FROM users");
        console.table(users.rows);

        // 2. Records Grouped by User
        const records = await pool.query("SELECT user_id, COUNT(*) as count FROM records GROUP BY user_id");
        console.table(records.rows);

        // 3. Check for NULL user_id
        const nulls = await pool.query("SELECT COUNT(*) as null_user_records FROM records WHERE user_id IS NULL");
        console.log("Orphan records (user_id IS NULL):", nulls.rows[0].null_user_records);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
