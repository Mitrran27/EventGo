# EventGo MVP

A full-stack event planning platform — Node.js/Express backend with Prisma + PostgreSQL, React user frontend (Airbnb-style), React admin dashboard.

---

## Project Structure

```
eventgo/
├── backend/          # Node.js + Express + Prisma
├── frontend-user/    # React user app (port 5173)
└── frontend-admin/   # React admin dashboard (port 5174)
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

---

## 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE eventgo_db;
```

---

## 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/eventgo_db?schema=public"
JWT_SECRET="change-this-to-a-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
CLIENT_URL="http://localhost:5173"
ADMIN_URL="http://localhost:5174"
```

```bash
# Generate Prisma client
npm run generate

# Run migrations (creates all tables)
npm run migrate

# Seed the database (admin user + sample vendors)
npm run seed

# Start development server
npm run dev
```

API runs at: **http://localhost:5000**

**Seeded credentials:**
| Role  | Email                | Password    |
|-------|----------------------|-------------|
| Admin | admin@eventgo.my     | Admin@1234  |
| User  | demo@eventgo.my      | User@1234   |

---

## 3. Frontend User Setup

```bash
cd frontend-user

npm install
npm run dev
```

Runs at: **http://localhost:5173**

---

## 4. Frontend Admin Setup

```bash
cd frontend-admin

npm install
npm run dev
```

Runs at: **http://localhost:5174**

Log in with the admin credentials above.

---

## API Reference

### Auth
| Method | Endpoint                    | Auth     | Description           |
|--------|-----------------------------|----------|-----------------------|
| POST   | /api/auth/register          | —        | Register new user     |
| POST   | /api/auth/login             | —        | Login                 |
| GET    | /api/auth/me                | User     | Get current user      |
| PUT    | /api/auth/change-password   | User     | Change password       |

### Events
| Method | Endpoint                    | Auth | Description           |
|--------|-----------------------------|------|-----------------------|
| GET    | /api/events                 | User | List my events        |
| POST   | /api/events                 | User | Create event          |
| GET    | /api/events/:id             | User | Get event + expenses  |
| PUT    | /api/events/:id             | User | Update event          |
| DELETE | /api/events/:id             | User | Soft-delete event     |

### Expenses (nested under events)
| Method | Endpoint                              | Auth | Description         |
|--------|---------------------------------------|------|---------------------|
| GET    | /api/events/:eventId/expenses         | User | List expenses       |
| POST   | /api/events/:eventId/expenses         | User | Add expense         |
| PUT    | /api/events/:eventId/expenses/:id     | User | Update expense      |
| DELETE | /api/events/:eventId/expenses/:id     | User | Remove expense      |

### Vendors
| Method | Endpoint          | Auth     | Description                        |
|--------|-------------------|----------|------------------------------------|
| GET    | /api/vendors      | Optional | List vendors (search/filter/paged) |
| GET    | /api/vendors/:id  | Optional | Vendor detail                      |

### Favorites
| Method | Endpoint                  | Auth | Description       |
|--------|---------------------------|------|-------------------|
| GET    | /api/favorites            | User | My favourites     |
| POST   | /api/favorites/:vendorId  | User | Save favourite    |
| DELETE | /api/favorites/:vendorId  | User | Remove favourite  |

### Contact
| Method | Endpoint      | Auth | Description              |
|--------|---------------|------|--------------------------|
| POST   | /api/contact  | User | Send vendor inquiry      |
| GET    | /api/contact  | User | My sent inquiries        |

### Categories
| Method | Endpoint                   | Auth | Description             |
|--------|----------------------------|------|-------------------------|
| GET    | /api/categories/vendors    | —    | List vendor categories  |
| GET    | /api/categories/expenses   | —    | List expense categories |

### Admin
| Method | Endpoint                            | Auth  | Description              |
|--------|-------------------------------------|-------|--------------------------|
| GET    | /api/admin/dashboard                | Admin | Stats + charts           |
| GET    | /api/admin/users                    | Admin | List users               |
| PUT    | /api/admin/users/:id/toggle         | Admin | Enable / disable user    |
| PUT    | /api/admin/users/:id/role           | Admin | Change user role         |
| GET    | /api/admin/vendors                  | Admin | List vendors             |
| POST   | /api/admin/vendors                  | Admin | Create vendor            |
| PUT    | /api/admin/vendors/:id              | Admin | Update vendor            |
| DELETE | /api/admin/vendors/:id              | Admin | Soft-delete vendor       |
| PUT    | /api/admin/vendors/:id/toggle       | Admin | Toggle active/inactive   |
| GET    | /api/admin/vendor-categories        | Admin | List vendor categories   |
| POST   | /api/admin/vendor-categories        | Admin | Create vendor category   |
| PUT    | /api/admin/vendor-categories/:id    | Admin | Update vendor category   |
| DELETE | /api/admin/vendor-categories/:id    | Admin | Delete vendor category   |
| GET    | /api/admin/expense-categories       | Admin | List expense categories  |
| POST   | /api/admin/expense-categories       | Admin | Create expense category  |
| PUT    | /api/admin/expense-categories/:id   | Admin | Update expense category  |
| DELETE | /api/admin/expense-categories/:id   | Admin | Delete expense category  |
| GET    | /api/admin/leads                    | Admin | List all leads           |
| GET    | /api/admin/leads/summary            | Admin | Leads per vendor         |
| GET    | /api/admin/contacts                 | Admin | List contact requests    |
| GET    | /api/admin/logs                     | Admin | Admin action logs        |

---

## Key Design Decisions

### Soft Deletes
Every table has a `deleted` boolean column. Nothing is ever hard-deleted. All queries filter `deleted: false`.

### Lead Tracking
Every vendor view, favourite, and contact automatically writes a row to `vendor_leads`. This powers the business model (lead-based vendor billing) and the fair-exposure ranking algorithm.

### Fair-Exposure Ranking
Vendor listings are ordered by `leads ASC` — vendors with fewer total leads appear first, giving newer/smaller vendors equal visibility.

### Overspend Protection
`POST /events/:id/expenses` checks total estimated expenses against `totalBudget` before inserting. Returns a 400 if the new expense would exceed the budget.

### Access Control
- Guest users can browse and view vendors freely
- Login is required for: favouriting, sending inquiries, creating events, accessing the admin panel
- `optionalAuth` middleware is used on vendor routes to track leads for logged-in users without blocking guests

---

## Production Deployment

```bash
# Backend
npm run migrate:deploy   # run migrations in prod (no prompts)
npm run generate         # generate Prisma client
npm start

# Frontends
npm run build            # outputs to /dist
# Serve /dist with nginx or any static host
```

Set `NODE_ENV=production` and use a strong, unique `JWT_SECRET` in production.
