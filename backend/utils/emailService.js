/**
 * Email service — sends transactional emails via SMTP
 * Falls back to console logging when SMTP is not configured.
 */
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass || user === 'your-email@gmail.com') {
    console.log('[Email] SMTP not configured — emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user, pass },
  });

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const t = getTransporter();

  if (!t) {
    console.log(`[Email Mock] To: ${to} | Subject: ${subject}`);
    return { mock: true };
  }

  try {
    const info = await t.sendMail({
      from: `"${process.env.FROM_NAME || 'Crime Report System'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log('[Email] Sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Error:', err.message);
    throw err;
  }
}

// Pre-built templates
async function sendReportConfirmation(email, reportId, title) {
  return sendEmail({
    to: email,
    subject: `Report #${reportId} Submitted — ${title}`,
    html: `
      <h2>Report Submitted Successfully</h2>
      <p>Your crime report <strong>#${reportId}</strong> — <em>${title}</em> has been received.</p>
      <p>Our team will review your report and update its status. You can track progress from your dashboard.</p>
      <p>Thank you for reporting.</p>
    `,
  });
}

async function sendStatusUpdate(email, reportId, title, newStatus) {
  return sendEmail({
    to: email,
    subject: `Report #${reportId} Status Updated — ${newStatus}`,
    html: `
      <h2>Report Status Updated</h2>
      <p>Report <strong>#${reportId}</strong> — <em>${title}</em> has been updated to: <strong>${newStatus}</strong>.</p>
      <p>Log in to your dashboard for more details.</p>
    `,
  });
}

module.exports = { sendEmail, sendReportConfirmation, sendStatusUpdate };
