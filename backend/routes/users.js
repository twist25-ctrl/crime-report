const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../config/database');
const { authorise, isAuthenticated } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLogger');

// ── GET My Profile ──────────────────────────────────────────
router.get('/profile', isAuthenticated, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, phone_alt, preferred_contact, contact_notes, role, created_at FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// ── UPDATE My Profile ───────────────────────────────────────
router.patch('/profile', isAuthenticated, async (req, res, next) => {
  try {
    const { name, phone, phone_alt, preferred_contact, contact_notes } = req.body;
    
    await db.execute(
      'UPDATE users SET name = ?, phone = ?, phone_alt = ?, preferred_contact = ?, contact_notes = ? WHERE id = ?',
      [name, phone, phone_alt, preferred_contact, contact_notes, req.session.userId]
    );

    await logActivity({
      userId: req.session.userId, action: 'PROFILE_UPDATED',
      description: 'Account settings updated.', ip: req.ip,
    });

    res.json({ message: 'Profile updated successfully.' });
  } catch (err) { next(err); }
});

// ── List all users (admin only) ────────────────────────────
router.get('/', authorise('admin'), async (_req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Create user (admin only) ──────────────────────────────
router.post('/', authorise('admin'), async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required.' });

    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ error: 'Email already in use.' });

    const hash = await bcrypt.hash(password, 10);
    const validRole = ['user', 'staff', 'admin'].includes(role) ? role : 'user';

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, hash, phone || null, validRole]
    );

    await logActivity({
      userId: req.session.userId, action: 'USER_CREATED',
      description: `Admin created ${validRole} account: ${email}`, ip: req.ip,
    });

    res.status(201).json({ id: result.insertId, message: `${validRole} account created.` });
  } catch (err) { next(err); }
});

// ── Update user role (admin only) ──────────────────────────
router.patch('/:id', authorise('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['user', 'staff', 'admin'].includes(role))
      return res.status(400).json({ error: 'Invalid role.' });

    const [existing] = await db.execute('SELECT id, name FROM users WHERE id = ?', [req.params.id]);
    if (!existing.length) return res.status(404).json({ error: 'User not found.' });

    await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    await logActivity({
      userId: req.session.userId, action: 'ROLE_CHANGED',
      description: `Changed ${existing[0].name}'s role to ${role}`, ip: req.ip,
    });

    res.json({ message: 'Role updated.' });
  } catch (err) { next(err); }
});

module.exports = router;
