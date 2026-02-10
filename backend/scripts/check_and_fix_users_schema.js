const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);

        const columns = res.rows.map(r => r.column_name);
        console.log("Current Columns:", columns);

        if (!columns.includes('manager_id')) {
            console.log("Adding manager_id...");
            await pool.query('ALTER TABLE users ADD COLUMN manager_id INTEGER REFERENCES users(id)');
        } else {
            console.log("manager_id exists.");
        }

        if (!columns.includes('last_login')) {
            console.log("Adding last_login...");
            await pool.query('ALTER TABLE users ADD COLUMN last_login TIMESTAMP');
        } else {
            console.log("last_login exists.");
        }

        if (!columns.includes('role')) {
            console.log("Adding role...");
            await pool.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'");
        } else {
            console.log("role exists.");
        }

        console.log("Done.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
