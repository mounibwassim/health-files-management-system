const pool = require('../db');

const fix = async () => {
    try {
        console.log("🛠️ Adding missing columns...");

        // 1. Add visible_password
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS visible_password VARCHAR(255)");
        console.log("✅ Added 'visible_password' column");

        // 2. Set default values for existing users (so they aren't null)
        await pool.query("UPDATE users SET visible_password = 'changed_later' WHERE visible_password IS NULL");
        console.log("✅ Populated default passwords");

        // 3. Update specific known users if needed
        await pool.query("UPDATE users SET visible_password = 'admin123' WHERE username = 'mounib'");
        await pool.query("UPDATE users SET visible_password = '123456' WHERE username = 'Abdelkarim'");
        console.log("✅ Updated specific user passwords");

        process.exit(0);

    } catch (err) {
        console.error("❌ Fix Failed:", err);
        process.exit(1);
    }
};

fix();
