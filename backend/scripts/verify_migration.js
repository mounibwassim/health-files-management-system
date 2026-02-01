const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('Verifying States...');
        const result = await client.query('SELECT * FROM states WHERE code IN (16, 161, 162, 163) ORDER BY code');
        console.table(result.rows);

        const count16 = result.rows.find(r => r.code === 16);
        const countNew = result.rows.filter(r => [161, 162, 163].includes(r.code)).length;

        if (!count16 && countNew === 3) {
            console.log('SUCCESS: Algiers (16) removed and new zones (161, 162, 163) added.');
        } else {
            console.error('FAILURE: Migration verification failed.');
        }

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
