const pool = require('../db');

async function checkOrphans() {
    try {
        const res = await pool.query('SELECT count(*) FROM records WHERE user_id IS NULL');
        console.log(`Records with NULL user_id: ${res.rows[0].count}`);

        const users = await pool.query('SELECT id, username, role FROM users');
        console.table(users.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
checkOrphans();
