const pool = require('./db');

async function listFiles() {
    try {
        const res = await pool.query("SELECT * FROM file_types");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
listFiles();
