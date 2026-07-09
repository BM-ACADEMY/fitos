-- FitOS Database Schema v1.0
-- Run this entire file in Neon SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══ GYMS ═══
CREATE TABLE gyms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(100) UNIQUE NOT NULL,
  name            VARCHAR(200) NOT NULL,
  owner_name      VARCHAR(200) NOT NULL,
  phone           VARCHAR(15) UNIQUE NOT NULL,
  email           VARCHAR(200),
  address         TEXT,
  city            VARCHAR(100) DEFAULT 'Pondicherry',
  plan            VARCHAR(20) DEFAULT 'free'
                  CHECK (plan IN ('free','starter','basic','premium')),
  trial_ends_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  plan_expires_at TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  razorpay_sub_id VARCHAR(200),
  logo_url        TEXT,
  gstin           VARCHAR(20),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ MASTER ADMINS ═══
CREATE TABLE master_admins (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200) NOT NULL,
  phone      VARCHAR(15) UNIQUE NOT NULL,
  email      VARCHAR(200),
  role       VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ FITOS PLATFORM PLANS ═══
CREATE TABLE fitos_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key          VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(100) NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  member_limit INT NOT NULL,
  features     JSONB DEFAULT '[]',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ GYM MEMBERSHIP PLANS ═══
CREATE TABLE gym_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  duration_months INT NOT NULL DEFAULT 1,
  price           DECIMAL(10,2) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ SUBSCRIPTIONS ═══
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  plan_key            VARCHAR(20) NOT NULL,
  razorpay_sub_id     VARCHAR(200),
  status              VARCHAR(20) DEFAULT 'active'
                      CHECK (status IN ('active','halted','cancelled')),
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ TRAINERS ═══
CREATE TABLE trainers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  phone             VARCHAR(15) NOT NULL,
  specialization    VARCHAR(300),
  base_salary       DECIMAL(10,2) DEFAULT 0,
  pt_commission_pct DECIMAL(5,2) DEFAULT 10,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ TRAINER PERMISSIONS ═══
CREATE TABLE trainer_permissions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  page       VARCHAR(50) NOT NULL,
  allowed    BOOLEAN DEFAULT true,
  UNIQUE(trainer_id, page)
);

-- ═══ TRAINER ATTENDANCE ═══
CREATE TABLE trainer_attendance (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  gym_id     UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  date       DATE DEFAULT CURRENT_DATE,
  status     VARCHAR(10) DEFAULT 'present' CHECK (status IN ('present','absent','half_day')),
  UNIQUE(trainer_id, date)
);

-- ═══ MEMBERS ═══
CREATE TABLE members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  trainer_id        UUID REFERENCES trainers(id) ON DELETE SET NULL,
  name              VARCHAR(200) NOT NULL,
  phone             VARCHAR(15) NOT NULL,
  gender            VARCHAR(10) CHECK (gender IN ('male','female','other')),
  dob               DATE,
  goal              VARCHAR(100),
  fitness_level     VARCHAR(20) DEFAULT 'beginner',
  health_notes      TEXT,
  enrollment_source VARCHAR(50) DEFAULT 'walk_in',
  plan              VARCHAR(100) DEFAULT 'monthly',
  plan_duration     INT DEFAULT 1,
  joined_at         DATE DEFAULT CURRENT_DATE,
  expires_at        DATE,
  status            VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active','expired','suspended')),
  qr_token          TEXT UNIQUE,
  emergency_contact VARCHAR(200),
  last_checkin_date DATE,
  churn_risk        BOOLEAN DEFAULT false,
  referral_token    VARCHAR(50) UNIQUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ CHECK-INS ═══
CREATE TABLE check_ins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id        UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id     UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  method        VARCHAR(20) DEFAULT 'manual' CHECK (method IN ('manual','qr'))
);

-- ═══ PAYMENTS ═══
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id              UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id           UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount              DECIMAL(10,2) NOT NULL,
  gst_amount          DECIMAL(10,2) DEFAULT 0,
  total_amount        DECIMAL(10,2) NOT NULL,
  method              VARCHAR(30) DEFAULT 'cash'
                      CHECK (method IN ('cash','upi','razorpay','card')),
  razorpay_payment_id VARCHAR(200),
  razorpay_order_id   VARCHAR(200),
  status              VARCHAR(20) DEFAULT 'paid'
                      CHECK (status IN ('pending','paid','failed','refunded')),
  plan_months         INT DEFAULT 1,
  invoice_number      VARCHAR(50),
  notes               TEXT,
  paid_at             TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ PT PACKAGES ═══
