const pool = require('../db');
const fs = require('fs');
const path = require('path');

const runBackfill = async () => {
    try {
        console.log("🚨 STARTING USER ID BACKFILL...");

        const sqlPath = path.join(__dirname, '../../deployment/backfill_user_ids.sql');
        console.log(`Reading SQL from: ${sqlPath}`);

        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log("Executing SQL...");
        await pool.query(sql);

        console.log("✅ Backfill Complete.");
        process.exit(0);

    } catch (err) {
        console.error("❌ Backfill Failed:", err);
        process.exit(1);
    }
};

runBackfill();
