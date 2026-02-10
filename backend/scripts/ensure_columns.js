const pool = require('../db');

async function runAudit() {
    try {
        console.log("--- Checking Database Schema ---");
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Records User ID
            await client.query(`
                ALTER TABLE records 
                ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
            `);
            console.log("✅ Checked: user_id column");

            // 2. Reimbursement
            await client.query(`
                ALTER TABLE records 
                ADD COLUMN IF NOT EXISTS reimbursement_amount NUMERIC DEFAULT 0;
            `);
            console.log("✅ Checked: reimbursement_amount column");

            // 3. Serial Number
            await client.query(`
                ALTER TABLE records 
                ADD COLUMN IF NOT EXISTS serial_number INTEGER;
            `);
            console.log("✅ Checked: serial_number column");

            await client.query('COMMIT');
            console.log("Schema Augmented Successfully.");

        } catch (err) {
            await client.query('ROLLBACK');
            console.error("Migration Failed", err);
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("Connection Error", err);
    } finally {
        pool.end();
    }
}

runAudit();