CREATE TABLE pt_packages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id         UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id        UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  total_sessions    INT NOT NULL,
  used_sessions     INT DEFAULT 0,
  price_per_session DECIMAL(10,2) NOT NULL,
  total_price       DECIMAL(10,2) NOT NULL,
  expires_at        DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ PT SESSIONS ═══
CREATE TABLE pt_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_id    UUID NOT NULL REFERENCES pt_packages(id) ON DELETE CASCADE,
  gym_id        UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  completed_at  TIMESTAMPTZ,
  status        VARCHAR(20) DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  trainer_notes TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ TRIAL BOOKINGS ═══
CREATE TABLE trial_bookings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id         UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  name           VARCHAR(200) NOT NULL,
  phone          VARCHAR(15) NOT NULL,
  gender         VARCHAR(10),
  goal           VARCHAR(100),
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(50),
  status         VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','attended','converted','no_show')),
  source         VARCHAR(50) DEFAULT 'online',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ EXPENSES ═══
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id      UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  category    VARCHAR(100) DEFAULT 'other',
  description TEXT NOT NULL,
  amount      DECIMAL(10,2) NOT NULL,
  date        DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ WHATSAPP LOGS ═══
CREATE TABLE whatsapp_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id          UUID REFERENCES gyms(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  template_name   VARCHAR(100) NOT NULL,
  status          VARCHAR(20) DEFAULT 'sent',
  meta_message_id VARCHAR(200),
  error_detail    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ COUPONS ═══
CREATE TABLE coupons (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code         VARCHAR(50) UNIQUE NOT NULL,
  discount_pct INT NOT NULL,
  max_uses     INT DEFAULT 100,
  expires_at   DATE,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE coupon_uses (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  gym_id    UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  used_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ MEASUREMENTS ═══
CREATE TABLE measurements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  gym_id       UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  weight_kg    DECIMAL(5,2),
  chest_cm     DECIMAL(5,2),
  waist_cm     DECIMAL(5,2),
  hips_cm      DECIMAL(5,2),
  arms_cm      DECIMAL(5,2),
  body_fat_pct DECIMAL(5,2),
  date         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ R2: WORKOUT PLANS ═══
CREATE TABLE workout_plans (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id         UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  member_id      UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  trainer_id     UUID REFERENCES trainers(id) ON DELETE SET NULL,
  generated_by   VARCHAR(20) DEFAULT 'ai' CHECK (generated_by IN ('ai','trainer')),
  plan_data      JSONB NOT NULL,
  diet_data      JSONB,
  is_active      BOOLEAN DEFAULT true,
  sent_to_member BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ R2: REFERRALS ═══
CREATE TABLE referrals (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id        UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  referred_member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  gym_id             UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  reward_applied     BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ R2: REVENUE FORECASTS ═══
CREATE TABLE revenue_forecasts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id            UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  forecast_date     DATE DEFAULT CURRENT_DATE,
  projected_amount  DECIMAL(12,2),
  upcoming_renewals INT,
  renewal_rate      DECIMAL(5,4),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ OTP STORE ═══
CREATE TABLE otp_store (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone      VARCHAR(15) NOT NULL,
  otp        VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ INDEXES ═══
CREATE INDEX idx_members_gym    ON members(gym_id);
CREATE INDEX idx_members_expiry ON members(expires_at, status);
CREATE INDEX idx_members_phone  ON members(phone);
CREATE INDEX idx_checkins_date  ON check_ins(gym_id, checked_in_at);
CREATE INDEX idx_payments_gym   ON payments(gym_id, created_at);
CREATE INDEX idx_otp_phone      ON otp_store(phone, expires_at);
CREATE INDEX idx_walogs_gym     ON whatsapp_logs(gym_id, created_at);

-- ═══ SEED: FitOS platform plans ═══
INSERT INTO fitos_plans (key, name, price, member_limit, features) VALUES
('free',    'Free Trial',  0,   5,     '["manual_attendance","cash_payments"]'),
('starter', 'Starter',     149, 50,    '["qr_attendance","whatsapp_alerts","reports"]'),
('basic',   'Basic',       349, 150,   '["qr_attendance","whatsapp_alerts","reports","razorpay","invoices","expenses","pt_sessions","multi_staff"]'),
('premium', 'AI Premium',  799, 99999, '["qr_attendance","whatsapp_alerts","reports","razorpay","invoices","expenses","pt_sessions","multi_staff","ai_workout","ai_diet","churn_shield","revenue_oracle","multi_branch","referrals"]');

-- ═══ SEED: Master admin ═══
INSERT INTO master_admins (name, phone, role) VALUES ('Kamar', '9403892971', 'super_admin');
