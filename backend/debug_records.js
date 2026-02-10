const pool = require('./db');

async function debugRecords() {
    try {
        console.log("--- DEBUG RECORDS ---");

        // 1. Count Total Records
        const countRes = await pool.query('SELECT count(*) FROM records');
        console.log(`Total Records: ${countRes.rows[0].count}`);

        // 2. Dump Top 10 Records with key columns
        console.log("\n--- Top 10 Records (ID, State, FileType, UserID, Serial) ---");
        const res = await pool.query(`
            SELECT r.id, r.state_id, f.name as file_type, r.user_id, u.username, r.serial_number 
            FROM records r
            LEFT JOIN file_types f ON r.file_type_id = f.id
            LEFT JOIN users u ON r.user_id = u.id
            LIMIT 10
        `);
        console.table(res.rows);

        // 3. Check for NULL user_id
        const nullUserRes = await pool.query('SELECT count(*) FROM records WHERE user_id IS NULL');
        console.log(`\nRecords with NULL user_id: ${nullUserRes.rows[0].count}`);

        // 4. Check File Types
        console.log("\n--- File Types ---");
        const files = await pool.query('SELECT * FROM file_types');
        console.table(files.rows);

    } catch (err) {
        console.error("Debug Error:", err);
    } finally {
        pool.end();
    }
}

debugRecords();
