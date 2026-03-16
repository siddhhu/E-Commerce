# Pranjay - B2B Cosmetics Ecommerce Platform

A production-ready, Flipkart/Meesho-style B2B cosmetics ecommerce platform built with modern technologies.

## 🚀 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS + shadcn/ui |
| **Backend** | Python FastAPI (async) |
| **ORM** | SQLModel (SQLAlchemy + Pydantic) |
| **Database** | PostgreSQL (Supabase/Neon) |
| **Auth** | Email OTP + JWT |
| **Storage** | Supabase Storage |
| **Deployment** | Vercel (FE) + Render/Fly.io (BE) |

## 📁 Project Structure

```
pranjay/
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── main.py          # App entry point
│   │   ├── config.py        # Environment config
│   │   ├── database.py      # DB connection
│   │   ├── models/          # SQLModel models
│   │   ├── routers/         # API routes
│   │   │   ├── auth.py      # OTP + JWT auth
│   │   │   ├── products.py  # Product APIs
│   │   │   ├── cart.py      # Cart APIs
│   │   │   ├── orders.py    # Order APIs
│   │   │   └── admin/       # Admin endpoints
│   │   ├── services/        # Business logic
│   │   └── core/            # Security, deps
│   ├── alembic/             # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Login, OTP
│   │   │   ├── (shop)/      # Products, Cart
│   │   │   └── admin/       # Admin panel
│   │   ├── components/      # UI components
│   │   ├── lib/             # API client
│   │   └── store/           # Zustand stores
│   ├── tailwind.config.ts
│   └── package.json
│
└── README.md                 # This file
```

## 🛠️ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL database (or use Supabase)
- Resend account (for emails)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

API available at: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local

# Start dev server
npm run dev
```

App available at: http://localhost:3000

## 🔐 Authentication

Email OTP-based authentication (passwordless):

1. User enters email → `POST /auth/request-otp`
2. OTP sent via email (Resend)
3. User enters OTP → `POST /auth/verify-otp`
4. JWT tokens returned (access + refresh)
5. User profile auto-created on first login

## 📦 Core Features

### Customer Features
- ✅ Product listing with search/filter
- ✅ Product details with images
- ✅ Shopping cart
- ✅ Wishlist
- ✅ Checkout flow
- ✅ Order history
- ✅ B2B pricing

### Admin Features
- ✅ Dashboard with stats
- ✅ Product CRUD
- ✅ Bulk upload (CSV/Excel)
- ✅ Image upload
- ✅ Order management
- ✅ User management
- ✅ Role-based access

## 🗄️ Database Schema

11 tables with relationships:
- `users` - Customer/admin accounts
- `otp_codes` - OTP verification
- `categories` - Hierarchical categories
- `brands` - Product brands
- `products` - Product catalog
- `product_images` - Multiple images per product
- `addresses` - Shipping addresses
- `cart_items` - Shopping cart
- `wishlist_items` - Saved products
- `orders` - Order records
- `order_items` - Order line items

## 🚀 Deployment

### Backend (Render)

1. Create Web Service on Render
2. Connect repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables

### Frontend (Vercel)

```bash
cd frontend
npx vercel
```

## 📧 Email Templates

- OTP verification
- Welcome email
- Order confirmation
- Order shipped notification
- Admin order notification

## 🔒 Security

- Passwords: None (OTP-only auth)
- OTP: bcrypt hashed, 10min expiry
- JWT: HS256, short-lived access tokens
- CORS: Configured for frontend origin
- Rate limiting: Ready for implementation

## 📱 Mobile Ready

API designed for mobile apps:
- RESTful endpoints
- JWT auth (works with mobile)
- Consistent response format
- Pagination support

## License

MIT
