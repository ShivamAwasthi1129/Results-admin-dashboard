# Products API – External Integration (Read & Update)

Use this API from your other website to **list products**, **get a single product**, and **update products** (e.g. to book/reserve items). **Create** and **Delete** are not exposed for external use.

---

## Base URL

```
https://your-results-portal.com
```

Replace with your actual domain (e.g. `http://localhost:3000` in development).

---

## Authentication

All requests must include a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <your_token>
```

- **How to get a token:** Log in as an **admin** or **super_admin** via this project’s `/api/auth/login` and use the returned `token` in the header.
- **External website:** Your other site’s **backend** should hold this token (or a dedicated service-account token) and call the Products API from the server. Do not send this token from the browser to your public site; keep it server-side.

---

## 1. List Products (READ)

### Request

```
GET /api/products
```

### Query parameters

| Parameter   | Type   | Default | Description                                      |
|------------|--------|--------|--------------------------------------------------|
| `page`     | number | 1      | Page number                                      |
| `limit`    | number | 20     | Items per page                                   |
| `search`   | string | -      | Search in name, description, SKU, barcode, tags  |
| `category` | string | -      | Filter by category (see categories below)        |
| `status`   | string | -      | `active` \| `inactive` \| `discontinued` \| `out_of_stock` |
| `brand`    | string | -      | Filter by brand (partial match)                  |
| `featured` | boolean| -      | `true` to return only featured products         |

**Categories:** `shoes`, `boots`, `jackets`, `watches`, `shirts`, `safety_suits`, `safety_equipment`, `accessories`, `other`

### Example

```http
GET /api/products?page=1&limit=10&category=shoes&status=active
Authorization: Bearer <token>
```

### Success response (200)

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "product_mongo_id",
        "id": "product_mongo_id",
        "name": "Product Name",
        "description": "Product description",
        "sku": "SKU001",
        "barcode": "123456789",
        "category": "shoes",
        "subcategory": "Work Boots",
        "costPrice": 50,
        "sellingPrice": 79.99,
        "discount": 0,
        "taxRate": 0,
        "stock": {
          "quantity": 100,
          "lowStockThreshold": 10,
          "reservedQuantity": 5,
          "availableQuantity": 95,
          "reorderPoint": 20,
          "maxStock": 200
        },
        "brand": "BrandName",
        "model": "Model-X",
        "size": ["8", "9", "10"],
        "color": ["Black", "Brown"],
        "material": "Leather",
        "images": [
          { "url": "https://...", "alt": "Main", "isPrimary": true }
        ],
        "keyFeatures": ["Waterproof", "Steel toe"],
        "status": "active",
        "isFeatured": false,
        "tags": ["safety", "work"],
        "createdAt": "2025-01-01T00:00:00.000Z",
        "updatedAt": "2025-01-15T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

### Error responses

- **401** – Missing or invalid token
- **500** – Server error (`error` in body)

---

## 2. Get One Product (READ)

### Request

```
GET /api/products/:id
```

`id` = product `_id` (MongoDB ObjectId string).

### Example

```http
GET /api/products/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

### Success response (200)

```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Product Name",
      "description": "...",
      "sku": "SKU001",
      "category": "shoes",
      "sellingPrice": 79.99,
      "stock": {
        "quantity": 100,
        "reservedQuantity": 5,
        "availableQuantity": 95
      },
      "images": [...],
      "status": "active"
    }
  }
}
```

### Error responses

- **401** – Unauthorized
- **404** – `"Product not found"`
- **500** – Server error

---

## 3. Update Product (UPDATE) – e.g. for booking

Use this to change a product, including **stock** and **reserved quantity** for bookings.

### Request

```
PUT /api/products/:id
Content-Type: application/json
Authorization: Bearer <token>
```

Send **only the fields you want to change**. Unlisted fields stay as they are.

### Booking by updating reserved quantity

To “book” or reserve units, increase `reservedQuantity` and optionally reduce `quantity` if you actually remove stock:

```json
{
  "stock": {
    "quantity": 95,
    "reservedQuantity": 10,
    "lowStockThreshold": 10,
    "reorderPoint": 20,
    "maxStock": 200
  }
}
```

- `availableQuantity` is computed as `quantity - reservedQuantity` by the API; you don’t need to send it.
- Your backend should:
  1. `GET /api/products/:id` to read current `stock.quantity` and `stock.reservedQuantity`.
  2. Check `availableQuantity >= unitsToBook`.
  3. `PUT /api/products/:id` with `stock.reservedQuantity = currentReserved + unitsToBook` (and `stock.quantity` if you reduce it).

### Other updatable fields (examples)

You can send any subset of:

- `name`, `description`, `category`, `subcategory`
- `sellingPrice`, `discount`, `taxRate`
- `stock` (see above)
- `brand`, `model`, `size`, `color`, `material`
- `images`, `keyFeatures`, `tags`
- `status` (`active` | `inactive` | `discontinued` | `out_of_stock`)
- `isFeatured`
- `variants` (array; if sent, stock may be recalculated from variants)

**Do not send:** `createdAt`, `createdBy`. Avoid changing `sku` unless you really need to (uniqueness is enforced).

### Example – reserve 2 units

```http
PUT /api/products/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <token>

{
  "stock": {
    "quantity": 100,
    "reservedQuantity": 7,
    "lowStockThreshold": 10,
    "reorderPoint": 20,
    "maxStock": 200
  }
}
```

(Assuming current `reservedQuantity` was 5; you add 2 for the new booking.)

### Success response (200)

```json
{
  "success": true,
  "data": {
    "product": { ... }
  },
  "message": "Product updated successfully"
}
```

### Error responses

- **400** – Validation error (e.g. SKU already exists)
- **401** – Unauthorized
- **403** – Not admin/super_admin
- **404** – Product not found
- **500** – Server error

---

## Summary

| Method | Endpoint              | Use                         |
|--------|------------------------|-----------------------------|
| GET    | `/api/products`        | List products (with filters)|
| GET    | `/api/products/:id`    | Get one product             |
| PUT    | `/api/products/:id`    | Update product (e.g. book)  |

- **No POST** (create) or **DELETE** in this integration.
- All calls need `Authorization: Bearer <token>`.
- Use a server-side token on your other website; do not expose it to the browser.

---

## Minimal integration examples

### JavaScript (fetch)

```js
const BASE = 'https://your-results-portal.com';
const TOKEN = 'your_bearer_token';

// List products
const list = await fetch(`${BASE}/api/products?page=1&limit=20&status=active`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
}).then((r) => r.json());

// Get one product
const one = await fetch(`${BASE}/api/products/${productId}`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
}).then((r) => r.json());

// Book 2 units (update reserved quantity)
const current = one.data.product;
const updated = await fetch(`${BASE}/api/products/${productId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  },
  body: JSON.stringify({
    stock: {
      ...current.stock,
      reservedQuantity: (current.stock.reservedQuantity || 0) + 2,
    },
  }),
}).then((r) => r.json());
```

### cURL

```bash
# List
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/products?limit=5"

# Get one
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/products/$ID"

# Update (book)
curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"stock":{"quantity":100,"reservedQuantity":7,"lowStockThreshold":10,"reorderPoint":20,"maxStock":200}}' \
  "$BASE/api/products/$ID"
```
