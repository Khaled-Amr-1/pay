# Paymob Integration API 💳

A serverless backend service built with [Hono](https://hono.dev/) and deployed on Cloudflare Workers. This service handles payment intentions via Paymob, secures webhooks using HMAC, and manages or[...]

## 🚀 Features

* **Serverless Architecture:** Fast and edge-ready using Cloudflare Workers.
* **Payment Gateway:** Seamless integration with Paymob (Accept) for card payments.
* **Secure Webhooks:** Verifies Paymob transactions using HMAC SHA-512 signatures to prevent data spoofing.
* **Database Integration:** Direct connection to Supabase for reading products and updating order statuses.
* **Type-Safe:** Written entirely in TypeScript.
* **Automated Testing:** High ROI integration and unit tests using Vitest.
* **CI/CD:** GitHub Actions workflows are included to run tests and publish the project (see .github/workflows/).

## 🛠️ Tech Stack

* **Framework:** Hono
* **Runtime/Deployment:** Cloudflare Workers (Wrangler)
* **Database:** Supabase (PostgreSQL)
* **Testing:** Vitest

This stack was choosen for faster delivery and high reliability


---

## 🗄️ Database Schema (Supabase)

This project relies on the following core tables in Supabase:

### `products`
Stores the products available for purchase.

| Column  | Type      | Constraints / Details |
| :---    | :---      | :---                  |
| `id`    | `uuid`    | **Primary Key**, Default: `gen_random_uuid()` |
| `name`  | `text`    | |
| `price` | `integer` | Price in cents (as required by Paymob) |
| `pic`   | `text`    | URL or path to product image |

### `users`
Extends the default Supabase auth user with application-specific details.

| Column       | Type         | Constraints / Details |
| :---         | :---         | :---                  |
| `id`         | `uuid`       | **Primary Key**, **Foreign Key** to `auth.users.id` |
| `name`       | `text`       | |
| `email`      | `text`       | |
| `created_at` | `timestamptz`| Default: `CURRENT_TIMESTAMP` |
| `updated_at` | `timestamptz`| Default: `CURRENT_TIMESTAMP` |

### `orders`
Logs the payment intentions and their current status from Paymob Webhooks.

| Column            | Type      | Constraints / Details |
| :---              | :---      | :---                  |
| `id`              | `uuid`    | **Primary Key**, Default: `gen_random_uuid()` |
| `user_id`         | `uuid`    | **Foreign Key** to `auth.users.id`, NOT NULL |
| `billing_data`    | `jsonb`   | Stores `{ firstName, lastName, phone }`, NOT NULL |
| `paymob_order_id` | `integer` | ID returned from Paymob Intent API, NOT NULL |
| `status`          | `enum`    | e.g., `PaymentPending`, `PaymentReceived`, `PaymentFailed` |

---

## ⚙️ Environment Variables

To run this project locally or deploy it, you must configure the following environment variables. Create a `.dev.vars` file in the root directory for local development:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SECRET_KEY=your_supabase_service_role_key
PAYMOB_SECRET_KEY=your_paymob_secret_key
PAYMOB_PUBLIC_KEY=your_paymob_public_key
HMAC_SECRET=your_paymob_hmac_secret

```

---

## 💻 Getting Started

### 1. Install Dependencies

```bash
npm install

```

### 2. Run Locally

Start the local Cloudflare Worker development server:

```bash
npm run dev

```

---

## 📖 API Reference

### 1. Create Payment Intention

* **Endpoint:** `POST /pay`
* **Description:** Fetches product price from Supabase, creates a payment intent on Paymob, and logs a pending order.
* **Headers:** Requires Authentication.
* **Body:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Hassan",
  "phone": "01012345678",
  "id": "product_uuid_here"
}

```


* **Response (200 OK):**
```json
{
  "data": {
    "clientSecret": "secret_xyz...",
    "publicKey": "pub_xyz..."
  }
}

```


* **Error Responses:**
* `400 Bad Request`: Missing required fields.
* `500 Internal Server Error`: Database connection issues.
* `502 Bad Gateway`: Paymob service is currently unavailable.



### 2. Paymob Webhook Callback

* **Endpoint:** `POST /webhook?hmac={hmac_string}`
* **Description:** Receives transaction updates from Paymob, verifies the HMAC SHA-512 signature to prevent spoofing, and updates the order status in Supabase.
* **Security:** Returns `401 Unauthorized` if the HMAC signature is invalid.

---

## 🧪 Testing

This project uses Vitest for integration and unit testing, focusing on high-ROI scenarios to ensure the reliability of the payment flow and webhook security without over-testing external librarie[...]

To run the test suite:

```bash
npm test

```

Note: A GitHub Actions workflow is included to run the test suite automatically on pushes and pull requests — check the `.github/workflows/` directory for details.

---

## 🚢 Deployment

Deploy the worker to your Cloudflare account using Wrangler:

```bash
npm run deploy

```

A GitHub Actions workflow is also included to help publish or deploy the project automatically (see `.github/workflows/`).

---

**Author:** Khaled Amr
