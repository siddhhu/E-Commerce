# Pranjay Backend

B2B Cosmetics Ecommerce Platform - FastAPI Backend

## Tech Stack

- **Framework**: FastAPI (async)
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **Database**: PostgreSQL (Supabase/Neon)
- **Auth**: Email OTP + JWT
- **Email**: Resend
- **Storage**: Supabase Storage

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL database (or use Docker)
- Supabase account
- Resend account

### Setup

1. **Clone and install dependencies**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start the server**
   ```bash
   uvicorn app.main:app --reload
   ```

5. **Access the API**
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Using Docker

```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/request-otp` - Request OTP
- `POST /api/v1/auth/verify-otp` - Verify OTP & get tokens
- `POST /api/v1/auth/refresh` - Refresh access token

### Products
- `GET /api/v1/products` - List products
- `GET /api/v1/products/featured` - Featured products
- `GET /api/v1/products/{slug}` - Product details

### Cart
- `GET /api/v1/cart` - Get cart
- `POST /api/v1/cart/items` - Add to cart
- `PATCH /api/v1/cart/items/{id}` - Update quantity
- `DELETE /api/v1/cart/items/{id}` - Remove item

### Orders
- `POST /api/v1/checkout` - Create order
- `GET /api/v1/orders` - Order history
- `GET /api/v1/orders/{id}` - Order details

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `POST /api/v1/admin/products` - Create product
- `POST /api/v1/admin/bulk-upload/products` - Bulk import

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI app
│   ├── config.py         # Settings
│   ├── database.py       # DB connection
│   ├── models/           # SQLModel models
│   ├── routers/          # API routes
│   ├── services/         # Business logic
│   └── core/             # Auth, security
├── alembic/              # Migrations
├── tests/                # Test suite
├── Dockerfile
└── requirements.txt
```

## Deployment

### Render

1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Deploy!

### Fly.io

```bash
fly launch
fly deploy
```

## License

MIT
