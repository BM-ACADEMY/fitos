# FitOS Frontend

React 18 + Vite + TailwindCSS · All 27 screens · fitos.in

## Apps in this build
| Path | App | Users |
|---|---|---|
| /login → /dashboard | Gym owner + trainer app | gym_admin, trainer |
| /member | Member PWA (installable) | member |
| /master → /master/panel | Platform admin | master_admin, super_admin |
| /join/:slug | Public enrollment (light theme) | anyone |

## Deploy in 4 steps

### 1. Local test
```bash
cp .env.example .env       # set VITE_API_URL to your Railway API URL
npm install
npm run dev                # http://localhost:5173
```

### 2. Test all logins (after backend seed)
- Gym owner: 9876543210 → /login
- Trainer:   9876500001 → /login (Payments hidden + API 403)
- Member:    9876511111 → /member
- Master:    9403892971 → /master

### 3. Vercel deploy
```bash
npm i -g vercel
vercel --prod
# Set env vars in Vercel dashboard: VITE_API_URL=https://api.fitos.in
```

### 4. Domain
Point fitos.in + master.fitos.in to Vercel (CNAME) per sprint doc DNS table.

## Notes
- Razorpay checkout.js loads from index.html — no extra setup
- QR scanner needs HTTPS (camera permission) — works on Vercel/production, not plain http
- PWA manifest at /manifest.json — members can "Add to Home Screen" on Android
- Trainer role: Payments/Accounts/Trials links hidden in sidebar AND blocked at backend (403)
- All API calls hit `VITE_API_URL/api/*`

## Add app icons (before launch)
Place `icon-192.png` and `icon-512.png` in /public (FitOS green dumbbell on dark bg — any icon generator works).
