# Pranjay — Render Deployment Guide

## Services Overview

| Service | Platform | URL (after deploy) |
|---------|----------|--------------------|
| Frontend (Next.js) | Render Web Service | `https://pranjay-frontend.onrender.com` |
| Backend (FastAPI) | Render Web Service | `https://pranjay-backend.onrender.com` |
| Database (PostgreSQL) | Render Managed DB | Auto-provisioned |

---

## Step 1 — Push to GitHub

Make sure your code is pushed to GitHub. The `render.yaml` at the root of the repo tells Render exactly how to build everything.

```bash
git add .
git commit -m "production ready"
git push origin main
```

---

## Step 2 — Create Render Account & Deploy

1. Go to [render.com](https://render.com) → Sign up (free)
2. Click **"New → Blueprint"**
3. Connect your GitHub repo
4. Render will auto-read `render.yaml` and create:
   - PostgreSQL database (`pranjay-db`)
   - Backend web service (`pranjay-backend`)
   - Frontend web service (`pranjay-frontend`)

---

## Step 3 — Set Secret Environment Variables

After deployment, go to each service in Render dashboard and set these **manually** (they contain secrets):

### Backend Service (`pranjay-backend`) → Environment

```
FIREBASE_SERVICE_ACCOUNT_JSON = <paste entire firebase-adminsdk.json as one line>
SUPABASE_URL                  = https://xxxx.supabase.co
SUPABASE_KEY                  = your-supabase-service-role-key
RAZORPAY_KEY_ID               = rzp_live_xxxx
RAZORPAY_KEY_SECRET           = your-live-secret
RESEND_API_KEY                = re_xxxx
```

**How to get FIREBASE_SERVICE_ACCOUNT_JSON:**
```bash
# Run this in terminal — it prints it as a single line you can paste
python3 -c "import json; print(json.dumps(json.load(open('backend/firebase-adminsdk.json'))))"
```

---

## Step 4 — Custom Domain (pranjay.com)

### Frontend domain:
1. Render → `pranjay-frontend` → **Settings → Custom Domains** → Add `pranjay.com` and `www.pranjay.com`
2. Render gives you a CNAME record

### Backend domain (optional — for cleaner API URLs):
1. Render → `pranjay-backend` → **Settings → Custom Domains** → Add `api.pranjay.com`

### DNS Records (in your domain registrar — GoDaddy/Namecheap):
```
Type    Name    Value
CNAME   @       pranjay-frontend.onrender.com
CNAME   www     pranjay-frontend.onrender.com
CNAME   api     pranjay-backend.onrender.com    (optional)
```

> Note: Some registrars don't allow CNAME on root `@`. Use their "ALIAS" or "ANAME" record type instead.

---

## Step 5 — Update API URL After Custom Domain

Once `pranjay.com` is live, update in Render dashboard:

**Frontend env var:**
```
NEXT_PUBLIC_API_URL = https://pranjay-backend.onrender.com
```
(or `https://api.pranjay.com` if you set up that custom domain)

---

## Step 6 — Firebase: Authorize Your Domain

> Without this, phone OTP login won't work on your live site!

1. Go to [Firebase Console](https://console.firebase.google.com) → project `pranjay-ec`
2. **Authentication → Settings → Authorized Domains**
3. Add: `pranjay.com`, `www.pranjay.com`, `pranjay-frontend.onrender.com`

---

## Step 7 — Create Admin User on Production

After backend is live, use Render's **Shell** tab on the backend service:

```bash
python -m scripts.create_admin admin@pranjay.com YourStrongPassword123!
```

---

## Step 8 — Razorpay (Go Live for Real Payments)

1. Login to [razorpay.com](https://razorpay.com)  
2. Complete **KYC** (upload GST certificate + bank details)
3. Get **Live API Keys** from Settings → API Keys
4. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Render

---

## Supabase Setup (for Product Image Uploads)

1. [supabase.com](https://supabase.com) → Create free project → region: Singapore  
2. **Storage → New Bucket** → name: `products` → toggle **Public**  
3. **Settings → API** → copy URL + service_role key  
4. Add to Render backend env vars  

---

## Cost Summary

| Item | Cost |
|------|------|
| Render (backend + frontend) | Free |
| Render PostgreSQL | Free (90 days) → then use Supabase DB free |
| Supabase (storage) | Free |
| Firebase (auth) | Free |
| Razorpay | Free setup (2% per transaction) |
| Resend (email) | Free (3k/month) |
| **Total/month** | **₹0** |
