# Restaurant Ordering Platform — Backend API

A production-ready REST API for a customer-facing restaurant ordering platform built with Node.js, Express, TypeScript, and MongoDB.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [MongoDB Setup](#mongodb-setup)
- [Clerk Setup](#clerk-setup)
- [Paystack Setup](#paystack-setup)
- [Running the Development Server](#running-the-development-server)
- [Running Seed Scripts](#running-seed-scripts)
- [Running Tests](#running-tests)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Paystack Payment Flow](#paystack-payment-flow)
- [Webhook Setup](#webhook-setup)
- [Security](#security)
- [Production Deployment](#production-deployment-considerations)

## Overview

This backend serves a separate Next.js frontend. It handles:
- Customer authentication via Clerk
- Product/menu browsing
- Cart management
- Favorites
- Order creation with price snapshots
- Online payment via Paystack
- Pickup or home delivery
- Order history
- Blog
- Contact/feedback with email notification
- WhatsApp order link generation

There is NO admin dashboard, staff management, or cash payment in V1.

## Tech Stack

- **Node.js** + **Express.js** + **TypeScript**
- **MongoDB** + **Mongoose**
- **Clerk** for authentication
- **Paystack** for online payments
- **Nodemailer** for email
- **Zod** for validation
- **Helmet**, **CORS**, **express-rate-limit**, **express-mongo-sanitize**, **hpp** for security

## Architecture

```
                    ┌─────────────────┐
                    │    Next.js      │
                    │    Frontend     │
                    └────────┬────────┘
                             │
                       REST API / HTTPS
                             │
                             ▼
                    ┌─────────────────┐
                    │ Express + TS    │
                    │    Backend      │
                    └───────┬─────────┘
                            │
             ┌──────────────┼───────────────┐
             │              │               │
             ▼              ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌──────────┐
        │ MongoDB │    │ Clerk   │    │ Paystack │
        └─────────┘    └─────────┘    └──────────┘
                                           │
                                           ▼
                                      Online Payment
```

### Folder Structure

```
src/
├── config/
│   ├── env.ts
│   └── database.ts
├── middlewares/
│   ├── auth.ts
│   ├── errorHandler.ts
│   └── validate.ts
├── modules/
│   ├── users/
│   ├── products/
│   ├── cart/
│   ├── favorites/
│   ├── orders/
│   ├── payments/
│   ├── blogs/
│   └── contact/
├── utils/
├── app.ts
├── server.ts
└── seed.ts
```

Each module follows the pattern: `model.service.ts → service.ts → controller.ts → routes.ts → validation.ts`

Controllers are thin — business logic lives in services.

## Installation

```bash
# Clone the project
cd restaurant-ordering-backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your actual credentials
```

## Environment Variables

See `.env.example` for the full list:

```env
NODE_ENV=development
PORT=5000

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/restaurant_ordering

# Clerk Authentication
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=

# Paystack
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_BASE_URL=https://api.paystack.co
PAYSTACK_WEBHOOK_SECRET=

# Delivery fee in naira
DELIVERY_FEE=1000

# WhatsApp (international format without +, e.g. 2348012345678)
RESTAURANT_WHATSAPP_NUMBER=

# Email (SMTP)
EMAIL_HOST=
EMAIL_PORT=
EMAIL_USER=
EMAIL_PASSWORD=
RESTAURANT_EMAIL=

# CORS — your frontend URL
CLIENT_ORIGIN=http://localhost:3000
```

**Important:** Never commit `.env` to git. Never prefix secret keys with `NEXT_PUBLIC_`. The Paystack secret key must NEVER be exposed to the frontend.

## MongoDB Setup

1. Install MongoDB locally or use MongoDB Atlas.
2. Set `MONGODB_URI` in `.env` to your connection string.
3. The backend will connect automatically on startup.

## Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com).
2. Enable email/password and Google sign-in.
3. Copy the **Secret Key** and **Publishable Key** to your `.env`:
   - `CLERK_SECRET_KEY`
   - `CLERK_PUBLISHABLE_KEY`
4. The backend uses `@clerk/express` middleware to verify session tokens.
5. The frontend should send the Clerk session token in the `Authorization` header as a Bearer token.

### How Clerk Integration Works

- The frontend authenticates the user through Clerk.
- On every API request, the frontend sends the Clerk session token.
- The `@clerk/express` middleware verifies the token and populates `req.auth.userId`.
- The backend's `requireAuth` middleware loads the matching MongoDB user document.
- If the user doesn't exist in MongoDB yet (e.g., first Google sign-in), the backend auto-provisions a user document using the Clerk user's data.

### User Sync Endpoint

After a user signs up or logs in through Clerk on the frontend, call:

```
POST /api/v1/users/sync
```

With the user's full name, email, phone, and WhatsApp number. This ensures a matching MongoDB document exists.

## Paystack Setup

1. Create a Paystack account at [paystack.com](https://paystack.com).
2. Switch to **Test Mode** for development.
3. Copy your **Secret Key** and **Public Key** to `.env`:
   - `PAYSTACK_SECRET_KEY`
   - `PAYSTACK_PUBLIC_KEY`
4. Set up a webhook URL (see [Webhook Setup](#webhook-setup)).
5. Copy your webhook secret to `PAYSTACK_WEBHOOK_SECRET`.

### Test Cards

- Successful payment: `4084 0840 8408 4081`
- Failed payment: `4084 0000 0000 0002`
- CVV: any 3 digits
- Expiry: any future date

## Running the Development Server

```bash
npm run dev
```

The server starts on `http://localhost:5000` (or the port in `.env`).

## Running Seed Scripts

Seed the database with sample products and blog posts:

```bash
npm run seed
```

This inserts:
- 10 sample products across categories (Rice, Protein, Soups, Swallow, Sides, Snacks, Drinks)
- 3 blog posts

No real customer data or Paystack credentials are seeded.

## Running Tests

```bash
npm test
```

Tests use an in-memory MongoDB instance (`mongodb-memory-server`) — no real database connection required.

### Test Coverage

- **Authentication:** Protected routes reject unauthenticated requests; customer can only access their own resources
- **Cart:** Add product, update quantity, remove product
- **Orders:** Correct subtotal calculation, pickup has ₦0 delivery fee, delivery includes configured fee, order snapshots product price, customer cannot access another user's order
- **Payments:** Payment initialized correctly, amount verification, idempotent payment processing, unique reference enforcement, incorrect amount rejection
- **Favorites:** Duplicate prevention via unique index
- **Phone normalization:** Nigerian phone number normalization
- **Order number generation:** Sequential ORD-00001, ORD-00002...

## API Endpoints

All endpoints are prefixed with `/api/v1`.

### Authentication

Authentication is handled by Clerk. The frontend sends the Clerk session token in the `Authorization` header:

```
Authorization: Bearer <clerk-session-token>
```

Protected endpoints require this header. The backend never trusts a user ID from the request body.

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/users/sync` | Required | Sync/create MongoDB user from Clerk |
| GET | `/api/v1/users/me` | Required | Get current user profile |
| PATCH | `/api/v1/users/me` | Required | Update profile (name, phone, WhatsApp, address) |

**POST /api/v1/users/sync**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "whatsapp": "08012345678"
}
```

**PATCH /api/v1/users/me**
```json
{
  "fullName": "John Doe",
  "phone": "08012345678",
  "whatsapp": "08012345678",
  "address": {
    "street": "123 Main St",
    "city": "Lagos",
    "state": "Lagos",
    "additionalInfo": "Apartment 4B"
  }
}
```

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/products` | Public | List products (paginated, filterable) |
| GET | `/api/v1/products/categories` | Public | List all categories |
| GET | `/api/v1/products/:id` | Public | Get a single product |

**Query parameters for listing:**
- `page` — page number (default: 1)
- `limit` — items per page (default: 20, max: 100)
- `category` — filter by category
- `search` — text search on product name
- `available` — `"true"` or `"false"`

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/cart` | Required | Get current user's cart |
| POST | `/api/v1/cart` | Required | Add product to cart |
| PATCH | `/api/v1/cart/:productId` | Required | Update item quantity |
| DELETE | `/api/v1/cart/:productId` | Required | Remove item from cart |
| DELETE | `/api/v1/cart` | Required | Clear entire cart |

**POST /api/v1/cart**
```json
{
  "productId": "64a1b2c3d4e5f6...",
  "quantity": 2
}
```

**PATCH /api/v1/cart/:productId**
```json
{
  "quantity": 3
}
```

### Favorites

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/favorites` | Required | List user's favorites |
| POST | `/api/v1/favorites` | Required | Add product to favorites |
| DELETE | `/api/v1/favorites/:productId` | Required | Remove from favorites |

**POST /api/v1/favorites**
```json
{
  "productId": "64a1b2c3d4e5f6..."
}
```

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/orders` | Required | Create a new order |
| GET | `/api/v1/orders` | Required | List user's orders (paginated) |
| GET | `/api/v1/orders/:id` | Required | Get a single order |
| GET | `/api/v1/orders/:id/whatsapp` | Required | Get WhatsApp pre-filled link for order |

**POST /api/v1/orders**

The backend calculates subtotal, delivery fee, and total — never trusts amounts from the frontend.

```json
{
  "items": [
    { "productId": "64a1b2c3...", "quantity": 2 },
    { "productId": "64a1b2c4...", "quantity": 1 }
  ],
  "deliveryMethod": "delivery",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Lagos",
    "state": "Lagos",
    "additionalInfo": "Apartment 4B"
  }
}
```

For pickup orders:
```json
{
  "items": [...],
  "deliveryMethod": "pickup"
}
```

For delivery using saved address:
```json
{
  "items": [...],
  "deliveryMethod": "delivery",
  "useDefaultAddress": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "orderNumber": "ORD-00001",
    "items": [
      { "product": "...", "name": "Jollof Rice", "price": 3500, "quantity": 2 }
    ],
    "subtotal": 7000,
    "deliveryFee": 1000,
    "totalAmount": 8000,
    "deliveryMethod": "delivery",
    "deliveryAddress": {...},
    "orderStatus": "placed",
    "paymentStatus": "pending",
    "timeline": [...]
  }
}
```

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/initialize` | Required | Initialize Paystack payment |
| GET | `/api/v1/payments/verify/:reference` | Public | Verify a payment |
| POST | `/api/v1/payments/webhook` | Public (signature-verified) | Paystack webhook handler |

**POST /api/v1/payments/initialize**
```json
{
  "orderId": "64a1b2c3d4e5f6..."
}
```

The backend:
1. Verifies the order belongs to the authenticated user
2. Uses the order's backend-calculated `totalAmount`
3. Creates a pending Payment record
4. Initializes a Paystack transaction
5. Returns the Paystack authorization URL

**Response:**
```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "ORD-ORD-00001-1234567890-abcd1234",
    "accessCode": "..."
  }
}
```

**GET /api/v1/payments/verify/:reference**

Verifies the transaction through Paystack's API. Confirms:
- Transaction exists
- Reference matches
- Transaction succeeded
- Amount matches our expected order amount
- Payment belongs to the correct order

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "status": "paid",
    "reference": "..."
  }
}
```

### Blogs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/blogs` | Public | List published blog posts (paginated) |
| GET | `/api/v1/blogs/:slug` | Public | Get a blog post by slug |

**Query parameters:**
- `page` — page number (default: 1)
- `limit` — items per page (default: 20)

### Contact

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/contact` | Public (rate-limited) | Submit a contact/feedback message |

**POST /api/v1/contact**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "message": "I love your food!"
}
```

The message is stored in MongoDB and an email notification is sent to the restaurant email.

### Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Description of the error"
}
```

Status codes used:
- `400` Bad Request
- `401` Unauthorized
- `403` Forbidden
- `404` Not Found
- `409` Conflict
- `422` Validation Error
- `500` Internal Server Error

## Authentication Flow

```
Frontend (Clerk SDK)
   ↓
User signs up / logs in via Clerk
   ↓
Clerk returns session token
   ↓
Frontend calls POST /api/v1/users/sync
   ↓
Backend creates/finds MongoDB user by clerkUserId
   ↓
Frontend sends Authorization: Bearer <token> on every request
   ↓
@clerk/express middleware verifies token → req.auth.userId
   ↓
requireAuth middleware loads MongoDB user document
   ↓
Business logic proceeds with authenticated user
```

## Paystack Payment Flow

```
Customer
   ↓
Next.js frontend
   ↓
Create order: POST /api/v1/orders
   ↓
Express backend
   ↓
Validate user
   ↓
Validate products & retrieve current prices from MongoDB
   ↓
Calculate subtotal (from DB prices, NOT frontend)
   ↓
Calculate delivery fee (from config)
   ↓
Calculate total
   ↓
Create Order (status=placed, payment=pending)
   ↓
Initialize payment: POST /api/v1/payments/initialize
   ↓
Backend verifies order belongs to user
   ↓
Create Payment record (status=pending)
   ↓
Initialize Paystack transaction (with backend-calculated amount)
   ↓
Return Paystack authorization URL
   ↓
Next.js redirects customer to Paystack
   ↓
Customer completes payment
   ↓
Paystack webhook → POST /api/v1/payments/webhook
   ↓
Express backend verifies signature
   ↓
Verify transaction reference & amount
   ↓
Payment = paid
   ↓
Order paymentStatus = paid
```

### Payment Failure

If payment fails:
- `Payment.status = failed`
- `Order.paymentStatus = failed`
- The order is NOT deleted
- The customer can retry payment via `POST /api/v1/payments/initialize`

### Amount Security

The backend NEVER trusts `totalAmount`, `subtotal`, `deliveryFee`, or `paymentStatus` from the frontend. All amounts are calculated from current MongoDB product prices and configured delivery fees.

### Payment Retry

A failed order can be retried by calling `POST /api/v1/payments/initialize` again with the same `orderId`. A new Payment record with a new reference is created.

## Webhook Setup

1. Go to your Paystack dashboard → Settings → Webhooks
2. Add the webhook URL: `https://your-domain.com/api/v1/payments/webhook`
3. Copy the **Webhook Secret** and set it as `PAYSTACK_WEBHOOK_SECRET` in `.env`
4. The backend verifies the `x-paystack-signature` header using HMAC SHA512

### Webhook Idempotency

The webhook handler is idempotent:
- If the same event is received multiple times, it will not create duplicate payment records
- Payment status updates use `findOneAndUpdate` with a `status: { $ne: 'paid' }` filter
- Duplicate `charge.success` events for an already-paid payment are safely ignored

### Webhook Events Handled

- `charge.success` — marks payment as paid, updates order payment status
- `charge.failed` — marks payment as failed

## Security

- **Helmet** — sets security-related HTTP headers
- **CORS** — configured to only allow the frontend origin
- **Rate limiting** — global (300 req/15min) and contact endpoint (10 req/hour)
- **express-mongo-sanitize** — prevents NoSQL injection
- **hpp** — prevents HTTP parameter pollution
- **Input validation** — all inputs validated with Zod
- **Auth middleware** — every protected route verifies the Clerk session
- **Ownership checks** — users can only access their own cart, orders, favorites, and payments
- **Paystack secret key** — only used on the backend, never exposed to frontend
- **Webhook signature verification** — HMAC SHA512 verification of all webhook payloads
- **Amount verification** — payment amounts verified against order amounts in kobo
- **No stack traces** in production responses

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a production MongoDB instance (MongoDB Atlas recommended)
3. Set real Clerk, Paystack, and SMTP credentials
4. Set `CLIENT_ORIGIN` to your production frontend URL
5. Set `PAYSTACK_WEBHOOK_SECRET` with your Paystack webhook secret
6. Run `npm run build` to compile TypeScript
7. Run `npm start` to start the production server
8. Set up a reverse proxy (Nginx) with HTTPS
9. Configure Paystack webhook URL to your production domain
10. Enable Clerk production mode
11. Set up proper SMTP for email notifications

### Build

```bash
npm run build
npm start
```

The compiled output goes to `dist/`.
