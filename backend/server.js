const express = require('express');
const cors = require('cors');

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Middleware
// Allow ANY website to talk to your backend (Fixes the Vercel issue)
app.use(cors({
    origin: true, // Reflects the request origin, efficiently allowing "all"
    credentials: true
}));
app.use(express.json());

// Database Connection (Import from db.js)
const pool = require('./db');

// Test DB Connection
pool.query('SELECT NOW()')
    .then(() => console.log('Connected to PostgreSQL'))
    .catch(err => console.error('Connection error', err.stack));



process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});

// Middleware (Defined early to avoid hoisting issues)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Step 1: Register Route ---
app.post('/api/register', async (req, res) => {
    let { username, password } = req.body;
    try {
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });
        username = username.trim();
        password = password.trim();

        // Check if user exists
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Username already taken" });

        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Insert
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
            [username, hash]
        );

        res.json({ success: true, user: result.rows[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- Step 3: Login Route ---
app.post('/api/login', async (req, res) => {
    let { username, password } = req.body;

    try {
        if (!username || !password) return res.status(400).json({ error: "Missing fields" });

        // Force Trim
        username = username.trim();
        password = password.trim();

        console.log(`[Login] Checking: '${username}'`);

        // 1. Find User
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            console.log(`[Login] User '${username}' NOT found.`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // 2. Compare Password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log(`[Login] Password valid ? ${validPassword} `);

        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update Last Login
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

        // 3. Generate Token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, role: user.role }
        });

    } catch (err) {
        console.error('[Login] Error', err);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// 🔒 ADMIN & MANAGER: Create a New User (Manager or Employee)
app.post('/api/users/add', authenticateToken, async (req, res) => {
    const { username, password, role } = req.body;
    console.log(`[Add User Attempt] Creator: ${req.user.username} (${req.user.role}) -> Target: ${username} (${role})`);

    const creatorRole = req.user.role;
    const creatorId = req.user.id;

    try {
        // 1. Permission Check
        if (creatorRole !== 'admin' && creatorRole !== 'manager') {
            return res.status(403).json({ error: "Access Denied" });
        }

        // 2. Validate Target Role
        let targetRole = 'user'; // Default to employee
        let managerId = null;

        if (creatorRole === 'admin') {
            // Admin can create 'manager' or 'user'
            if (role === 'manager') targetRole = 'manager';
            else targetRole = 'user';

            // If Admin creates a 'user', checks if managerId is provided to assign them.
            if (targetRole === 'user' && req.body.managerId) {
                const parsedId = parseInt(req.body.managerId);
                if (!isNaN(parsedId)) managerId = parsedId;
            }
        } else if (creatorRole === 'manager') {
            // Manager can ONLY create 'user'
            if (role === 'manager') return res.status(403).json({ error: "Managers cannot create other Managers." });
            targetRole = 'user';
            managerId = creatorId; // AUTOMATICALLY assign to this manager
        }

        console.log(`[Add User] Validated: Role=${targetRole}, ManagerID=${managerId}`);

        // 3. Check if user exists
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ error: "Username already taken" });

        // 4. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Insert
        const newUser = await pool.query(
            "INSERT INTO users (username, password_hash, role, manager_id, visible_password) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, manager_id",
            [username, hashedPassword, targetRole, managerId, password]
        );

        console.log(`[Add User] Success: ID ${newUser.rows[0].id}`);

        res.json({ message: "User added successfully!", user: newUser.rows[0] });

    } catch (err) {
        console.error("[Add User Error]", err.message);
        res.status(500).json({ error: "Server Error: Could not add user. " + err.message });
    }
});



// --- Admin Routes ---

// Route: Get Users (Admin: All, Manager: Team Only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    const { role, id } = req.user;
    if (role !== 'admin' && role !== 'manager') return res.sendStatus(403);

    try {
        let query = `
            SELECT u.id, u.username, u.role, u.created_at, u.last_login, u.manager_id, u.visible_password,
            m.username as manager_username,
            (SELECT COUNT(*) FROM records r WHERE r.user_id = u.id) as records_count
            FROM users u
            LEFT JOIN users m ON u.manager_id = m.id
        `;

        const params = [];

        if (role === 'manager') {
            // Manager sees themselves and their direct reports ONLY (Team Scope)
            query += ` WHERE u.manager_id = $1 OR u.id = $1`;
            params.push(id);
        }

        query += ` ORDER BY u.role ASC, u.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Route: Reset User Password (Admin Only)
app.post('/api/users/change-password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.sendStatus(403);
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) return res.status(400).json({ error: "Missing fields" });

    try {
        // Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE users SET password_hash = $1, visible_password = $2 WHERE id = $3', [hashedPassword, newPassword, userId]);

        console.log(`[Admin] Password reset for user ID ${userId} by Admin ${req.user.username}`);
        res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// --- Protected Data Routes ---

app.get('/api/states', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query = `
            SELECT s.*, 
            (
                SELECT COUNT(*) FROM records r 
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.state_id = s.id
                ${role === 'admin' ? '' : (role === 'manager' ? 'AND (r.user_id = $1 OR u.manager_id = $1)' : 'AND r.user_id = $1')}
            ) as record_count 
            FROM states s 
            ORDER BY code ASC
        `;

        const params = role !== 'admin' ? [userId] : [];
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/states/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

        const result = await pool.query('SELECT * FROM states WHERE code = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'State not found' });

        // Fetch file counts
        const userId = req.user.id;
        const role = req.user.role;
        const internalStateId = result.rows[0].id;

        const filesQuery = `
            SELECT f.id, f.name, f.display_name,
            (
                SELECT COUNT(*) FROM records r 
                LEFT JOIN users u ON r.user_id = u.id
                WHERE r.file_type_id = f.id 
                AND r.state_id = $1
                ${role === 'admin' ? '' : (role === 'manager' ? 'AND (r.user_id = $2 OR u.manager_id = $2)' : 'AND r.user_id = $2')}
            ) as count
            FROM file_types f
        `;

        const params = [internalStateId];
        if (role !== 'admin') params.push(userId);

        const filesRes = await pool.query(filesQuery, params);

        res.json({ ...result.rows[0], files: filesRes.rows });
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get counts for state dashboard (Redundant but kept for safety if used elsewhere)
app.get('/api/states/:id/counts', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const stateRes = await pool.query('SELECT id FROM states WHERE code = $1', [id]);
        if (stateRes.rows.length === 0) return res.status(404).json({ error: 'State not found' });
        const stateId = stateRes.rows[0].id;

        const userId = req.user.id;
        const role = req.user.role;

        const query = `
            SELECT f.name, COUNT(r.id) as count 
            FROM file_types f
            LEFT JOIN records r ON f.id = r.file_type_id AND r.state_id = $1
            LEFT JOIN users u ON r.user_id = u.id
            ${role === 'admin' ? '' : (role === 'manager' ? 'AND (r.user_id = $2 OR u.manager_id = $2)' : 'AND r.user_id = $2')}
            GROUP BY f.name
        `;
        const params = [stateId];
        if (role !== 'admin') params.push(userId);

        const result = await pool.query(query, params);
        const counts = {};
        result.rows.forEach(row => {
            counts[row.name] = parseInt(row.count);
        });
        res.json(counts);
    } catch (err) {
        console.error("Counts Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// --- Records Routes ---

// 1. Get Records (Filtered)
app.get('/api/states/:stateId/files/:fileType/records', authenticateToken, async (req, res) => {
    try {
        const { stateId, fileType } = req.params;
        const { search, filter } = req.query; // Added filter
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`[GET Records] Request: Code=${stateId}, File=${fileType}, User=${userId}, Role=${role}, Search=${search}, Filter=${filter}`);

        // 1. Resolve IDs explicitly to match POST logic
        const stateRes = await pool.query('SELECT id FROM states WHERE code = $1', [stateId]);
        const fileRes = await pool.query('SELECT id FROM file_types WHERE name = $1', [fileType]);

        if (stateRes.rows.length === 0) return res.status(404).json({ error: "State not found" });
        if (fileRes.rows.length === 0) return res.status(404).json({ error: "File type not found" });

        const internalStateId = stateRes.rows[0].id;
        const internalFileId = fileRes.rows[0].id;

        // 2. Query with direct ID linkage & Stored Serial Number
        let queryData = `
            SELECT r.*, f.name as file_type_name, u.username
            FROM records r
            JOIN file_types f ON r.file_type_id = f.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.state_id = $1
            AND r.file_type_id = $2
        `;

        // Dynamic Params
        const params = [internalStateId, internalFileId];
        let paramIdx = 3;

        // 3. Apply Isolation (RBAC)
        if (role === 'admin' || role === 'manager') {
            // Admin & Manager see ALL records (Global Oversight for Stats)
        } else {
            // Employee: Own records
            queryData += ` AND r.user_id = $${paramIdx}`;
            params.push(userId);
            paramIdx++;
        }

        // 4. Apply Status Filter
        if (filter === 'completed') {
            queryData += ` AND r.status = 'completed'`;
        } else if (filter === 'incomplete') {
            queryData += ` AND (r.status = 'incomplete' OR r.status = 'pending')`;
        }

        // 5. Apply Search (CCP Account)
        if (search && search.trim() !== '') {
            queryData += ` AND r.postal_account ILIKE $${paramIdx}`;
            params.push(`%${search.trim()}%`);
            paramIdx++;
        }

        queryData += ` ORDER BY r.treatment_date DESC`;

        const result = await pool.query(queryData, params);
        console.log(`[GET Records] Found ${result.rows.length} records.`);
        res.json(result.rows);

    } catch (err) {
        console.error("GET Records Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// New Endpoint: Download Records as CSV
const createCsvWriter = require('csv-writer').createObjectCsvStringifier;

app.get('/api/records/download/:stateId/:fileTypeId', authenticateToken, async (req, res) => {
    try {
        const { stateId, fileTypeId } = req.params;
        const userId = req.user.id;
        const role = req.user.role;

        // 1. Get State & File Info
        const stateRes = await pool.query('SELECT * FROM states WHERE code = $1', [stateId]);
        const fileRes = await pool.query('SELECT * FROM file_types WHERE name = $1', [fileTypeId]);

        if (stateRes.rows.length === 0 || fileRes.rows.length === 0) {
            return res.status(404).send('State or File Type not found');
        }

        const state = stateRes.rows[0];
        const fileType = fileRes.rows[0];

        // 2. Fetch Records
        let query = `
            SELECT r.* 
            FROM records r 
            WHERE r.state_id = $1 AND r.file_type_id = $2
        `;
        // Dynamic Params
        const params = [state.id, fileType.id];
        let paramIdx = 3;

        if (role === 'admin') {
            // Admin sees all
        } else if (role === 'manager') {
            // Manager: Team records (Whole Wilaya Scope = All EMPLOYEES under that manager)
            query += ` LEFT JOIN users u ON r.user_id = u.id AND (r.user_id = $${paramIdx} OR u.manager_id = $${paramIdx})`;
            params.push(userId);
        } else {
            // Employee: Own records
            query += ` AND r.user_id = $${paramIdx}`;
            params.push(userId);
        }

        query += ` ORDER BY r.treatment_date ASC`; // Chronological order

        const result = await pool.query(query, params);
        const records = result.rows;

        // 3. Generate CSV
        const csvStringifier = createCsvWriter({
            header: [
                { id: 'employee_name', title: 'Employee Name' },
                { id: 'postal_account', title: 'CCP Account' },
                { id: 'amount', title: 'Amount' },
                { id: 'treatment_date', title: 'Date' },
                { id: 'status', title: 'Status' },
                { id: 'notes', title: 'Notes' }
            ]
        });

        const headerStr = `Wilaya: ${state.name} (${state.code}), Document: ${fileType.display_name}\n`;
        const columnHeaders = csvStringifier.getHeaderString();
        const recordsStr = csvStringifier.stringifyRecords(records);

        const fullCsv = headerStr + columnHeaders + recordsStr;

        // 4. Send Response
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="records_${state.code}_${fileType.name}.csv"`);
        res.send(fullCsv);

    } catch (err) {
        console.error("Download Error:", err);
        res.status(500).send('Server Error');
    }
});

