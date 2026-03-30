const router = require('express').Router();
const db     = require('../config/database');

// ── Get all categories ─────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT id, name, icon, color FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
