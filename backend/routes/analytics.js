const router = require('express').Router();
const db     = require('../config/database');
const { authorise } = require('../middleware/auth');

// ── Dashboard stats ────────────────────────────────────────
router.get('/stats', authorise('staff', 'admin'), async (_req, res, next) => {
  try {
    // Totals
    const [[totalsRow]] = await db.execute(`
      SELECT
        COUNT(*)                                    AS total,
        SUM(status = 'pending')                     AS pending,
        SUM(status = 'investigating')               AS investigating,
        SUM(status = 'resolved')                    AS resolved,
        SUM(status = 'rejected')                    AS rejected,
        SUM(escalated = 1)                          AS escalated,
        SUM(priority = 'critical')                  AS critical,
        SUM(is_anonymous = 1)                       AS anonymous
      FROM reports
    `);

    // By category
    const [byCategory] = await db.execute(`
      SELECT c.name, c.icon, c.color, COUNT(r.id) AS count
      FROM categories c LEFT JOIN reports r ON r.category_id = c.id
      GROUP BY c.id ORDER BY count DESC
    `);

    // By priority
    const [byPriority] = await db.execute(`
      SELECT priority, COUNT(*) AS count FROM reports GROUP BY priority
    `);

    // Recent activity
    const [recentActivity] = await db.execute(`
      SELECT al.action, al.description, u.name AS actor, al.created_at
      FROM activity_log al LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 10
    `);

    res.json({
      totals: {
        total:         totalsRow.total         || 0,
        pending:       totalsRow.pending       || 0,
        investigating: totalsRow.investigating || 0,
        resolved:      totalsRow.resolved      || 0,
        rejected:      totalsRow.rejected      || 0,
        escalated:     totalsRow.escalated     || 0,
        critical:      totalsRow.critical      || 0,
        anonymous:     totalsRow.anonymous     || 0,
      },
      byCategory,
      byPriority,
      recentActivity,
    });
  } catch (err) { next(err); }
});

// ── Trend data ─────────────────────────────────────────────
router.get('/trends', authorise('staff', 'admin'), async (_req, res, next) => {
  try {
    const [monthly] = await db.execute(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
             COUNT(*) AS count
      FROM reports
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY month ORDER BY month ASC
    `);
    res.json({ monthly });
  } catch (err) { next(err); }
});

// ── Full activity log (admin) ──────────────────────────────
router.get('/activity', authorise('admin'), async (_req, res, next) => {
  try {
    const [rows] = await db.execute(`
      SELECT al.*, u.name AS actor_name, u.role AS actor_role
      FROM activity_log al LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT 100
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
