const router = require('express').Router();
const db     = require('../config/database');
const upload = require('../middleware/upload');
const { isAuthenticated, authorise } = require('../middleware/auth');
const { logActivity }    = require('../utils/activityLogger');
const { sendReportConfirmation, sendStatusUpdate } = require('../utils/emailService');
const { generateReportHTML } = require('../utils/pdfGenerator');

// ── List reports ───────────────────────────────────────────
// Public users see only their own; staff see non-escalated; admin sees all
router.get('/', isAuthenticated, async (req, res, next) => {
  try {
    const { search, category, status, priority, dateFrom, dateTo } = req.query;
    const role   = req.session.role;
    const userId = req.session.userId;

    let sql = `
      SELECT r.*, c.name AS category_name, c.icon AS category_icon,
             u.name AS reporter_name,
             (SELECT COUNT(*) FROM report_images WHERE report_id = r.id) AS image_count
      FROM reports r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based filtering
    if (role === 'user') {
      sql += ' AND r.user_id = ?';
      params.push(userId);
    } else if (role === 'staff') {
      sql += ' AND r.escalated = 0';
    }
    // admin sees everything

    if (search) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ? OR r.id = ?)';
      const s = `%${search}%`;
      params.push(s, s, s, parseInt(search) || 0);
    }
    if (category) { sql += ' AND r.category_id = ?'; params.push(category); }
    if (status)   { sql += ' AND r.status = ?';      params.push(status); }
    if (priority) { sql += ' AND r.priority = ?';    params.push(priority); }
    if (dateFrom) { sql += ' AND r.incident_date >= ?'; params.push(dateFrom); }
    if (dateTo)   { sql += ' AND r.incident_date <= ?'; params.push(dateTo); }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// ── Get single report ──────────────────────────────────────
router.get('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const id   = req.params.id;
    const role = req.session.role;

    const [reports] = await db.execute(`
      SELECT r.*, c.name AS category_name, c.icon AS category_icon,
             u.name AS reporter_name, u.email AS reporter_email
      FROM reports r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [id]);

    if (!reports.length) return res.status(404).json({ error: 'Report not found.' });

    const report = reports[0];

    // Users can only see their own reports
    if (role === 'user' && report.user_id !== req.session.userId)
      return res.status(403).json({ error: 'Access denied.' });

    // Images (metadata only, not the BLOB)
    const [images] = await db.execute(
      'SELECT id, filename, mimetype, created_at FROM report_images WHERE report_id = ?', [id]
    );

    // Comments — users see only public comments; staff/admin see all
    let commentSql = 'SELECT * FROM comments WHERE report_id = ?';
    if (role === 'user') commentSql += ' AND is_internal = 0';
    commentSql += ' ORDER BY created_at ASC';
    const [comments] = await db.execute(commentSql, [id]);

    // Activity log
    const [activity] = await db.execute(`
      SELECT al.*, u.name AS actor_name
      FROM activity_log al LEFT JOIN users u ON al.user_id = u.id
      WHERE al.report_id = ? ORDER BY al.created_at DESC LIMIT 20
    `, [id]);

    res.json({ report, images, comments, activity });
  } catch (err) { next(err); }
});

