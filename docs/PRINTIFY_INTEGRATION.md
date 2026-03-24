# Printify API – End-to-End Integration Guide

**Purpose:** Let users on your **Results client website** place orders for **custom print shirts**; send those orders to **Printify** for fulfillment; **store and track** all orders in your **admin dashboard**.

**Client-side storefront:** For a single-prompt spec to build the full e-commerce flow on the client site (product list, product detail with size/color/quantity, checkout, create order), see **[CLIENT_PRINTIFY_ECOMMERCE.md](./CLIENT_PRINTIFY_ECOMMERCE.md)**.

---

## 1. Overview

| Component | Role |
|-----------|------|
| **Printify** | Print-on-demand: prints custom designs on shirts and ships to the end customer. |
| **Your client website** | User selects product (e.g. t-shirt), uploads/chooses design, enters shipping address, pays; order is sent to your backend. |
| **Your backend** | Receives order from client → calls Printify API (create order with custom image) → stores order in your DB → later receives webhooks for status/tracking. |
| **Your admin website** | Lists orders, shows status, shows tracking; data comes from your DB (synced via Printify API + webhooks). |

**Important:** Printify API **does not support CORS**. All Printify API calls **must** be made from your **server** (Next.js API routes, Node backend, etc.), never from the browser.

---

## 2. Authentication

### 2.1 Personal Access Token (recommended for single merchant)

