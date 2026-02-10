
const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const API_URL = 'http://localhost:5000/api';
const ADMIN_USER = 'test_admin_' + Date.now(); // We need an admin to check admin routes
const PASSWORD = 'password123';

async function run() {
    console.log("--- VERIFY ADMIN FEATURES START ---");

    // 1. Create a dummy admin via direct DB insert (since we can't register as admin easily without token)
    // Actually, we can use the 'register' endpoint and then update role in DB for testing?
    // Or just use an existing admin? The user "Abdelkarim" is likely an employee or manager.
    // Let's create a temp admin in DB.

    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    let adminToken;

    try {
        console.log("1. Creating Temp Admin...");
        const hash = '$2b$10$abcdefg...'; // Dummy hash, we won't login via DB, we'll just insert a token? No, need to login to get token.
        // Let's register normally then upgrade.
        try {
            await axios.post(`${API_URL}/register`, { username: ADMIN_USER, password: PASSWORD });
        } catch (e) { } // Ignore if exists

        // Upgrade to admin
        await pool.query("UPDATE users SET role = 'admin' WHERE username = $1", [ADMIN_USER]);

        // Login
        const loginRes = await axios.post(`${API_URL}/login`, { username: ADMIN_USER, password: PASSWORD });
        adminToken = loginRes.data.token;
        console.log("   Admin Logged In.");

        // 2. Add a record for a user to test counts
        // Let's use the current admin user to add a record.
        const recordRes = await axios.post(`${API_URL}/records`, {
            stateId: '1', fileType: 'surgery', employeeName: 'Test Count', postalAccount: '111', amount: 100, treatmentDate: '2023-01-01'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        console.log("   Added 1 Record.");

        // 3. Fetch Admin Users List
        console.log("\n2. Fetching Admin Users List...");
        const listRes = await axios.get(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } });
        const users = listRes.data;

        // CHECK 1: Record Count
        const myUser = users.find(u => u.username === ADMIN_USER);
        if (myUser && parseInt(myUser.records_count) >= 1) {
            console.log(`   ✅ Record Count Valid: ${myUser.username} has ${myUser.records_count} records.`);
        } else {
            console.error(`   ❌ Record Count FAILED: ${myUser?.username} has ${myUser?.records_count}`);
        }

        // CHECK 2: Password Visibility (Abdelkarim)
        const abdel = users.find(u => u.username.toLowerCase() === 'abdelkarim');
        if (abdel) {
            if (abdel.visible_password === 'malaysia2023') {
                console.log(`   ✅ Password Visibility Valid: Abdelkarim has correct visible_password.`);
            } else {
                console.error(`   ❌ Password Visibility FAILED: Abdelkarim has '${abdel.visible_password}'`);
            }
        } else {
            console.log("   ⚠️ User Abdelkarim not found (Verification Script)");
        }

        // CHECK 3: Last Activity (Last Login)
        // Since we just logged in, last_login should be recent.
        const loginTime = new Date(myUser.last_login).getTime();
        const now = Date.now();
        if (now - loginTime < 60000) { // Within 1 minute
            console.log(`   ✅ Last Activity Valid: Recent login detected (${myUser.last_login}).`);
        } else {
            console.log(`   ⚠️ Last Activity: ${myUser.last_login} (Diff: ${now - loginTime}ms)`);
        }

    } catch (err) {
        console.error("VERIFICATION FAILED:", err.response?.data || err.message);
    } finally {
        // Cleanup Admin
        if (adminToken) {
            await axios.delete(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${adminToken}` } });
            console.log("   Temp Admin Deleted.");
        }
        pool.end();
    }
}

run();
