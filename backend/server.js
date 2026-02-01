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

// Middleware to protect other routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Protected Data Routes ---

app.get('/api/states', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        let query = `
            SELECT s.*, 
            (
                SELECT COUNT(*) FROM records r 
                WHERE r.state_id = s.id
                ${role !== 'admin' ? 'AND r.user_id = $1' : ''}
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
                WHERE r.file_type_id = f.id 
                AND r.state_id = $1
                ${role !== 'admin' ? 'AND r.user_id = $2' : ''}
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
            ${role !== 'admin' ? 'AND r.user_id = $2' : ''}
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
        const userId = req.user.id;
        const role = req.user.role;

        console.log(`[GET Records] Request: Code=${stateId}, File=${fileType}, User=${userId}, Role=${role}`);

        // 1. Resolve IDs explicitly to match POST logic
        const stateRes = await pool.query('SELECT id FROM states WHERE code = $1', [stateId]);
        const fileRes = await pool.query('SELECT id FROM file_types WHERE name = $1', [fileType]);

        if (stateRes.rows.length === 0) {
            console.log(`[GET Records] State code '${stateId}' not found.`);
            return res.status(404).json({ error: "State not found" });
        }
        if (fileRes.rows.length === 0) {
            console.log(`[GET Records] File type '${fileType}' not found.`);
            return res.status(404).json({ error: "File type not found" });
        }

        const internalStateId = stateRes.rows[0].id;
        const internalFileId = fileRes.rows[0].id;

        // 2. Query with direct ID linkage
        let query = `
            SELECT r.*, f.name as file_type_name
            FROM records r
            JOIN file_types f ON r.file_type_id = f.id
            WHERE r.state_id = $1
            AND r.file_type_id = $2
        `;
        const params = [internalStateId, internalFileId];

        // 3. Apply Isolation
        if (role !== 'admin') {
            query += ` AND r.user_id = $3`;
            params.push(userId);
        }

        query += ` ORDER BY r.treatment_date DESC`;

        const result = await pool.query(query, params);
        console.log(`[GET Records] Found ${result.rows.length} records.`);
        res.json(result.rows);

    } catch (err) {
        console.error("GET Records Error:", err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. Create Record
app.post('/api/records', authenticateToken, async (req, res) => {
    try {
        const { stateId, fileType, employeeName, postalAccount, amount, treatmentDate, notes, status } = req.body;
        console.log(`[POST Record] UserID=${req.user?.id}, State=${stateId}, File=${fileType}, Name=${employeeName}`);

        const stateRes = await pool.query('SELECT id FROM states WHERE code = $1', [stateId]);
        const fileRes = await pool.query('SELECT id FROM file_types WHERE name = $1', [fileType]);

        if (stateRes.rows.length === 0 || fileRes.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid State or File Type' });
        }

        const result = await pool.query(`
            INSERT INTO records 
            (state_id, file_type_id, employee_name, postal_account, amount, treatment_date, notes, status, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [
            stateRes.rows[0].id,
            fileRes.rows[0].id,
            employeeName,
            postalAccount,
            amount,
            treatmentDate,
            notes,
            status || 'completed',
            req.user.id
        ]);

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 3. Update Record
app.put('/api/records/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeName, postalAccount, amount, treatmentDate, notes, status } = req.body;

        const result = await pool.query(`
            UPDATE records 
            SET employee_name = $1, postal_account = $2, amount = $3, treatment_date = $4, notes = $5, status = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *
        `, [employeeName, postalAccount, amount, treatmentDate, notes, status, id]);

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

// 5. Delete Account
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
        if (role !== 'admin') {
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
});
