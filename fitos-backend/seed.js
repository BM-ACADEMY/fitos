require('dotenv').config();
const mongoose = require('mongoose');

const Gym = require('./models/Gym');
const Trainer = require('./models/Trainer');
const Member = require('./models/Member');
const MasterAdmin = require('./models/MasterAdmin');
const GymPlan = require('./models/GymPlan');
const FitosPlan = require('./models/FitosPlan');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fitos';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('[SEED] Connected to MongoDB');

  // Clean existing seed data (by phone)
  await Gym.deleteOne({ phone: '9876543210' });
  await Trainer.deleteOne({ phone: '9876500001' });
  await Member.deleteOne({ phone: '9876511111' });
  await MasterAdmin.deleteOne({ phone: '9403892971' });

  /* ── 1. Gym (Owner) ── */
  const gym = await Gym.create({
    slug: 'ironforge-gym-demo',
    name: 'IronForge Gym',
    owner_name: 'Rajesh Kumar',
    phone: '9876543210',
    email: 'rajesh@ironforge.in',
    city: 'Pondicherry',
    address: '12 MG Road, Pondicherry',
    plan: 'premium',
    trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    is_active: true,
  });
  console.log('[SEED] Gym created:', gym.name, '| id:', gym._id);

  /* ── 2. Gym Plans ── */
  await GymPlan.deleteMany({ gym_id: gym._id });
  await GymPlan.insertMany([
    { gym_id: gym._id, name: 'Monthly',     duration_months: 1,  price: 499  },
    { gym_id: gym._id, name: 'Quarterly',   duration_months: 3,  price: 1299 },
    { gym_id: gym._id, name: 'Half-Yearly', duration_months: 6,  price: 2399 },
    { gym_id: gym._id, name: 'Annual',      duration_months: 12, price: 4499 },
  ]);
  console.log('[SEED] Gym plans created');

  /* ── 3. Trainer ── */
  const trainer = await Trainer.create({
    gym_id: gym._id,
    name: 'Arjun Singh',
    phone: '9876500001',
    specialization: 'Strength & Conditioning',
    base_salary: 20000,
    pt_commission_pct: 15,
    is_active: true,
  });
  console.log('[SEED] Trainer created:', trainer.name);

  /* ── 4. Member ── */
  const jwt = require('jsonwebtoken');
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  const member = await Member.create({
    gym_id: gym._id,
    trainer_id: trainer._id,
    name: 'Priya Sharma',
    phone: '9876511111',
    gender: 'female',
    goal: 'Weight Loss',
    fitness_level: 'beginner',
    plan: 'Quarterly',
    plan_duration: 3,
    expires_at: expiresAt,
    status: 'active',
    referral_token: 'PRIYA01',
    enrollment_source: 'walk_in',
  });

  // Generate QR token
  const qrToken = jwt.sign(
    { member_id: member._id, gym_id: gym._id },
    process.env.JWT_SECRET || 'fitos_dev_secret'
  );
  member.qr_token = qrToken;
  await member.save();
  console.log('[SEED] Member created:', member.name);

  /* ── 5. Master Admin ── */
  const master = await MasterAdmin.create({
    name: 'Super Admin',
    phone: '9403892971',
    email: 'admin@fitos.in',
    role: 'super_admin',
  });
  console.log('[SEED] Master Admin created:', master.name);

  /* ── 6. FitOS Plans (subscription tiers) ── */
  await FitosPlan.deleteMany({});
  await FitosPlan.insertMany([
    { key: 'free',    name: 'Free',    price: 0,   member_limit: 5,     features: ['manual_attendance','cash_payments'], is_active: true },
    { key: 'starter', name: 'Starter', price: 149, member_limit: 50,    features: ['manual_attendance','cash_payments','qr_attendance','whatsapp_alerts','reports'], is_active: true },
    { key: 'basic',   name: 'Basic',   price: 349, member_limit: 150,   features: ['manual_attendance','cash_payments','qr_attendance','whatsapp_alerts','reports','razorpay','invoices','expenses','pt_sessions','multi_staff'], is_active: true },
    { key: 'premium', name: 'Premium', price: 799, member_limit: 99999, features: ['manual_attendance','cash_payments','qr_attendance','whatsapp_alerts','reports','razorpay','invoices','expenses','pt_sessions','multi_staff','ai_workout','ai_diet','churn_shield','revenue_oracle','multi_branch','referrals'], is_active: true },
  ]);
  console.log('[SEED] FitOS subscription plans created');

  console.log('\n==============================');
  console.log('✅  SEED COMPLETE');
  console.log('==============================');
  console.log('Gym Owner  → 9876543210');
  console.log('Trainer    → 9876500001');
  console.log('Member     → 9876511111');
  console.log('SuperAdmin → 9403892971');
  console.log('\nOTP is logged in backend console when you request it.');
  console.log('==============================\n');

  await mongoose.disconnect();
}

seed().catch(e => { console.error('[SEED ERROR]', e); process.exit(1); });
