const router = require('express').Router();
const crypto = require('crypto');
const db = require('../config/database');
const { logActivity } = require('../utils/activityLogger');

function genSosTracking() {
  return 'SOS-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// ── Emergency SOS report ───────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { latitude, longitude, location_text } = req.body;

    if (!latitude || !longitude)
      return res.status(400).json({ error: 'Location is required for emergency reports.' });

    const location = location_text || `GPS: ${latitude}, ${longitude}`;
    const tracking = genSosTracking();
    const now = new Date();
    const incidentDate = now.toISOString().split('T')[0];
    const incidentTime = now.toTimeString().split(' ')[0];

    // Find "Other" category as fallback
    const [cats] = await db.execute("SELECT id FROM categories WHERE name = 'Other' LIMIT 1");
    const categoryId = cats.length ? cats[0].id : 1;

    const [result] = await db.execute(
      `INSERT INTO reports
        (user_id, category_id, title, description, location, latitude, longitude, incident_date, incident_time, priority, status, escalated, is_anonymous, tracking_number)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'critical', 'pending', 1, 1, ?)`,
      [
        categoryId,
        '🚨 EMERGENCY SOS Alert',
        `Emergency SOS triggered at coordinates (${latitude}, ${longitude}). Immediate assistance required. Location: ${location}`,
        location,
        latitude || null,
        longitude || null,
        incidentDate,
        incidentTime,
        tracking
      ]
    );

    await logActivity({
      reportId: result.insertId,
      action: 'EMERGENCY_SOS',
      description: `Emergency SOS alert triggered at ${location}`,
      ip: req.ip
    });

    res.status(201).json({
      tracking_number: tracking,
      report_id: result.insertId,
      message: 'Emergency SOS alert sent! Help is on the way. Save your tracking number.',
    });
  } catch (err) { next(err); }
});

module.exports = router;
