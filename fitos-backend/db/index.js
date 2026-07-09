const mongoose = require('mongoose');
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');

// Use MONGODB_URI if available, otherwise check if DATABASE_URL is mongo, else fallback to localhost
const mongoUri = process.env.MONGODB_URI || 
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mongodb') ? process.env.DATABASE_URL : 'mongodb://127.0.0.1:27017/fitos');

mongoose.connect(mongoUri)
.then(() => console.log(`[DB] Connected to MongoDB at ${mongoUri}`))
.catch((err) => console.error('[DB] Connection error:', err));

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Common configuration for UUID-based _id
const uuidOptions = {
  type: String,
  default: uuidv4,
};

// 1. Gym
const gymSchema = new mongoose.Schema({
  _id: uuidOptions,
  slug: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  owner_name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  email: String,
  address: String,
  city: { type: String, default: 'Pondicherry' },
  plan: { type: String, enum: ['free', 'starter', 'basic', 'premium'], default: 'free' },
  trial_ends_at: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  plan_expires_at: Date,
  is_active: { type: Boolean, default: true },
  razorpay_sub_id: String,
  logo_url: String,
  gstin: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// 2. MasterAdmin
const masterAdminSchema = new mongoose.Schema({
  _id: uuidOptions,
  name: { type: String, required: true },
  phone: { type: String, unique: true, required: true },
  email: String,
  role: { type: String, enum: ['admin', 'super_admin'], default: 'admin' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 3. FitosPlan
const fitosPlanSchema = new mongoose.Schema({
  _id: uuidOptions,
  key: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  member_limit: { type: Number, required: true },
  features: { type: mongoose.Schema.Types.Mixed, default: [] }, // Array or JSON object
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 4. GymPlan
const gymPlanSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  duration_months: { type: Number, default: 1 },
  price: { type: Number, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 5. Subscription
const subscriptionSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  plan_key: { type: String, required: true },
  razorpay_sub_id: String,
  status: { type: String, enum: ['active', 'halted', 'cancelled'], default: 'active' },
  current_period_end: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 6. Trainer
const trainerSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  specialization: String,
  base_salary: { type: Number, default: 0 },
  pt_commission_pct: { type: Number, default: 10 },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 7. TrainerPermission
const trainerPermissionSchema = new mongoose.Schema({
  _id: uuidOptions,
  trainer_id: { type: String, ref: 'Trainer', required: true },
  page: { type: String, required: true },
  allowed: { type: Boolean, default: true },
}, { timestamps: false });
trainerPermissionSchema.index({ trainer_id: 1, page: 1 }, { unique: true });

// 8. TrainerAttendance
const trainerAttendanceSchema = new mongoose.Schema({
  _id: uuidOptions,
  trainer_id: { type: String, ref: 'Trainer', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  date: { type: Date, default: Date.now }, // Maps to Date in SQL
  status: { type: String, enum: ['present', 'absent', 'half_day'], default: 'present' },
}, { timestamps: false });
trainerAttendanceSchema.index({ trainer_id: 1, date: 1 }, { unique: true });

// 9. Member
const memberSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  trainer_id: { type: String, ref: 'Trainer' },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: Date,
  goal: String,
  fitness_level: { type: String, default: 'beginner' },
  health_notes: String,
  enrollment_source: { type: String, default: 'walk_in' },
  plan: { type: String, default: 'monthly' },
  plan_duration: { type: Number, default: 1 },
  joined_at: { type: Date, default: Date.now },
  expires_at: Date,
  status: { type: String, enum: ['active', 'expired', 'suspended'], default: 'active' },
  qr_token: { type: String, unique: true, sparse: true },
  emergency_contact: String,
  last_checkin_date: Date,
  churn_risk: { type: Boolean, default: false },
  referral_token: { type: String, unique: true, sparse: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });
memberSchema.index({ phone: 1 });
memberSchema.index({ gym_id: 1 });
memberSchema.index({ expires_at: 1, status: 1 });

// 10. CheckIn
const checkInSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  checked_in_at: { type: Date, default: Date.now },
  method: { type: String, enum: ['manual', 'qr'], default: 'manual' },
}, { timestamps: false });
checkInSchema.index({ gym_id: 1, checked_in_at: 1 });

// 11. Payment
const paymentSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  amount: { type: Number, required: true },
  gst_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'upi', 'razorpay', 'card'], default: 'cash' },
  razorpay_payment_id: String,
  razorpay_order_id: String,
  status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'paid' },
  plan_months: { type: Number, default: 1 },
  invoice_number: String,
  notes: String,
  paid_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
paymentSchema.index({ gym_id: 1, created_at: 1 });

// 12. PtPackage
const ptPackageSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  trainer_id: { type: String, ref: 'Trainer', required: true },
  total_sessions: { type: Number, required: true },
  used_sessions: { type: Number, default: 0 },
  price_per_session: { type: Number, required: true },
  total_price: { type: Number, required: true },
  expires_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 13. PtSession
const ptSessionSchema = new mongoose.Schema({
  _id: uuidOptions,
  package_id: { type: String, ref: 'PtPackage', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  scheduled_at: { type: Date, required: true },
  completed_at: Date,
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled', 'no_show'], default: 'scheduled' },
  trainer_notes: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 14. TrialBooking
const trialBookingSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  gender: String,
  goal: String,
  preferred_date: { type: Date, required: true },
  preferred_time: String,
  status: { type: String, enum: ['pending', 'confirmed', 'attended', 'converted', 'no_show'], default: 'pending' },
  source: { type: String, default: 'online' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 15. Expense
const expenseSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  category: { type: String, default: 'other' },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 16. WhatsappLog
const whatsappLogSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym' },
  recipient_phone: { type: String, required: true },
  template_name: { type: String, required: true },
  status: { type: String, default: 'sent' },
  meta_message_id: String,
  error_detail: String,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
whatsappLogSchema.index({ gym_id: 1, created_at: 1 });

// 17. Coupon
const couponSchema = new mongoose.Schema({
  _id: uuidOptions,
  code: { type: String, unique: true, required: true },
  discount_pct: { type: Number, required: true },
  max_uses: { type: Number, default: 100 },
  expires_at: Date,
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 18. CouponUse
const couponUseSchema = new mongoose.Schema({
  _id: uuidOptions,
  coupon_id: { type: String, ref: 'Coupon', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  used_at: { type: Date, default: Date.now },
}, { timestamps: false });

// 19. Measurement
const measurementSchema = new mongoose.Schema({
  _id: uuidOptions,
  member_id: { type: String, ref: 'Member', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  weight_kg: Number,
  chest_cm: Number,
  waist_cm: Number,
  hips_cm: Number,
  arms_cm: Number,
  body_fat_pct: Number,
  date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 20. WorkoutPlan
const workoutPlanSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  member_id: { type: String, ref: 'Member', required: true },
  trainer_id: { type: String, ref: 'Trainer' },
  generated_by: { type: String, enum: ['ai', 'trainer'], default: 'ai' },
  plan_data: { type: mongoose.Schema.Types.Mixed, required: true }, // JSONB mapping
  diet_data: { type: mongoose.Schema.Types.Mixed }, // JSONB mapping
  is_active: { type: Boolean, default: true },
  sent_to_member: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 21. Referral
const referralSchema = new mongoose.Schema({
  _id: uuidOptions,
  referrer_id: { type: String, ref: 'Member', required: true },
  referred_member_id: { type: String, ref: 'Member', required: true },
  gym_id: { type: String, ref: 'Gym', required: true },
  reward_applied: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 22. RevenueForecast
const revenueForecastSchema = new mongoose.Schema({
  _id: uuidOptions,
  gym_id: { type: String, ref: 'Gym', required: true },
  forecast_date: { type: Date, default: Date.now },
  projected_amount: Number,
  upcoming_renewals: Number,
  renewal_rate: Number,
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// 23. OtpStore
const otpStoreSchema = new mongoose.Schema({
  _id: uuidOptions,
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });
otpStoreSchema.index({ phone: 1, expires_at: 1 });

// Export all models and a mock query function for temporary compatibility during refactoring
module.exports = {
  connection: mongoose.connection,
  Gym: mongoose.model('Gym', gymSchema),
  MasterAdmin: mongoose.model('MasterAdmin', masterAdminSchema),
  FitosPlan: mongoose.model('FitosPlan', fitosPlanSchema),
  GymPlan: mongoose.model('GymPlan', gymPlanSchema),
  Subscription: mongoose.model('Subscription', subscriptionSchema),
  Trainer: mongoose.model('Trainer', trainerSchema),
  TrainerPermission: mongoose.model('TrainerPermission', trainerPermissionSchema),
  TrainerAttendance: mongoose.model('TrainerAttendance', trainerAttendanceSchema),
  Member: mongoose.model('Member', memberSchema),
  CheckIn: mongoose.model('CheckIn', checkInSchema),
  Payment: mongoose.model('Payment', paymentSchema),
  PtPackage: mongoose.model('PtPackage', ptPackageSchema),
  PtSession: mongoose.model('PtSession', ptSessionSchema),
  TrialBooking: mongoose.model('TrialBooking', trialBookingSchema),
  Expense: mongoose.model('Expense', expenseSchema),
  WhatsappLog: mongoose.model('WhatsappLog', whatsappLogSchema),
  Coupon: mongoose.model('Coupon', couponSchema),
  CouponUse: mongoose.model('CouponUse', couponUseSchema),
  Measurement: mongoose.model('Measurement', measurementSchema),
  WorkoutPlan: mongoose.model('WorkoutPlan', workoutPlanSchema),
  Referral: mongoose.model('Referral', referralSchema),
  RevenueForecast: mongoose.model('RevenueForecast', revenueForecastSchema),
  OtpStore: mongoose.model('OtpStore', otpStoreSchema),
  
  // Dummy query function so the app doesn't instantly crash before routes are refactored
  query: async (text, params) => {
    throw new Error('PostgreSQL query called after MongoDB migration! Route needs refactoring: ' + text);
  }
};
