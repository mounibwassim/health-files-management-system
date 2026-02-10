const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Fix for self-signed certs in some envs
    }
});

console.log(`[DB] Attempting connection to: ${process.env.DATABASE_URL ? 'Remote URL' : 'Localhost'}`);

// Ensure we are handling the 'error' event on the pool so the app doesn't crash if the database blinks
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};