// 2. Create Record (With Transaction & Persistent Serial)
app.post('/api/records', authenticateToken, async (req, res) => {
    console.log("[POST /records] Request received from user:", req.user.id);
    const client = await pool.connect();
    try {
        const { stateId, fileType, employeeName, postalAccount, amount, treatmentDate, notes, status, reimbursementAmount } = req.body;
        console.log(`[POST Record] Payload: State=${stateId}, File=${fileType}, Name=${employeeName}, Amount=${amount}, Status=${status}`);

        await client.query('BEGIN'); // Start Transaction
        console.log("[POST Record] Transaction Started");

        // 1. Resolve IDs (Case-Insensitive & Robust)
        const stateRes = await client.query('SELECT id FROM states WHERE code = $1', [stateId]);
        // Try exact match first, then case-insensitive
        let fileRes = await client.query('SELECT id FROM file_types WHERE name = $1', [fileType]);
        if (fileRes.rows.length === 0) {
            fileRes = await client.query('SELECT id FROM file_types WHERE name ILIKE $1', [fileType]);
        }

        if (stateRes.rows.length === 0 || fileRes.rows.length === 0) {
            console.error("[POST Record] Invalid State/File. StateRes:", stateRes.rows.length, "FileRes:", fileRes.rows.length);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid State or File Type' });
        }

        const internalStateId = stateRes.rows[0].id;
        const internalFileTypeId = fileRes.rows[0].id;
        console.log(`[POST Record] Resolved IDs: State=${internalStateId}, File=${internalFileTypeId}`);

        // Ensure Amount is Number
        const numericAmount = parseFloat(amount);
        const numericReimbursement = parseFloat(reimbursementAmount || 0);
        if (isNaN(numericAmount)) {
            console.error("[POST Record] Invalid Amount format:", amount);
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid Amount' });
        }

        // 2. Calculate Next Serial Number (Scoped to State & FileType)
        const maxSerialRes = await client.query(
            'SELECT MAX(serial_number) as max_serial FROM records WHERE state_id = $1 AND file_type_id = $2',
            [internalStateId, internalFileTypeId]
        );
        const nextSerial = (maxSerialRes.rows[0].max_serial || 0) + 1;
        console.log(`[POST Record] Calculated Serial: ${nextSerial}`);

        // 3. Insert Record
        const insertQuery = `
            INSERT INTO records 
            (state_id, file_type_id, employee_name, postal_account, amount, treatment_date, notes, status, user_id, reimbursement_amount, serial_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;
        const insertParams = [
            internalStateId,
            internalFileTypeId,
            employeeName,
            postalAccount,
            numericAmount,
            treatmentDate,
            notes,
            status || 'completed',
            req.user.id,
            numericReimbursement,
            nextSerial
        ];

        const insertRes = await client.query(insertQuery, insertParams);

        await client.query('COMMIT'); // Commit Transaction
        console.log(`[POST Record] Transaction Committed. Record ID: ${insertRes.rows[0].id}`);
        res.json(insertRes.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[POST Record Error] Transaction Rolled Back. Detail:", err);
        res.status(500).json({ error: 'Database error: ' + err.message });
    } finally {
        client.release();
    }
});

// 3. Update Record
app.put('/api/records/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeName, postalAccount, amount, treatmentDate, notes, status, reimbursementAmount } = req.body;

        const result = await pool.query(`
            UPDATE records 
            SET employee_name = $1, postal_account = $2, amount = $3, treatment_date = $4, notes = $5, status = $6, result_amount = $7, reimbursement_amount = $8, updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `, [employeeName, postalAccount, amount, treatmentDate, notes, status, 0, reimbursementAmount || 0, id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 4. Delete Record
app.delete('/api/records/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM records WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 5. Delete Account (Self)
app.delete('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[Delete Account] Deleting user ID: ${userId}`);
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        console.error('[Delete Account] Error:', err);
        res.status(500).json({ error: 'Server error during account deletion' });
    }
});

