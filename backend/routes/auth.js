const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const db      = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

// ── Register ───────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required.' });

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hash, phone || null]
    );

    await logActivity({ userId: result.insertId, action: 'USER_REGISTER', description: `New user registered: ${email}`, ip: req.ip });

    res.status(201).json({ message: 'Account created successfully.', userId: result.insertId });
  } catch (err) { next(err); }
});

// ── Login ──────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    req.session.userId = user.id;
    req.session.role   = user.role;
    req.session.email  = user.email;

    await logActivity({ userId: user.id, action: 'USER_LOGIN', description: `${user.name} logged in`, ip: req.ip });

    res.json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

// ── Logout ─────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy(() => {
    if (userId) logActivity({ userId, action: 'USER_LOGOUT', description: 'User logged out' });
    res.json({ message: 'Logged out.' });
  });
});

// ── Current User ───────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Not authenticated.' });

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!rows.length)
      return res.status(401).json({ error: 'User not found.' });

    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
