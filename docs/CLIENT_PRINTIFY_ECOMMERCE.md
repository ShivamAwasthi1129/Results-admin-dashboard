# Client-Side Printify E-Commerce – Implementation Guide & Single Prompt

This document describes how to build the **client-facing storefront** so users can browse Printify products, choose size/color/quantity, and place orders via a checkout page. It ends with **one copy-paste prompt** you can give to an AI or developer to implement the full flow in a single pass.

---

## 1. E-Commerce Flow (What to Build)

| Step | Page / Component | What the user does |
|------|------------------|--------------------|
| 1 | **Store / Shop** | Sees a grid of products (images, title, price if available). Clicks a product. |
| 2 | **Product detail** | Sees product images, description; selects **size**, **color**, and **quantity**; adds to cart or “Buy now”. |
| 3 | **Cart** (optional) | Reviews one or more line items (product, variant, quantity); can edit quantity or remove; proceeds to checkout. |
| 4 | **Checkout** | Fills shipping form (name, email, phone, address, city, region, zip, country) and selects **shipping method**; places order. |
| 5 | **Confirmation** | Sees order success and optional order reference; can be redirected to home or orders. |

All Printify API calls **must** go through **your backend** (no CORS from Printify). The client only calls **your** API (same Next.js app or your separate backend that proxies to Printify).

---

## 2. API Base URL and Shop ID

- **Base URL:** Your backend base (e.g. `https://your-domain.com` if the client is on the same app, or `https://your-api.com` if separate). All paths below are relative to this base.
- **Shop ID:** One Printify shop. Get it from your admin (Printify Stock → shop selector) or from `GET /api/printify/shops`. Use the same `shop_id` for list products, product detail, and create order.

Example: if base is `https://mysite.com`, then list products is  
`GET https://mysite.com/api/printify/products?shop_id=26782803&page=1&limit=24`.

---

## 3. API Endpoints the Client Uses

### 3.1 List shops (optional – to get default shop)

```http
GET /api/printify/shops
```

**Response (success):**  
`{ "success": true, "data": { "shops": [ { "id": 26782803, "title": "My Store", "sales_channel": "API" } ] } }`

Use `shops[0].id` as default `shop_id` if you don’t hardcode it.

---

### 3.2 List products (store grid)

```http
GET /api/printify/products?shop_id={shop_id}&page=1&limit=24
```

**Response (success):**  
`{ "success": true, "data": { "products": [ ... ], "total": 50, "page": 1, "limit": 24 } }`

**Product (list item):**  
`id`, `title`, `description`, `images[]` (e.g. `{ src, position, variant_ids[] }`), `variants[]` (id, options, cost, price, etc.), `options[]` (e.g. `name: "Size"`, `type: "size"`, `values[]` with `id`, `title`; or `name: "Color"`, `type: "color"`, `values[]` with `id`, `title`, `colors`). Use `images` for thumbnails; use `options` and `variants` for size/color and pricing.

---

### 3.3 Get single product (detail page – variants, options, images)

```http
GET /api/printify/products/{productId}?shop_id={shop_id}
```

**Response (success):**  
`{ "success": true, "data": { ...full product... } }`

**Use for:**
- **Images:** `data.images[]` (mockups per variant/position); pick by selected variant’s `variant_ids` if needed.
- **Options:** `data.options[]` – e.g. `name: "Size"`, `values[]` with `id`, `title`; `name: "Color"`, `values[]` with `id`, `title`, `colors` (hex). Render size dropdown and color swatches.
- **Variants:** `data.variants[]` – each has `id`, `options` (e.g. `Size: 123`, `Color: 456`), `cost`, `price`, `is_available`. Map user’s chosen size + color to one `variant.id` (variant_id) for the order.
- **Title, description:** `data.title`, `data.description`.

---

### 3.4 Create order (checkout submit)

```http
POST /api/printify/orders
Content-Type: application/json
```

**Request body:**

```json
{
  "shop_id": "26782803",
  "external_id": "optional-your-order-ref",
  "label": "Optional label",
  "line_items": [
    {
      "product_id": "5b05842f3921c9547531758d",
      "variant_id": 17887,
      "quantity": 2
    }
  ],
  "shipping_method": 1,
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
  },
  "send_shipping_notification": true
}
```

**Required:**  
`shop_id`, `line_items` (array of `{ product_id, variant_id, quantity }`), `shipping_method`, `address_to` (with `first_name`, `last_name`, `email`, `country`, `address1`, `city`, `zip`; `phone`, `region`, `address2` recommended).

**shipping_method:**  
`1` = Standard, `2` = Priority, `3` = Express, `4` = Economy.

**Response (success):**  
`{ "success": true, "data": { "order_id": "5a96f649b2439217d070f507", "external_id": "..." } }`

**Response (error):**  
`{ "success": false, "error": "message" }` with status 4xx/5xx.

---

## 4. Data Summary for Implementation

- **Product (list):** `id`, `title`, `images[]`, `options[]`, `variants[]`.
- **Product (detail):** Same plus full `variants[]` (each with `id`, `options` map, `price`/`cost`, `is_available`) and `options[]` for size/color UI.
- **Variant selection:** User picks one option per `options[].name` (e.g. Size, Color); find the variant whose `options` match those values; use that variant’s `id` as `variant_id` in `line_items`.
- **Cart / line_items:** Each item = `{ product_id: string, variant_id: number, quantity: number }`. `product_id` = product `id`; `variant_id` = chosen variant `id`.
- **address_to:** Object with `first_name`, `last_name`, `email`, `phone`, `country`, `region`, `address1`, `address2`, `city`, `zip` (all strings; country 2-letter ISO).

