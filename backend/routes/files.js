const router = require('express').Router();
const db     = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// ── Serve image by ID ──────────────────────────────────────
router.get('/image/:id', isAuthenticated, async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      'SELECT filename, mimetype, data FROM report_images WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Image not found.' });

    const img = rows[0];
    res.set('Content-Type', img.mimetype);
    res.set('Content-Disposition', `inline; filename="${img.filename}"`);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(img.data);
  } catch (err) { next(err); }
});

module.exports = router;
