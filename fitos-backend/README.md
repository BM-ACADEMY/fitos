# FitOS Backend

Gym Management SaaS API · BM TechX · ABM Groups · fitos.in

## Stack
Node.js 20 + Express · PostgreSQL (Neon) · Razorpay · Meta WhatsApp Cloud API · Claude Sonnet (R2) · node-cron

## Deploy in 6 steps

### 1. Database (Neon)
- Create project at neon.tech
- Open SQL Editor → paste **entire** `db/schema.sql` → Run
- Verify: 22 tables created, `fitos_plans` has 4 rows, `master_admins` has Kamar
- Copy connection string (must end with `?sslmode=require`)

### 2. Environment
```bash
cp .env.example .env
# Fill every value. JWT_SECRET: openssl rand -base64 32
```

### 3. Local test
```bash
npm install
npm run dev
curl http://localhost:3000/health   # → {"ok":true,"v":"1.0.0","product":"FitOS"}
```

### 4. Seed test data
```bash
npm run seed
# Test logins printed at the end
```

### 5. Railway deploy
```bash
npm i -g @railway/cli
railway login && railway init && railway up
# Add ALL .env values in Railway → Variables tab
railway run node db/seed.js
```

### 6. Webhooks (after deploy)
- **Meta**: webhook URL `https://api.fitos.in/webhook/meta` · verify token = META_VERIFY_TOKEN value · subscribe to `messages`
- **Razorpay**: webhook URL `https://api.fitos.in/webhook/subscription` · events: subscription.charged, subscription.halted, subscription.cancelled

## WhatsApp templates (submit Day 1 in Meta Business Manager)
All UTILITY category. Names must match exactly:
`welcome_new_member` `renewal_7day` `renewal_3day_urgent` `payment_success` `trial_booking_confirm` `workout_plan_ready` `birthday_wishes` `churn_winback` `renewal_lowengagement`

Template bodies are in the Sprint Plan doc, Day 1 section.

## OTP in production
`routes/auth.js` sends OTP via WhatsApp text (works only in 24h session window).
For production, integrate Msg91 or 2Factor at the marked comment in `/send-otp`.
In dev (`NODE_ENV=development`), OTP is returned as `dev_otp` in the API response.

## Route map
| Prefix | File | Access |
|---|---|---|
| /api/auth | auth.js | public |
| /api/gym | gym.js | gym_admin, trainer |
| /api/gym-plans | gymPlans.js | gym_admin (write) |
| /api/members | members.js | gym_admin, trainer (own only) |
| /api/attendance | attendance.js | gym_admin, trainer |
| /api/payments | payments.js | **gym_admin ONLY — trainer 403** |
| /api/trainers | trainers.js | gym_admin |
| /api/trials | trials.js | gym_admin |
| /api/pt | pt.js | gym_admin, trainer |
| /api/accounts | accounts.js | gym_admin + basic plan |
| /api/enrollment | enrollment.js | public (/join/:slug) |
| /api/subscription | subscription.js | gym_admin |
| /api/member | memberPortal.js | member only |
| /api/trainer-os | trainerOS.js | trainer, gym_admin |
| /api/master | master.js | master_admin, super_admin |
| /api/ai | ai.js | premium plan only (R2) |

## Cron jobs (auto-start with server, IST timezone)
- 8AM — birthday WhatsApp
- 9AM — renewal reminders (7d + 3d) + auto-expire
- 10AM — ChurnShield (premium gyms, R2)
- 6PM — revenue summary log
- 11PM — Revenue Oracle forecast (R2)

## Common issues
| Problem | Fix |
|---|---|
| DB connection error | Add `?sslmode=require` to DATABASE_URL |
| WA "failed" in logs | Template not approved OR name mismatch vs Meta |
| AI plan error | Gym must be premium + Anthropic key needs credits |
| CORS error | Add your frontend domain in index.js cors origin list |
| Razorpay signature mismatch | RAZORPAY_WEBHOOK_SECRET must match dashboard webhook secret |
| Trainer sees payments | Should never happen — every payments route has auth(['gym_admin']) |
