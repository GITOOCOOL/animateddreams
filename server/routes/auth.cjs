const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database.cjs');
const { JWT_SECRET } = require('../middleware/auth.cjs');

router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    const stmt = db.prepare("INSERT INTO users (id, username, password, createdAt) VALUES (?, ?, ?, ?)");
    stmt.run(userId, username, hashedPassword, Date.now(), function (err) {
        if (err) {
            return res.status(400).json({ error: "Username already exists" });
        }
        res.json({ message: "User registered successfully" });
    });
    stmt.finalize();
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err) return res.status(500).json({ error: "Database error" });
        if (!user) return res.status(400).json({ error: "User not found" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: user.username, id: user.id });
    });
});

const { authenticateToken } = require('../middleware/auth.cjs');
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
