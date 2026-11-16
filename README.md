# KITZONE

Premium football jersey storefront, built with React/Vite and Express/MongoDB. Customers browse products and send order requests through the business WhatsApp number configured in admin settings. The business confirms availability, delivery and bank details in chat; customers pay by bank transfer and send the receipt to that same WhatsApp conversation.

## Architecture and implementation plan

### Runtime and boundaries

- `client/`: Vite single-page app. React Router owns public, customer and admin routes; Redux Toolkit owns session state; Axios is the API transport. Product orders are drafted for WhatsApp instead of being submitted through a storefront checkout.
- `server/`: Express REST API under `/api/v1`. Routes are thin, controllers validate inputs and call services/models, and common middleware handles auth, admin roles, rate limits, cookies, errors and request IDs.
- `server/src/models`: Mongoose schemas are the source of truth for products, users, orders, carts, taxonomies and store settings. Order line items and delivery addresses are immutable checkout snapshots.
- MongoDB transactions are used for COD order creation and stock decrement. A replica set is required in production. Development may use a single-node replica set.
- Cloudinary is optional for local/demo use. Product images are represented with URLs and public IDs; the upload service rejects uploads until Cloudinary credentials are supplied.

### Route map

| Area | Routes |
| --- | --- |
| Storefront | `/`, `/shop`, `/products/:slug` |
| Customer | `/login`, `/register`, `/account`, `/orders`, `/orders/:id`, `/wishlist` |
| Support | `/contact`, `/faq`, `/returns`, `/privacy` |
| Admin | `/admin`, `/admin/products`, `/admin/orders`, `/admin/inventory`, `/admin/analytics`, `/admin/settings` |
| API | `/api/v1/auth`, `/products`, `/categories`, `/teams`, `/leagues`, `/cart`, `/wishlist`, `/checkout`, `/orders`, `/payments`, `/reviews`, `/coupons`, `/users`, `/admin` |

### Core API contracts

All API responses use `{ success, data, message, meta? }`; failures use `{ success: false, message, errors? }`. Lists return `data` plus `meta.pagination` with `page`, `limit`, `total` and `pages`. Prices are LKR integers. The browser never submits trusted prices, stock, discounts or payment status. Checkout accepts an address, shipping method, coupon code, and client idempotency key; the server reloads the cart/catalog, validates coupon and inventory, creates a COD order transactionally, and returns the persisted order. Authentication uses a signed HTTP-only cookie. State-changing cookie requests are checked against the exact CORS origin allowlist and SameSite policy for CSRF protection; admin authorization is checked by the API on every protected route.

### MongoDB model map

`User` (role, password hash, addresses); `Product` (catalog metadata, images, sizes/inventory, customisation); `Category`, `Team`, `League`; `Cart` (user or opaque guest ID); `Wishlist`; `Order` (immutable line/address snapshots, lifecycle, totals, idempotency key); `Payment` (provider-neutral status/reference); `Review` (verified purchase); `Coupon`; `Banner`; `InventoryAdjustment`; `StoreSettings`.

### Delivery phases

1. Architecture, runtime config, shared response/error contracts and core schemas.
2. Public catalog, authentication, cart, stock-safe COD checkout and customer order history.
3. Responsive product catalogue, search and filters, product details, WhatsApp order messages and admin settings.
4. Server-guarded admin dashboard, product/order/inventory operations and reporting.
5. Seed data, automated API/UI coverage, deployment guide, build/lint/test verification.

## Getting started

Requirements: Node.js 20.19+ (or 22.12+), npm 10+, MongoDB. The transaction-based checkout requires MongoDB running as a replica set. For local development, `docker compose up -d` starts MongoDB 7; initialise the replica set once with `docker compose exec mongodb mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'`.

```sh
cp server/.env.example server/.env
cp client/.env.example client/.env
npm install
npm run seed -w server
npm run dev
```

Web: `http://localhost:5173`; API: `http://localhost:5000/api/v1`; health: `http://localhost:5000/api/v1/health`.

For Mongo-backed integration tests, set `MONGODB_TEST_URI` to a disposable MongoDB replica-set database before `npm run test -w server`. Without it, API contract/auth guard tests run and database integration scenarios are skipped.

The seed creates demo catalog records and may create an admin only when `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are set. It refuses to promote an existing customer account. No credentials are committed. Demo products and imagery are illustrative and are not represented as officially licensed merchandise.

## Environment variables

See `server/.env.example` and `client/.env.example`. Server variables cover database, cookie/JWT signing, allowed origins, bootstrap admin, optional Cloudinary, shipping configuration and payment adapter mode. Only `VITE_API_URL` is public on the client. Never put secrets in a `VITE_` variable.

## Deployment

1. Provision MongoDB Atlas with replica-set/transaction support, create a restricted database user and allow only the API host.
2. Deploy `server/` as a Node service; configure all server environment variables, HTTPS, exact CORS origins, secure cookies and API health checks.
3. Deploy `client/` to a static host with `VITE_API_URL` pointing to the API. Configure SPA fallback to `index.html` and allow credentialed API requests from the storefront origin.
4. Add Cloudinary credentials to enable server-side image uploads. Until configured, use safe remote demo image URLs.
5. Add the business WhatsApp number in international format in Admin → Settings. Customers use it to place orders and send bank transfer receipts.
6. Set bootstrap credentials for the initial admin, run the seed once, then remove bootstrap credentials from the runtime environment. Rotate keys and passwords before production.

## Current scope and limitations

The application is designed to run locally with MongoDB and uses no bundled brand logos or claims of official licensing. Online gateway settlement, email delivery, SMS OTP, and Cloudinary uploads require external credentials and are disabled until configured. Any unsupported admin action is shown as unavailable rather than presented as complete.
