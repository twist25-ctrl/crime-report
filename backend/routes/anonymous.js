const router = require('express').Router();
const crypto = require('crypto');
const db     = require('../config/database');
const upload = require('../middleware/upload');
const { logActivity } = require('../utils/activityLogger');

// Generate tracking number like: ANM-8F3K2A
function genTracking() {
  return 'ANM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ── Submit anonymous report ────────────────────────────────
router.post('/report', upload.array('images', 10), async (req, res, next) => {
  try {
    const { category_id, title, description, location, latitude, longitude, incident_date, incident_time, priority, anonymous_contact } = req.body;

    if (!category_id || !title || !description || !location || !incident_date || !incident_time)
      return res.status(400).json({ error: 'All required fields must be filled.' });

    const tracking = genTracking();

    const [result] = await db.execute(
      `INSERT INTO reports
        (user_id, category_id, title, description, location, latitude, longitude, incident_date, incident_time, priority, is_anonymous, tracking_number, anonymous_contact)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [category_id, title, description, location, latitude || null, longitude || null, incident_date, incident_time, priority || 'medium', tracking, anonymous_contact || null]
    );

    const reportId = result.insertId;

    // Save images
    if (req.files && req.files.length) {
      for (const file of req.files) {
        await db.execute(
          'INSERT INTO report_images (report_id, filename, mimetype, data) VALUES (?, ?, ?, ?)',
          [reportId, file.originalname, file.mimetype, file.buffer]
        );
      }
    }

    await logActivity({ reportId, action: 'ANONYMOUS_REPORT', description: `Anonymous report "${title}" submitted`, ip: req.ip });

    res.status(201).json({
      id: reportId,
      tracking_number: tracking,
      message: 'Anonymous report submitted. Save your tracking number.',
    });
  } catch (err) { next(err); }
});

// ── Track anonymous report ─────────────────────────────────
router.get('/track/:tracking', async (req, res, next) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.id, r.title, r.status, r.priority, r.created_at, r.updated_at, c.name AS category_name, c.icon AS category_icon
       FROM reports r LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.tracking_number = ?`,
      [req.params.tracking]
    );
    if (!rows.length) return res.status(404).json({ error: 'No report found with that tracking number.' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
