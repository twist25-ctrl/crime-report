/**
 * Activity Logger — records user actions in the activity_log table
 */
const db = require('../config/database');

async function logActivity({ userId = null, reportId = null, action, description = '', ip = null }) {
  try {
    await db.execute(
      `INSERT INTO activity_log (user_id, report_id, action, description, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, reportId, action, description, ip]
    );
  } catch (err) {
    console.error('[ActivityLogger]', err.message);
  }
}

module.exports = { logActivity };
