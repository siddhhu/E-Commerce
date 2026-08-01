# Vercel account migration checklist

Use this when moving the Pranjay frontend/backend to a new Vercel team/account.

## Root cause of `localhost:8000` API calls

`NEXT_PUBLIC_*` variables are **embedded at build time** in the Next.js client bundle.
If `NEXT_PUBLIC_API_URL` is missing when Vercel runs `npm run build`, the app falls back to `http://localhost:8000`.

**Fix:** set the env var, then **Redeploy** the frontend (not just save env vars).

---

## 1. Frontend project (`e-commerce-dun-three-84`)

Vercel → Project → **Settings → Environment Variables** → **Production**

| Variable | Example value | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://e-commerce-p21z.vercel.app` | Backend **production** URL (no `/api/v1`) |
| `NEXT_PUBLIC_APP_URL` | `https://e-commerce-dun-three-84.vercel.app` | Later: `https://www.pranjay.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | `rzp_live_...` | Same as old project |
| `NEXT_PUBLIC_FIREBASE_*` | (all 6 vars) | Copy from old frontend project |

Then: **Deployments → … → Redeploy** (uncheck “Use existing build cache”).

Verify after deploy:

```bash
curl -sL "https://YOUR-FRONTEND.vercel.app/api/v1/categories" | head -c 200
# Should return JSON, not 404

# JS bundle should NOT contain localhost:8000
curl -sL "https://YOUR-FRONTEND.vercel.app/" | grep -o '/_next/static/chunks/app/page[^"]*' | head -1
```

---

## 2. Backend project (`e-commerce-p21z`)

Copy **all** env vars from the old backend project. Minimum required:

| Variable | Required |
|----------|----------|
| `DATABASE_URL` | Yes — Supabase/Postgres connection string |
| `JWT_SECRET_KEY` | Yes |
| `SECRET_KEY` | Yes |
| `APP_ENV` | `production` |
| `DEBUG` | `false` |
| `CORS_ORIGINS` | JSON array — include new frontend URL |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Yes (for OTP/auth) |
| `SUPABASE_URL` / `SUPABASE_KEY` | Yes (images) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Yes |
| `RESEND_API_KEY` | Yes (order emails) |

### CORS example

```json
[
  "http://localhost:3000",
  "https://e-commerce-dun-three-84.vercel.app",
  "https://www.pranjay.com",
  "https://pranjay.com",
  "capacitor://localhost"
]
```

Use the backend **production** URL for health checks:

```bash
curl -sL "https://e-commerce-p21z.vercel.app/health"
curl -sL "https://e-commerce-p21z.vercel.app/api/v1/categories" | head -c 200
```

> Avoid using deployment-preview URLs like `…-pd7e70eu9-….vercel.app` in env vars — they often have **Deployment Protection** (302 to Vercel login).

---

## 3. Firebase authorized domains

Firebase Console → Authentication → Settings → **Authorized domains**

Add:

- `e-commerce-dun-three-84.vercel.app`
- `pranjay.com` / `www.pranjay.com` (when domain is moved)

---

## 4. Custom domain (`pranjay.com`)

1. Point DNS from old Vercel frontend project to the **new** frontend project.
2. Update `NEXT_PUBLIC_APP_URL` to `https://www.pranjay.com`.
3. Ensure `CORS_ORIGINS` on backend includes `https://www.pranjay.com`.
4. Redeploy frontend again.

---

## 5. Quick diagnosis

| Symptom | Cause |
|---------|-------|
| Browser calls `localhost:8000` | `NEXT_PUBLIC_API_URL` missing at **build** time → redeploy frontend |
| `/api/v1/...` 404 on frontend domain | Same — rewrites only enabled when env is set at build |
| Backend 302 to Vercel login | Deployment Protection on preview URL — use production `.vercel.app` URL |
| CORS error in browser console | Add frontend origin to backend `CORS_ORIGINS` and redeploy backend |
| Empty categories / 500 | `DATABASE_URL` missing or wrong on new backend project |