// 5b. Delete User (Admin/Manager)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    const targetUserId = req.params.id;
    const { role, id: requesterId } = req.user;

    try {
        // Admin can delete anyone
        if (role === 'admin') {
            await pool.query('DELETE FROM users WHERE id = $1', [targetUserId]);
            return res.json({ success: true });
        }

        // Manager can only delete their own employees
        if (role === 'manager') {
            const result = await pool.query(
                'DELETE FROM users WHERE id = $1 AND role = $2 AND manager_id = $3',
                [targetUserId, 'user', requesterId]
            );
            if (result.rowCount === 0) return res.status(403).send("Forbidden: You can only delete your employees.");
            return res.json({ success: true });
        }

        res.sendStatus(403);
    } catch (err) {
        console.error("[Delete User Error]", err);
        res.status(500).json({ error: "Server Error" });
    }
});

// 6. Analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query = `
            SELECT s.name, COUNT(r.id) as count 
            FROM states s 
            LEFT JOIN records r ON s.id = r.state_id 
        `;

        const params = [];

        if (role === 'admin') {
            // Admin: Count ALL records for each state
            // No extra connection logic needed, just s.id = r.state_id
        } else if (role === 'manager') {
            // Manager: Count records from SELF or DIRECT REPORTS
            // We append to the JOIN condition, not WHERE, to keep States visible (Count=0)
            query += ` AND r.user_id IN (SELECT id FROM users WHERE manager_id = $1 OR id = $1) `;
            params.push(userId);
        } else {
            // Employee: Count records from SELF only
            query += ` AND r.user_id = $1 `;
            params.push(userId);
        }

        query += ` GROUP BY s.name ORDER BY count DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error("Analytics Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`[Version Check] Server Code v1.2 - AuthenticateToken Fixed`);
});
