const axios = require('axios');
const db = require('../db');

/**
 * FitOS WhatsApp service — Meta Cloud API direct (no BSP).
 * Template variable ORDER must exactly match what was submitted in Meta Business Manager.
 */

const TEMPLATES = {
  welcome_new_member:     ['member_name', 'gym_name', 'plan', 'expiry_date', 'qr_link'],
  renewal_7day:           ['member_name', 'expiry_date', 'renewal_link'],
  renewal_3day_urgent:    ['member_name', 'days_left', 'plan_price', 'renewal_link'],
  payment_success:        ['member_name', 'gym_name', 'amount', 'invoice_number'],
  trial_booking_confirm:  ['name', 'date', 'time', 'trainer_name', 'gym_address'],
  workout_plan_ready:     ['member_name', 'plan_link'],
  birthday_wishes:        ['member_name', 'gym_name'],
  churn_winback:          ['member_name', 'gym_name', 'days_absent', 'offer_link'],       // R2
  renewal_lowengagement:  ['member_name', 'gym_name', 'days_left', 'renewal_link'],       // R2
};

function normalizePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  return digits.length === 10 ? `91${digits}` : digits;
}

/**
 * Send a WhatsApp template message.
 * @param {string} phone     - 10-digit Indian number or with country code
 * @param {string} template  - template name (must exist in TEMPLATES + approved in Meta)
 * @param {object} vars      - key/value map matching the template's variable list
 * @param {string|null} gymId - for logging
 */
async function sendWhatsApp(phone, template, vars = {}, gymId = null) {
  const varOrder = TEMPLATES[template];
  if (!varOrder) {
    console.error(`[WA] Unknown template: ${template}`);
    return { ok: false, error: 'unknown_template' };
  }

  const to = normalizePhone(phone);
  const parameters = varOrder.map((k) => ({ type: 'text', text: String(vars[k] ?? '-') }));

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: template,
      language: { code: 'en' },
      components: [{ type: 'body', parameters }],
    },
  };

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${process.env.META_WABA_TOKEN}` }, timeout: 15000 }
    );
    const messageId = res.data?.messages?.[0]?.id || null;
    await db.query(
      'INSERT INTO whatsapp_logs (gym_id, recipient_phone, template_name, status, meta_message_id) VALUES ($1,$2,$3,$4,$5)',
      [gymId, to, template, 'sent', messageId]
    );
    return { ok: true, messageId };
  } catch (e) {
    const detail = e.response?.data?.error?.message || e.message;
    console.error(`[WA] Send failed (${template} -> ${to}):`, detail);
    await db.query(
      'INSERT INTO whatsapp_logs (gym_id, recipient_phone, template_name, status, error_detail) VALUES ($1,$2,$3,$4,$5)',
      [gymId, to, template, 'failed', detail]
    ).catch(() => {});
    return { ok: false, error: detail };
  }
}

/** Plain text session message (only works within 24h customer window). Used for OTP. */
async function sendTextMessage(phone, text) {
  const to = normalizePhone(phone);
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${process.env.META_WABA_TOKEN}` }, timeout: 15000 }
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.response?.data?.error?.message || e.message };
  }
}

module.exports = { sendWhatsApp, sendTextMessage, TEMPLATES };
