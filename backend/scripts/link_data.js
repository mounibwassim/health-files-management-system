const pool = require('../db');

const link = async () => {
    try {
        console.log("🔗 Linking orphan records to Abdelkarim...");

        // 1. Get Abdelkarim's ID
        const userRes = await pool.query("SELECT id FROM users WHERE username = 'Abdelkarim'");
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.error("❌ User 'Abdelkarim' not found!");
            process.exit(1);
        }

        // 2. Update NULL user_id records
        const updateRes = await pool.query(`
            UPDATE records 
            SET user_id = $1 
            WHERE user_id IS NULL
        `, [userId]);

        console.log(`✅ Linked ${updateRes.rowCount} orphan records to Abdelkarim (ID: ${userId})`);

        // 3. Verify counts
        const countRes = await pool.query("SELECT COUNT(*) FROM records WHERE user_id = $1", [userId]);
        console.log(`📊 Abdelkarim now has ${countRes.rows[0].count} records.`);

        process.exit(0);

    } catch (err) {
        console.error("❌ Link Failed:", err);
        process.exit(1);
    }
};

link();
