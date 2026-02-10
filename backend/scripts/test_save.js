const axios = require('axios');
const pool = require('../db');
const jwt = require('jsonwebtoken');

// Mock a JWT for Abdelkarim (User)
const test = async () => {
    try {
        console.log("🧪 Testing Record Creation...");

        // 1. Get User ID
        const userRes = await pool.query("SELECT * FROM users WHERE username = 'Abdelkarim'");
        const user = userRes.rows[0];
        if (!user) throw new Error("User Abdelkarim not found");

        // 2. Mock Token
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, 'supersecretkey123');

        // 3. Get Valid State and File Type
        const stateRes = await pool.query("SELECT * FROM states LIMIT 1");
        const typeRes = await pool.query("SELECT * FROM file_types LIMIT 1");

        const payload = {
            stateId: stateRes.rows[0].id, // Sending ID directly? Or name? Frontend probably sends ID.
            fileTypeId: typeRes.rows[0].id,
            employeeName: "Test Record",
            postalAccount: "12345",
            amount: 1000,
            treatmentDate: new Date().toISOString(),
            notes: "Debug Test",
            status: "completed"
        };

        console.log("Payload:", payload);

        // 4. Send Request (Localhost)
        const res = await axios.post('http://localhost:5000/api/records', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("✅ Record Created:", res.data);

    } catch (err) {
        console.error("❌ Failed:", err.response?.data || err.message);
    } finally {
        process.exit();
    }
};

test();