// ── Create report ──────────────────────────────────────────
router.post('/', isAuthenticated, upload.array('images', 10), async (req, res, next) => {
  try {
    const { category_id, title, description, location, latitude, longitude, incident_date, incident_time, priority } = req.body;

    if (!category_id || !title || !description || !location || !incident_date || !incident_time)
      return res.status(400).json({ error: 'All required fields must be filled.' });

    const [result] = await db.execute(
      `INSERT INTO reports (user_id, category_id, title, description, location, latitude, longitude, incident_date, incident_time, priority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.userId, category_id, title, description, location, latitude || null, longitude || null, incident_date, incident_time, priority || 'medium']
    );

    const reportId = result.insertId;

    // Save images as BLOBs
    if (req.files && req.files.length) {
      for (const file of req.files) {
        await db.execute(
          'INSERT INTO report_images (report_id, filename, mimetype, data) VALUES (?, ?, ?, ?)',
          [reportId, file.originalname, file.mimetype, file.buffer]
        );
      }
    }

    await logActivity({
      userId: req.session.userId, reportId, action: 'REPORT_CREATED',
      description: `Report "${title}" submitted`, ip: req.ip,
    });

    // Try sending email confirmation
    try {
      const email = req.session.email;
      if (email) await sendReportConfirmation(email, reportId, title);
    } catch (_) { /* email failure should not block report creation */ }

    res.status(201).json({ id: reportId, message: 'Report submitted successfully.' });
  } catch (err) { next(err); }
});

// ── Update report (staff / admin) ──────────────────────────
router.patch('/:id', authorise('staff', 'admin'), async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status, priority, notes, escalated } = req.body;

    const [existing] = await db.execute('SELECT * FROM reports WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Report not found.' });

    const report   = existing[0];
    const updates  = [];
    const params   = [];
    const changes  = [];

    if (status && status !== report.status) {
      updates.push('status = ?'); params.push(status);
      changes.push(`status → ${status}`);
    }
    if (priority && priority !== report.priority) {
      updates.push('priority = ?'); params.push(priority);
      changes.push(`priority → ${priority}`);
    }
    if (notes !== undefined) {
      updates.push('notes = ?'); params.push(notes);
    }
    if (escalated !== undefined) {
      updates.push('escalated = ?'); params.push(escalated ? 1 : 0);
      if (escalated) changes.push('escalated to admin');
    }

    if (updates.length) {
      params.push(id);
      await db.execute(`UPDATE reports SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await logActivity({
      userId: req.session.userId, reportId: parseInt(id), action: 'REPORT_UPDATED',
      description: changes.join(', ') || 'Notes updated', ip: req.ip,
    });

    // Email notification on status change
    if (status && status !== report.status && report.user_id) {
      try {
        const [u] = await db.execute('SELECT email FROM users WHERE id = ?', [report.user_id]);
        if (u.length) await sendStatusUpdate(u[0].email, id, report.title, status);
      } catch (_) {}
    }

    res.json({ message: 'Report updated.' });
  } catch (err) { next(err); }
});

// ── Add comment ────────────────────────────────────────────
router.post('/:id/comments', authorise('staff', 'admin'), async (req, res, next) => {
  try {
    const { comment, is_internal } = req.body;
    if (!comment) return res.status(400).json({ error: 'Comment cannot be empty.' });

    const [user] = await db.execute('SELECT name, role FROM users WHERE id = ?', [req.session.userId]);
    const authorName = user.length ? user[0].name : 'Unknown';
    const authorRole = user.length ? user[0].role : 'staff';

    await db.execute(
      'INSERT INTO comments (report_id, user_id, author_name, author_role, comment, is_internal) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.id, req.session.userId, authorName, authorRole, comment, is_internal ? 1 : 0]
    );

    await logActivity({
      userId: req.session.userId, reportId: parseInt(req.params.id),
      action: 'COMMENT_ADDED', description: `${is_internal ? 'Internal' : 'Public'} comment added`,
      ip: req.ip,
    });

    res.status(201).json({ message: 'Comment added.' });
  } catch (err) { next(err); }
});

// ── Export report as printable HTML ────────────────────────
router.get('/:id/export', isAuthenticated, async (req, res, next) => {
  try {
    const id = req.params.id;
    const [reports] = await db.execute(`
      SELECT r.*, c.name AS category_name, c.icon AS category_icon, u.name AS reporter_name
      FROM reports r LEFT JOIN categories c ON r.category_id = c.id LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [id]);

    if (!reports.length) return res.status(404).json({ error: 'Report not found.' });

    const [images]   = await db.execute('SELECT id, filename FROM report_images WHERE report_id = ?', [id]);
    const [comments] = await db.execute('SELECT * FROM comments WHERE report_id = ? ORDER BY created_at ASC', [id]);

    const html = generateReportHTML(reports[0], images, comments);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
});

module.exports = router;
