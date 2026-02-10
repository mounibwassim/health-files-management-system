
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const targetUser = 'Abdelkarim'; // Adjust casing if needed
        const newPass = 'malaysia2023';

        console.log(`Updating password for ${targetUser}...`);

        // 1. Hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPass, salt);

        // 2. Update
        // We use ILIKE to find the user regardless of case
        const res = await pool.query(`
            UPDATE users 
            SET password_hash = $1, visible_password = $2 
            WHERE username ILIKE $3
            RETURNING id, username
        `, [hash, newPass, targetUser]);

        if (res.rowCount === 0) {
            console.error(`User '${targetUser}' not found!`);
        } else {
            console.log(`✅ Success! Updated ${res.rows[0].username} (ID: ${res.rows[0].id})`);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

run();
