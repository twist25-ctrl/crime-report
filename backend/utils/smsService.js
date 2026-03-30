/**
 * SMS Service — sends notifications via Twilio
 * Falls back to console logging when Twilio is not configured.
 */

async function sendSMS(to, message) {
  const sid   = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from  = process.env.TWILIO_PHONE;

  if (!sid || !token || !from) {
    console.log(`[SMS Mock] To: ${to} | Message: ${message}`);
    return { mock: true };
  }

  try {
    const twilio = require('twilio')(sid, token);
    const result = await twilio.messages.create({
      body: message,
      from,
      to,
    });
    console.log('[SMS] Sent:', result.sid);
    return result;
  } catch (err) {
    console.error('[SMS] Error:', err.message);
    throw err;
  }
}

async function notifyReportSubmitted(phone, reportId) {
  return sendSMS(phone, `Crime Report #${reportId} has been submitted successfully. Track your report at the Crime Report System.`);
}

async function notifyStatusChange(phone, reportId, status) {
  return sendSMS(phone, `Crime Report #${reportId} status updated to: ${status}. Check your dashboard for details.`);
}

module.exports = { sendSMS, notifyReportSubmitted, notifyStatusChange };
