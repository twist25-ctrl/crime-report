/**
 * PDF Generator — creates a report PDF using plain HTML piped through
 * a simple approach (no heavy dependencies).
 *
 * We build an HTML string and let the browser's print-to-PDF handle it,
 * OR we use a lightweight approach that returns HTML with print styles.
 */

function generateReportHTML(report, images, comments) {
  const statusColors = {
    pending:       '#f59e0b',
    investigating: '#3b82f6',
    resolved:      '#10b981',
    rejected:      '#ef4444',
  };
  const priorityColors = {
    low:      '#10b981',
    medium:   '#f59e0b',
    high:     '#f97316',
    critical: '#ef4444',
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const fmtTime = (t) => {
    if (!t) return '—';
    const [h, m] = t.split(':');
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Crime Report #${report.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 1.5rem; color: #0f172a; }
    .header p { color: #64748b; font-size: 0.9rem; margin-top: 4px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; color: #fff; margin-right: 6px; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 1rem; color: #475569; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .grid-item label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; display: block; }
    .grid-item span { font-size: 0.9rem; font-weight: 500; }
    .description { background: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; }
    .comment { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .comment-author { font-weight: 600; font-size: 0.85rem; }
    .comment-meta { font-size: 0.75rem; color: #94a3b8; }
    .comment-text { font-size: 0.875rem; margin-top: 4px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 16px; border-top: 2px solid #e2e8f0; font-size: 0.8rem; color: #94a3b8; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ Crime Report System</h1>
    <p>Official Report Document</p>
  </div>

  <div class="section">
    <h2>Report #${report.id} — ${report.title}</h2>
    <div style="margin: 10px 0;">
      <span class="badge" style="background:${statusColors[report.status] || '#64748b'}">${report.status}</span>
      <span class="badge" style="background:${priorityColors[report.priority] || '#64748b'}">${report.priority}</span>
      ${report.escalated ? '<span class="badge" style="background:#dc2626">Escalated</span>' : ''}
      ${report.is_anonymous ? '<span class="badge" style="background:#7c3aed">Anonymous</span>' : ''}
    </div>
  </div>

  <div class="section">
    <h2>Details</h2>
    <div class="grid">
      <div class="grid-item"><label>Category</label><span>${report.category_icon || ''} ${report.category_name || '—'}</span></div>
      <div class="grid-item"><label>Location</label><span>${report.location}</span></div>
      <div class="grid-item"><label>Incident Date</label><span>${fmtDate(report.incident_date)}</span></div>
      <div class="grid-item"><label>Incident Time</label><span>${fmtTime(report.incident_time)}</span></div>
      <div class="grid-item"><label>Reported By</label><span>${report.is_anonymous ? 'Anonymous' : (report.reporter_name || '—')}</span></div>
      <div class="grid-item"><label>Submitted</label><span>${fmtDate(report.created_at)}</span></div>
      ${report.tracking_number ? `<div class="grid-item"><label>Tracking</label><span>${report.tracking_number}</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <h2>Description</h2>
    <div class="description">${report.description}</div>
  </div>

  ${report.notes ? `
  <div class="section">
    <h2>Internal Notes</h2>
    <div class="description">${report.notes}</div>
  </div>` : ''}

  ${comments.length ? `
  <div class="section">
    <h2>Comments (${comments.length})</h2>
    ${comments.map(c => `
      <div class="comment">
        <div class="comment-author">${c.author_name || 'Unknown'} ${c.is_internal ? '(Internal)' : ''}</div>
        <div class="comment-meta">${fmtDate(c.created_at)}</div>
        <div class="comment-text">${c.comment}</div>
      </div>`).join('')}
  </div>` : ''}

  <div class="section">
    <h2>Evidence</h2>
    <p>${images.length} image(s) attached to this report.</p>
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()} — Crime Report System</p>
    <p>This is an official document. Handle with appropriate confidentiality.</p>
  </div>
</body>
</html>`;
}

module.exports = { generateReportHTML };
