require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const connectDB = require('./config/db');

// Models (must be required before use in webhooks)
const Gym = require('./models/Gym');
const Subscription = require('./models/Subscription');
const WhatsappLog = require('./models/WhatsappLog');

connectDB();

const app = express();
app.set('trust proxy', 1);

/* ═══ Security + parsing ═══ */
app.use(helmet());
app.use(cors({
  origin: [
    'https://fitos.in',
    'https://www.fitos.in',
    'https://master.fitos.in',
    'http://localhost:5173',
  ],
  credentials: true,
}));

/* Razorpay webhook needs RAW body for signature check — register BEFORE express.json */
app.post('/webhook/subscription', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body).digest('hex');
    if (signature !== expected) return res.status(400).json({ error: 'Invalid signature' });

    const event = JSON.parse(req.body.toString());
    const type = event.event;
    const sub = event.payload?.subscription?.entity;
    const gymId = sub?.notes?.gym_id;
    const planKey = sub?.notes?.plan_key;

    console.log(`[WEBHOOK] Razorpay: ${type} gym=${gymId} plan=${planKey}`);

    const expiresAt = new Date(Date.now() + 32 * 24 * 60 * 60 * 1000);

    if (type === 'subscription.charged' && gymId && planKey) {
      await Gym.findByIdAndUpdate(gymId, { $set: { plan: planKey, razorpay_sub_id: sub.id, plan_expires_at: expiresAt } });
      await Subscription.findOneAndUpdate({ razorpay_sub_id: sub.id }, { $set: { status: 'active', current_period_end: expiresAt } });
    }

    if (type === 'subscription.halted' && sub?.id) {
      await Subscription.findOneAndUpdate({ razorpay_sub_id: sub.id }, { $set: { status: 'halted' } });
      console.warn(`[WEBHOOK] Subscription halted: ${sub.id} — payment failing`);
    }

    if (type === 'subscription.cancelled' && sub?.id) {
      await Subscription.findOneAndUpdate({ razorpay_sub_id: sub.id }, { $set: { status: 'cancelled' } });
      if (gymId) await Gym.findByIdAndUpdate(gymId, { $set: { plan: 'free', razorpay_sub_id: null } });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[WEBHOOK subscription]', e.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.use(express.json({ limit: '2mb' }));

/* ═══ Rate limits ═══ */
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many attempts, try later' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));

/* ═══ Health ═══ */
app.get('/health', (req, res) => res.json({ ok: true, v: '1.0.0', product: 'FitOS' }));

/* ═══ Meta WhatsApp webhook ═══ */
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[WEBHOOK] Meta verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/webhook/meta', async (req, res) => {
  try {
    const statuses = req.body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (statuses) {
      for (const s of statuses) {
        await WhatsappLog.findOneAndUpdate({ meta_message_id: s.id }, { $set: { status: s.status } }).catch(() => {});
      }
    }
    res.sendStatus(200);
  } catch (e) { res.sendStatus(200); } // Always 200 to Meta
});

/* ═══ API routes ═══ */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gym', require('./routes/gym'));
app.use('/api/gym-plans', require('./routes/gymPlans'));
app.use('/api/members', require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/trainers', require('./routes/trainers'));
app.use('/api/trials', require('./routes/trials'));
app.use('/api/pt', require('./routes/pt'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/enrollment', require('./routes/enrollment'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api/member', require('./routes/memberPortal'));
app.use('/api/trainer-os', require('./routes/trainerOS'));
app.use('/api/master', require('./routes/master'));
app.use('/api/ai', require('./routes/ai'));

/* 404 + error handler */
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

/* ═══ Start ═══ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[FitOS] API running on port ${PORT} · env=${process.env.NODE_ENV}`);
  require('./cron/jobs'); // start scheduled jobs
});