- Create a [Printify account](https://printify.com/app/register).
- Go to **My Profile → Connections** and generate a **Personal Access Token**.
- Set scopes: `shops.read`, `catalog.read`, `products.read`, `products.write`, `orders.read`, `orders.write`, `uploads.read`, `uploads.write`, `webhooks.read`, `webhooks.write`.
- Store the token securely (e.g. `PRINTIFY_API_TOKEN` in `.env`). **It is only shown once.**

**Usage:** Send it on every request:

```http
Authorization: Bearer YOUR_PRINTIFY_API_TOKEN
User-Agent: YourAppName
Content-Type: application/json; charset=utf-8
```

**Base URL:** `https://api.printify.com/v1/` (V1) or `https://api.printify.com/v2/` (V2 for some catalog/shipping).

### 2.2 Rate limits

- **Global:** 600 requests per minute.
- **Catalog:** 100 requests per minute (additional).
- **Product publish:** 200 requests per 30 minutes (product creation with order is not limited).
- On exceed: HTTP **429**. Keep error rate &lt; 5% of total requests.

---

## 3. Get your Shop ID

All order and webhook APIs are per **shop**. You must use the correct `shop_id`.

**Request:**

```http
GET https://api.printify.com/v1/shops.json
Authorization: Bearer YOUR_PRINTIFY_API_TOKEN
```

**Response example:**

```json
[
  { "id": 5432, "title": "My Store", "sales_channel": "API" },
  { "id": 9876, "title": "Other Store", "sales_channel": "disconnected" }
]
```

- Create a shop in Printify (My Stores → Add new store → **API** → Connect).
- Note the `id` (e.g. `5432`) and use it as `{shop_id}` in all order/webhook/catalog calls.

---

## 4. Catalog (products and variants for custom shirts)

Catalog is **read-only**: blueprints (blank products), print providers, and variants (color/size).

### 4.1 List blueprints (e.g. t-shirts)

```http
GET https://api.printify.com/v1/catalog/blueprints.json
```

Returns list of blueprints (id, title, brand, model, images). Use this to show “product types” on the client (e.g. “Unisex Heavy Cotton Tee”, “Women's Favorite Tee”).

### 4.2 Print providers for a blueprint

```http
GET https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers.json
```

Returns which print providers can fulfill that product. You need one `print_provider_id` per blueprint for ordering.

### 4.3 Variants (colors/sizes) for a blueprint + print provider

```http
GET https://api.printify.com/v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json
```

Optional: `?show-out-of-stock=1` to include out-of-stock variants.

Returns variants with:

- `id` → use as `variant_id` when submitting order.
- `options` (e.g. color, size).
- `placeholders` → print areas (e.g. `front`, `back`) with `height`/`width` in pixels (for image dimensions).

Use this on the client so the user can pick **color**, **size**, and which **print area** (front/back) the design goes on.

### 4.4 Shipping cost (optional, for price estimate)

```http
POST https://api.printify.com/v1/shops/{shop_id}/orders/shipping.json
Content-Type: application/json
```

Body: same `line_items` and `address_to` structure as in “Submit order” (see below). Use this to show shipping cost before checkout.

---

## 5. Upload custom artwork (user’s design)

Before submitting an order with a **custom** design, the image must be in Printify’s system. Two options:

### 5.1 Upload by URL (recommended, especially for files &gt; 5MB)

```http
POST https://api.printify.com/v1/uploads/images.json
Authorization: Bearer YOUR_PRINTIFY_API_TOKEN
Content-Type: application/json
```

Body:

```json
{
  "file_name": "customer-design.png",
  "url": "https://your-storage.com/customer-designs/abc123.png"
}
```

- Your client uploads the image to **your** storage (S3, Cloudinary, or a Next.js API that stores the file and returns a public URL).
- Your backend then calls this Printify endpoint with that URL. Printify returns an image object with `id` and `preview_url`; use the **image URL** (e.g. `preview_url` or the URL you get from Printify for the image) when building `print_areas` in the order (see below).  
- **Note:** For `print_areas`, Printify expects a **public image URL**. So you can either use the URL you uploaded (if Printify stores it and exposes it) or the URL you passed in; the docs say “upload” stores the file in Media Library. For **create product with order**, `print_areas` accept image **URLs** (see order payload). So in practice: upload via URL → get back `id`/`preview_url`; for order submission you typically use a **public URL** to the image (your CDN or Printify’s preview URL if it’s public). If Printify’s response includes a stable public URL for the image, use that in `print_areas`.

### 5.2 Upload by base64 (small files, &lt; 5MB)

```json
{
  "file_name": "design.png",
  "contents": "base64-encoded-image-data"
}
```

Response includes `id`, `file_name`, `height`, `width`, `preview_url`. For order submission, use a **public image URL** in `print_areas` (e.g. your own URL or, if available, a public URL from Printify for this image).

**Recommended flow:** Client uploads image to your server → server stores it and gets a public URL → server calls Printify “upload by URL” (or you skip upload and use your public URL directly in `print_areas` if Printify accepts external URLs—they do for create-with-order). So: **either** upload to Printify and use their URL, **or** use your own public URL in the order.

---

## 6. Submit an order (custom print shirt)

Two patterns:

- **Order existing product:** You already created a product in the shop; order references `product_id` + `variant_id`.
- **Create product with order (custom design):** No pre-created product; you send blueprint, variant, print provider, and **print_areas** (image URLs). Best for one-off custom shirts from the client site.

Below is the **create product with order** flow (custom shirt with user’s design).

**Endpoint:**

```http
POST https://api.printify.com/v1/shops/{shop_id}/orders.json
Authorization: Bearer YOUR_PRINTIFY_API_TOKEN
Content-Type: application/json; charset=utf-8
```

**Minimal body (create product with order):**

```json
{
  "external_id": "YOUR-ORDER-ID-123",
  "label": "ORD-123",
  "line_items": [
    {
      "print_provider_id": 5,
      "blueprint_id": 9,
      "variant_id": 17887,
      "print_areas": {
        "front": "https://your-cdn.com/design.png"
      },
      "quantity": 1,
      "external_id": "line-1"
    }
  ],
  "shipping_method": 1,
  "send_shipping_notification": true,
  "address_to": {
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com",
    "phone": "+1234567890",
    "country": "US",
    "region": "CA",
    "address1": "123 Main St",
    "address2": "Apt 4",
    "city": "Los Angeles",
    "zip": "90001"
  }
}
```

**Fields:**

| Field | Required | Description |
|-------|----------|-------------|
| `external_id` | Yes | Your unique order ID (from your client/admin DB). Use this to match webhooks and your records. |
| `label` | No | Human-readable order label. |
| `line_items` | Yes | Array of items. For “create with order”: need `print_provider_id`, `blueprint_id`, `variant_id`, `print_areas`, `quantity`. |
| `print_areas` | Yes | Map of print position → image URL. Keys = placeholder positions (e.g. `front`, `back`) from catalog variants. Values = public image URL (or array of objects for advanced positioning). |
| `shipping_method` | Yes | 1 = standard, 2 = priority, 3 = Printify Express, 4 = economy. |
| `address_to` | Yes | Ship-to address. `country` is 2-letter ISO. `email`/`phone` recommended (required for some options e.g. Express). |

**Response:**

```json
{
  "id": "5a96f649b2439217d070f507"
}
```

- Store in your DB: `printify_order_id` = `id`, your `external_id`, customer address, line items, and status = e.g. `pending`.

**Ordering an existing product (no custom image):**

Use the same endpoint with:

```json
"line_items": [
  {
    "product_id": "5bfd0b66a342bcc9b5563216",
    "variant_id": 17887,
    "quantity": 1
  }
]
```

(Get `product_id` from your pre-created products or from listing shop products.)

---

## 7. Get order details and tracking

**Single order:**

```http
GET https://api.printify.com/v1/shops/{shop_id}/orders/{order_id}.json
```

**List orders (paginated):**

```http
GET https://api.printify.com/v1/shops/{shop_id}/orders.json?page=1&limit=10&status=fulfilled
```

Query params: `page`, `limit` (max 10), `status`, `sku`.

**Response** includes:

- `id`, `external_id`, `status`, `address_to`, `line_items`, `total_price`, `total_shipping`, `created_at`, `sent_to_production_at`, `fulfilled_at`
- **`shipments`** (tracking):

```json
"shipments": [
  {
    "carrier": "usps",
    "number": "94001116990045395649372",
    "url": "https://tools.usps.com/go/TrackConfirmAction?tLabels=94001116990045395649372",
    "delivered_at": "2017-04-18T13:24:28+00:00"
  }
]
```

In your admin, store `order_id`, `external_id`, `status`, and when you get shipments (from API or webhook), save `carrier`, `number`, `url`, `delivered_at` so you can show “Track” and delivery status.

---

## 8. Order statuses (for admin display)

| Status | Meaning |
|--------|---------|
| `pending` | Just created; shouldn’t stay long. |
| `on-hold` | Waiting (e.g. payment or validation). |
| `sending-to-production` | Being sent to print provider. |
| `in-production` | Print provider is fulfilling. |
| `fulfilled` | All items fulfilled. |
| `partially-fulfilled` | Some items fulfilled. |
| `canceled` | Canceled. |
| `payment-not-received` | Charge failed. |
| `has-issues` | e.g. bad address. |
| `unfulfillable` | Inventory/technical issue. |

Other possible values: `cost-calculation`, `source-check-failed`, etc. Map these in your admin so users see a clear status and, when available, tracking link.

---

## 9. Webhooks (keep admin in sync and get tracking)

Use webhooks so you don’t have to poll: when an order is created, updated, shipped, or delivered, Printify POSTs to your URL. Your backend updates the order in your DB; admin reads from your DB.

### 9.1 Create webhook

```http
POST https://api.printify.com/v1/shops/{shop_id}/webhooks.json
Content-Type: application/json
```

Body:

```json
{
  "topic": "order:created",
  "url": "https://your-admin-domain.com/api/webhooks/printify"
}
```

Create one subscription per topic. Important topics for orders:

| Topic | When to use |
|-------|-------------|
| `order:created` | New order in Printify (sync to your DB if you don’t create via API). |
| `order:updated` | Status change (pending → in-production → fulfilled, etc.). |
| `order:sent-to-production` | Order sent to print provider. |
| `order:shipment:created` | Shipment created → **tracking number and URL**. |
| `order:shipment:delivered` | Delivery recorded. |

**Example payload (order:shipment:created):**

```json
{
  "id": "uuid",
  "type": "order:shipment:created",
  "created_at": "2022-05-17T15:00:00+00:00",
  "resource": {
    "id": "5a96f649b2439217d070f507",
    "type": "order",
    "data": {
      "shop_id": 815256,
      "carrier": {
        "code": "USPS",
        "tracking_number": "9400110200828911663274",
        "tracking_url": "https://example.com/track/9400110200828911663274"
      },
      "skus": ["6202"]
    }
  }
}
```

Your handler should:

1. Verify signature (see below).
2. Find order in your DB by Printify `resource.id` (or `external_id` if included).
3. Update status and save `tracking_number`, `tracking_url`, `carrier`, and optionally `delivered_at` for `order:shipment:delivered`.

### 9.2 Webhook security (signature)

When creating the webhook you can set a `secret`. Printify signs the body with HMAC-SHA256 and sends it in the header:

```http
X-Pfy-Signature: sha256=<hexdigest>
```

Your backend must:

1. Read raw request body.
2. Compute `HMAC-SHA256(secret, body)` and compare with `X-Pfy-Signature` (constant-time).
3. Return 200 only if valid; otherwise 4xx/5xx (Printify will retry up to 3 times, then block for 1 hour).

---

## 10. End-to-end flow (summary)

### Client website

1. **Product selection:** Call your backend; backend can cache or proxy Printify catalog (blueprints → print providers → variants).
2. **Design:** User uploads design; client sends to your API; you store file and get a public URL (or upload to Printify and get URL).
3. **Checkout:** User enters shipping address, selects size/color (variant_id), maybe shipping method. Optionally call Printify shipping endpoint for shipping cost.
4. **Place order:** Client sends to **your** API: address, variant_id, blueprint_id, print_provider_id, image URL, quantity, your order reference. Your API creates the order in your DB with status `pending`, then calls Printify `POST /v1/shops/{shop_id}/orders.json` with `external_id` = your order id and the same data. On success, save `printify_order_id` and return confirmation to client.

### Your backend (shared by client + admin)

- **Orders:** Persist every order (your id, `external_id`, `printify_order_id`, address, line_items, status, created_at). When you get webhooks, update status and tracking.
- **Webhook route:** e.g. `POST /api/webhooks/printify` — verify signature, parse topic, update order (and optionally notify user with tracking link).
- **Proxy/cache:** Optional: proxy catalog/shipping/order GET to Printify so client never needs the token; token stays on server.

### Admin website

- **List orders:** From your DB (filter by date, status, etc.).
- **Order detail:** Your DB + optional “refresh” that calls `GET .../orders/{order_id}.json` to sync latest status/shipments.
- **Tracking:** Show `shipments[].url` and `number`; “Track” button opens carrier link.

---

## 11. Environment variables (example)

```env
# Printify (server-side only)
PRINTIFY_API_TOKEN=your_personal_access_token
PRINTIFY_SHOP_ID=5432
PRINTIFY_WEBHOOK_SECRET=your_webhook_secret_from_openssl_rand_hex_20
```

Use `PRINTIFY_SHOP_ID` in all shop-scoped API calls and when registering webhooks.

**Admin dashboard:** The **Printify Stock** module (`/dashboard/printify-stock`) lists all products. If the list API returns no variants, the app fetches the full product when you open detail so **color/size** selection **updates the preview image in real time**. **Checkout:** Select variant → see **price** → **Continue to checkout** → fill **shipping address** and **shipping method** (1=Standard, 2=Priority, 3=Express, 4=Economy) → **Place order** (`POST /api/printify/orders`). **Edit product:** `PUT /api/printify/products/[productId]` (title/description). **Design editing** (canvas, front/back) is not in the Printify API. **If you get 404 on PUT:** Restart the dev server so rewrites apply. You can select **color and size** in the product detail; the **preview image updates in real time** when the selected variant has a matching mockup (options with “Show in preview”). Once a variant is selected, **Proceed to checkout** sends you to Orders with product/variant context in the URL (variant ID can be copied). **Edit product** allows updating title and description via the API (requires `products.write` scope and `PUT /api/printify/products/[productId]`).

---

## 12. Quick reference – main APIs

| Action | Method | Endpoint |
|--------|--------|----------|
| Shops | GET | `/v1/shops.json` |
| List products (shop) | GET | `/v1/shops/{shop_id}/products.json` (query: `page`, `limit`) |
| Blueprints | GET | `/v1/catalog/blueprints.json` |

**List products response (per product):** Each product includes `id`, `title`, `description`, `images[]` (mockup URLs, `position`), `variants[]`, `options[]` (name, type: color/size, values with id/title/colors), `print_areas[]` (placeholders with position, decoration_method, images), `views[]` (label, position, files with src), `tags[]`, `created_at`, `updated_at`, `is_locked`, and other fields. The admin Printify Stock module displays these in structured sections (options with color swatches, print areas, views) and a searchable variants table.
| Print providers for blueprint | GET | `/v1/catalog/blueprints/{blueprint_id}/print_providers.json` |
| Variants | GET | `/v1/catalog/blueprints/{blueprint_id}/print_providers/{print_provider_id}/variants.json` |
| Upload image | POST | `/v1/uploads/images.json` |
| Submit order | POST | `/v1/shops/{shop_id}/orders.json` |
| Shipping cost | POST | `/v1/shops/{shop_id}/orders/shipping.json` |
| Get order | GET | `/v1/shops/{shop_id}/orders/{order_id}.json` |
| List orders | GET | `/v1/shops/{shop_id}/orders.json` |
| Create webhook | POST | `/v1/shops/{shop_id}/webhooks.json` |

---

## 13. Troubleshooting

- **404 on PUT `/api/printify/products/[productId]` or GET single product:** The Next.js rewrites in `next.config.mjs` send `/api/printify/*` to the app. **Restart the dev server** after changing `next.config.mjs` so the `beforeFiles` rules apply. If you still see `{ "success": false, "message": "Route not found" }`, the request is being proxied to your backend—confirm the rewrite order and that no other rule matches first.
- **404 from Printify (not from Next):** If the route is hit but Printify returns 404, check that `shop_id` matches the shop that owns the product (e.g. product from shop A, request with `shop_id` of shop B).

---

## 14. Official links

- [Printify API docs](https://developers.printify.com/)
- [API terms](https://printify.com/API-terms/)
- [OpenAPI spec](https://developers.printify.com/openapi.json)
- [Create token](https://printify.com/app/account/api)

This gives you a single end-to-end path: **client places custom shirt order → your backend sends it to Printify and stores it → webhooks update status/tracking → admin shows and tracks orders.**
