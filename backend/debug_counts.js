const pool = require('./db');

async function debugCounts() {
    try {
        console.log("--- DEBUG START ---");

        // 1. Check States
        console.log("\n1. States matching '2':");
        const stateRes = await pool.query("SELECT * FROM states WHERE code = '2' OR code = '02'");
        console.table(stateRes.rows);

        if (stateRes.rows.length === 0) {
            console.log("❌ No state found for code '2' or '02'");
            return;
        }
        const stateId = stateRes.rows[0].id; // Assumption: Use the first one found (likely '2')

        // 2. Check File Types
        console.log("\n2. File Types:");
        const filesRes = await pool.query("SELECT * FROM file_types");
        console.table(filesRes.rows);

        // 3. Check Records for this State
        console.log(`\n3. Records for State ID ${stateId}:`);
        const recordsRes = await pool.query("SELECT id, state_id, file_type_id, user_id, serial_number FROM records WHERE state_id = $1", [stateId]);
        console.table(recordsRes.rows);

        // 4. Run the EXACT Count Query being used
        console.log("\n4. Running Count Query (Admin Role):");
        const query = `
            SELECT f.name, COUNT(r.id) as count 
            FROM file_types f
            LEFT JOIN records r ON f.id = r.file_type_id AND r.state_id = $1
            GROUP BY f.name
        `;
        const countRes = await pool.query(query, [stateId]);
        console.table(countRes.rows);

        // 5. Run Count Query (User Role - simulating ID 1)
        console.log("\n5. Running Count Query (User Role - ID from record if exists):");
        if (recordsRes.rows.length > 0) {
            const userId = recordsRes.rows[0].user_id;
            console.log(`Using User ID: ${userId}`);
            // Simulating the BUGGY query currently in server.js
            const buggyQuery = `
                SELECT f.name, COUNT(r.id) as count 
                FROM file_types f
                LEFT JOIN records r ON f.id = r.file_type_id AND r.state_id = $1
                LEFT JOIN users u ON r.user_id = u.id AND r.user_id = $2
                GROUP BY f.name
            `;
            const buggyRes = await pool.query(buggyQuery, [stateId, userId]);
            console.table(buggyRes.rows);
        }

    } catch (err) {
        console.error("Debug Error:", err);
    } finally {
        pool.end();
    }
}

debugCounts();
