const pool = require('../db');
const bcrypt = require('bcrypt');

const fix = async () => {
    try {
        console.log("🛠️ Applying Final Schema & User Fixes...");

        // 0. Ensure Users table
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) DEFAULT 'user',
                    visible_password VARCHAR(255),
                    email VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP WITH TIME ZONE
                );
            `);
            console.log("✅ Verified 'users' table");
        } catch (e) {
            console.error("Users table warning:", e.message);
        }

        // 1. Add missing 'result_amount' column
        try {
            await pool.query("ALTER TABLE records ADD COLUMN IF NOT EXISTS result_amount DECIMAL(15, 2) DEFAULT 0");
            console.log("✅ Added 'result_amount' column");
        } catch (e) {
            console.error("Columns warning:", e.message);
        }

        // 2. Ensure Users Exist
        const salt = await bcrypt.genSalt(10);

        // Mounib (Admin)
        const adminPass = await bcrypt.hash('admin123', salt);
        try {
            await pool.query(`
                INSERT INTO users (username, password_hash, role, visible_password)
                VALUES ('mounib', $1, 'admin', 'admin123')
            `, [adminPass]);
            console.log("✅ User 'mounib' created as Admin");
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                await pool.query("UPDATE users SET role = 'admin', visible_password = 'admin123' WHERE username = 'mounib'");
                console.log("✅ User 'mounib' updated to Admin");
            } else {
                console.error("Failed to upsert mounib:", err.message);
            }
        }

        // Abdelkarim (Employee)
        const empPass = await bcrypt.hash('123456', salt);
        try {
            await pool.query(`
                INSERT INTO users (username, password_hash, role, visible_password)
                VALUES ('Abdelkarim', $1, 'user', '123456')
            `, [empPass]);
            console.log("✅ User 'Abdelkarim' created as Employee");
        } catch (err) {
            if (err.code === '23505') {
                await pool.query("UPDATE users SET role = 'user', visible_password = '123456' WHERE username = 'Abdelkarim'");
                console.log("✅ User 'Abdelkarim' updated to Employee");
            } else {
                console.error("Failed to upsert Abdelkarim:", err.message);
            }
        }

        console.log("🎉 Fixes Applied!");
        process.exit(0);

    } catch (err) {
        console.error("❌ Fix Failed:", err);
        process.exit(1);
    }
};

fix();
