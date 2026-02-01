const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load .env from backend root

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');
        // Path to SQL file relative to backend/scripts
        const sqlPath = path.join(__dirname, '../../deployment/refactor_algiers.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing SQL:');
        console.log(sql);

        await client.query(sql);

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