---

## 5. Single Prompt – Implement Full Client E-Commerce in One Go

Copy the block below and use it as **one prompt** to implement the entire client-side Printify flow (store, product detail with size/color/quantity, checkout, create order).

---

```
Build a complete client-side e-commerce flow for Printify products on our website.

Context:
- Our backend exposes Printify via these endpoints (all requests go to our API; no direct Printify calls from the browser):
  - GET /api/printify/shops → { success, data: { shops: [ { id, title } ] } }
  - GET /api/printify/products?shop_id={id}&page=1&limit=24 → { success, data: { products[], total, page, limit } }
  - GET /api/printify/products/{productId}?shop_id={id} → { success, data: <full product with images, options, variants> }
  - POST /api/printify/orders → body: { shop_id, line_items: [ { product_id, variant_id, quantity } ], shipping_method (1–4), address_to: { first_name, last_name, email, phone?, country, region?, address1, address2?, city, zip } }; response: { success, data: { order_id, external_id } } or { success: false, error }
- Use a fixed shop_id for now (e.g. from env NEXT_PUBLIC_PRINTIFY_SHOP_ID or hardcode one). Optionally call GET /api/printify/shops once to get the first shop id.
- Product list items have: id, title, description, images[], options[] (name, type, values with id/title/colors), variants[] (id, options map, price/cost, is_available).
- Variant selection: user picks one value per option (e.g. Size + Color); find the variant whose options match; use variant.id as variant_id in line_items. product_id is the product’s id.

Requirements (implement all in one pass):

1) Store / product list page
- Fetch GET /api/printify/products?shop_id=...&page=1&limit=24 (or 20).
- Show a responsive grid of products: image (first product image or first variant image), title, and price if available (from first variant or first with price).
- Each card links to the product detail page (e.g. /store/[productId] or /products/[productId]).
- Handle loading and error states; show a message if no products.

2) Product detail page
- Fetch GET /api/printify/products/[productId]?shop_id=...
- Show: main image(s), title, description.
- Options: render Size and Color from data.options (dropdown for size, swatches or dropdown for color using values[].title and optionally values[].colors).
- Quantity: number input (min 1, reasonable max e.g. 10).
- “Add to cart” and/or “Buy now” (add to cart then redirect to checkout). When user changes size/color, resolve to the single matching variant (variant.id); if no variant matches or variant is unavailable, disable add/buy and show a short message.
- Store in cart: { product_id, variant_id, quantity } plus product title and variant label for display (e.g. in localStorage or React state/context).

3) Cart (optional but recommended)
- Page or slide-out showing line items: product title, chosen variant (e.g. “Size M / Color Blue”), quantity, optional price if you have it.
- Allow update quantity and remove item.
- “Proceed to checkout” → go to checkout page with current cart as line_items.

4) Checkout page
- Form fields: first_name, last_name, email, phone (optional but recommended), address1, address2 (optional), city, region/state, zip, country (dropdown or input; 2-letter ISO).
- Shipping method: radio or select with options 1=Standard, 2=Priority, 3=Express, 4=Economy (you can label them e.g. “Standard”, “Priority”, etc.).
- Validate required fields (first_name, last_name, email, country, address1, city, zip) before submit.
- On submit: POST /api/printify/orders with body { shop_id, line_items: cart items as [ { product_id, variant_id, quantity } ], shipping_method: number, address_to: form fields }. Use external_id or label if you want (e.g. client-side order ref).
- On success: show confirmation with order_id or “Order placed successfully”; clear cart; optional redirect to home or “My orders”.
- On error: show API error message (response.error).

5) Technical
- Use the same API base URL as the rest of the site (relative /api/... if same origin, or full URL from env like NEXT_PUBLIC_API_URL).
- Ensure no direct calls to api.printify.com from the browser (all via our backend).
- Prefer responsive layout and clear CTAs; keep product detail and checkout forms accessible (labels, basic validation).
- If the stack is React/Next: use client-side fetch for all API calls; store shop_id in env or from GET /api/printify/shops once; cart can be React context + localStorage persistence.

Implement the full flow so a user can: open the store → click a product → choose size, color, quantity → add to cart → go to checkout → fill address and shipping method → place order → see confirmation. Do everything in one implementation pass.
```

---

## 6. After Using the Prompt

- Set **NEXT_PUBLIC_PRINTIFY_SHOP_ID** (or your chosen env name) on the client if you use it, or ensure the backend has **PRINTIFY_SHOP_ID** and the client sends the same `shop_id` in list/detail/order calls.
- Ensure the client’s origin is allowed if your API runs on a different domain (CORS).
- Test: list products → open one → select size/color/quantity → add to cart → checkout → place order; confirm the order appears in the admin (Printify Stock → My orders).

---

## 7. Reference: Order Creation Payload (Quick Copy)

```json
{
  "shop_id": "YOUR_SHOP_ID",
  "line_items": [
    { "product_id": "PRODUCT_ID_FROM_API", "variant_id": 12345, "quantity": 1 }
  ],
  "shipping_method": 1,
  "address_to": {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "country": "US",
    "region": "NY",
    "address1": "123 Main St",
    "address2": "",
    "city": "New York",
    "zip": "10001"
  }
}
```

This document and the single prompt above are enough to implement the full client-side Printify e-commerce flow in one go.
