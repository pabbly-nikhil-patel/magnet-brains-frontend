# Magnet Brains - Setup Guide

## Prerequisites

- **Rust 1.77+** — https://rustup.rs
- **Node.js 20+** — https://nodejs.org
- **Docker** — https://docker.com (for PostgreSQL & Redis)
- **SQLx CLI** — `cargo install sqlx-cli --no-default-features --features postgres`

## Quick Start (Local Development)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 2. Generate JWT Keys

```bash
mkdir -p backend/keys
openssl genpkey -algorithm RSA -out backend/keys/private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in backend/keys/private.pem -out backend/keys/public.pem
```

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your local values (defaults work for Docker setup)

# Create database and run migrations
sqlx database create
sqlx migrate run

# Build and run
cargo run
```

Backend runs at http://localhost:8080

### 4. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 (proxies API calls to :8080)

### 5. Create Your First Admin User

Register via the API, then update the role in the database:

```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@magnetbrains.com","password":"admin123","full_name":"Admin"}'

# Promote to admin (via psql)
docker exec -it mb-rust-db-1 psql -U mb magnetbrains -c \
  "UPDATE users SET role = 'admin' WHERE email = 'admin@magnetbrains.com';"
```

## Production Deployment

### Backend (Docker)

```bash
# Build and run with production docker-compose
# First, create a .env.prod file with all required secrets
docker-compose -f docker-compose.prod.yml up -d
```

### Frontend (Vercel)

```bash
cd frontend

# Set environment variables in Vercel dashboard:
# VITE_API_URL=https://api.magnetbrains.com/api
# VITE_RAZORPAY_KEY_ID=your_live_key

vercel --prod
```

### AWS Infrastructure Checklist

- [ ] **RDS PostgreSQL** — db.t3.medium, automated backups
- [ ] **ElastiCache Redis** — cache.t3.micro
- [ ] **S3 Bucket** — private, versioning enabled
- [ ] **CloudFront** — OAI for S3, signed URLs configured
- [ ] **EC2/ECS** — Run Docker container behind ALB
- [ ] **SES** — Verify domain, set up transactional emails
- [ ] **Secrets Manager** — Store all env vars
- [ ] **ACM** — SSL certificates for your domain
- [ ] **Route 53** — api.magnetbrains.com -> ALB, magnetbrains.com -> Vercel

### DNS Configuration

| Domain | Points To |
|--------|-----------|
| `magnetbrains.com` | Vercel |
| `api.magnetbrains.com` | ALB / EC2 |
| `media.magnetbrains.com` | CloudFront |

## Project Structure

```
magnetbrains/
├── backend/                 # Rust (Axum) API
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── app.rs          # Router assembly (25+ route groups)
│   │   ├── config.rs       # Environment config
│   │   ├── error.rs        # Unified error type
│   │   ├── db/             # Database pool
│   │   ├── models/         # 11 database models
│   │   ├── dto/            # 6 DTO modules (request/response types)
│   │   ├── handlers/       # 8 handler modules (63 endpoints)
│   │   ├── services/       # 8 service modules (business logic)
│   │   ├── middleware/      # Auth, role guard, rate limiting
│   │   └── utils/          # JWT, password, S3, CloudFront, pagination
│   ├── migrations/          # 13 SQL migration files
│   └── Dockerfile
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/            # 6 API client modules
│   │   ├── stores/         # Zustand stores
│   │   ├── components/     # Layout + shared components
│   │   ├── pages/          # 25 page components
│   │   │   ├── public/     # Home, courses, auth pages
│   │   │   ├── student/    # Dashboard, courses, bookmarks, player
│   │   │   ├── instructor/ # Dashboard, course management, earnings
│   │   │   └── admin/      # Dashboard, users, courses, categories, revenue
│   │   └── types/          # TypeScript interfaces
│   └── vercel.json
├── docker-compose.yml       # Local development
├── docker-compose.prod.yml  # Production
└── .github/workflows/       # CI/CD pipelines
```

## API Endpoints (63 total)

| Group | Count | Auth |
|-------|-------|------|
| Auth | 8 | Mixed |
| Courses (Public) | 6 | No |
| Student | 8 | Student |
| Payments | 4 | Student/Webhook |
| Instructor | 14 | Instructor |
| Admin | 18 | Admin |
| Upload | 1 | Instructor/Admin |
| Homepage | 3 | Mixed |
| Lecture Stream | 1 | Auth |
