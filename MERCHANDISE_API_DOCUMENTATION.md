# Merchandise API Documentation

## Overview
The Merchandise API provides endpoints to retrieve product information for your mobile application. This API allows you to fetch all products, filter by various criteria, and get detailed product information.

## Base URL
```
Production: https://your-domain.com/api/products
Development: http://localhost:3000/api/products
```

## Authentication
All API requests require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## Endpoints

### 1. Get All Products

Retrieve a list of all products with pagination, search, and filtering options.

**Endpoint:** `GET /api/products`

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 20 | Number of products per page (max: 100) |
| `search` | string | No | - | Search in name, description, SKU, barcode, or tags |
| `category` | string | No | - | Filter by category (see categories below) |
| `status` | string | No | - | Filter by status: `active`, `inactive`, `discontinued`, `out_of_stock` |
| `brand` | string | No | - | Filter by brand name |
| `lowStock` | boolean | No | false | Filter products with low stock (quantity < threshold) |
| `featured` | boolean | No | false | Filter only featured products |

#### Categories
- `shoes`
- `boots`
- `jackets`
- `watches`
- `shirts`
- `safety_suits`
- `safety_equipment`
- `accessories`
- `other`

#### Example Request

```http
GET /api/products?page=1&limit=20&category=shoes&status=active&featured=true
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "id": "65a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Professional Safety Work Boots",
        "description": "Heavy-duty steel toe work boots with slip-resistant sole.",
        "sku": "SHOES-001",
        "barcode": "1234567890123",
        "category": "shoes",
        "subcategory": "Work Boots",
        "costPrice": 45.00,
        "sellingPrice": 89.99,
        "discount": 0,
        "taxRate": 8.5,
        "stock": {
          "quantity": 150,
          "lowStockThreshold": 20,
          "reservedQuantity": 5,
          "availableQuantity": 145,
          "reorderPoint": 25,
          "maxStock": 200
        },
        "brand": "SafetyPro",
        "model": "SP-WB-2024",
        "size": ["7", "8", "9", "10", "11", "12"],
        "color": ["Black", "Brown"],
        "material": "Leather with Steel Toe",
        "weight": 1.2,
        "dimensions": {
          "length": 32,
          "width": 12,
          "height": 15
        },
        "safetyFeatures": [
          "Steel Toe",
          "Slip Resistant",
          "Waterproof",
          "Puncture Resistant"
        ],
        "safetyStandards": ["ANSI Z41", "OSHA Approved"],
        "certifications": ["CE Certified"],
        "images": [
          {
            "url": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400",
            "alt": "Safety Work Boots",
            "isPrimary": true
          }
        ],
        "specifications": [
          {
            "key": "Toe Type",
            "value": "Steel Toe"
          },
          {
            "key": "Sole Material",
            "value": "Rubber"
          }
        ],
        "vendor": {
          "name": "Safety Equipment Co.",
          "contact": "+1-555-0101",
          "email": "sales@safetyequip.com",
          "address": "123 Industrial Blvd, Safety City, SC 12345"
        },
        "status": "active",
        "isFeatured": true,
        "tags": ["safety", "work boots", "steel toe", "industrial"],
        "warrantyPeriod": 12,
        "returnPolicy": "30 days return policy",
        "shippingInfo": {
          "weight": 1.2,
          "dimensions": "32x12x15 cm",
          "shippingClass": "Standard"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Indicates if the request was successful |
| `data.products[]` | array | Array of product objects |
| `data.pagination` | object | Pagination information |
| `data.pagination.page` | number | Current page number |
| `data.pagination.limit` | number | Items per page |
| `data.pagination.total` | number | Total number of products |
| `data.pagination.pages` | number | Total number of pages |

#### Product Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `_id` / `id` | string | Unique product identifier |
| `name` | string | Product name |
| `description` | string | Product description |
| `sku` | string | Stock Keeping Unit (unique) |
| `barcode` | string | Product barcode |
| `category` | string | Product category |
| `subcategory` | string | Product subcategory |
| `costPrice` | number | Cost price |
| `sellingPrice` | number | Selling price |
| `discount` | number | Discount percentage (0-100) |
| `taxRate` | number | Tax rate percentage |
| `stock` | object | Stock information |
| `stock.quantity` | number | Current stock quantity |
| `stock.availableQuantity` | number | Available quantity (quantity - reserved) |
| `stock.lowStockThreshold` | number | Low stock alert threshold |
| `brand` | string | Product brand |
| `model` | string | Product model |
| `size` | array | Available sizes |
| `color` | array | Available colors |
| `material` | string | Material composition |
| `weight` | number | Weight in kg |
| `dimensions` | object | Product dimensions (length, width, height in cm) |
| `safetyFeatures` | array | Safety features list |
| `safetyStandards` | array | Safety standards compliance |
| `certifications` | array | Product certifications |
| `images` | array | Product images |
| `images[].url` | string | Image URL |
| `images[].alt` | string | Image alt text |
| `images[].isPrimary` | boolean | Primary image flag |
| `specifications` | array | Product specifications (key-value pairs) |
| `vendor` | object | Vendor information |
| `status` | string | Product status |
| `isFeatured` | boolean | Featured product flag |
| `tags` | array | Product tags for search |
| `warrantyPeriod` | number | Warranty period in months |
| `returnPolicy` | string | Return policy description |
| `shippingInfo` | object | Shipping information |

---

### 2. Get Single Product

Retrieve detailed information about a specific product by ID.

**Endpoint:** `GET /api/products/{id}`

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID |

#### Example Request

```http
GET /api/products/65a1b2c3d4e5f6g7h8i9j0k1
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "name": "Professional Safety Work Boots",
      // ... (same structure as in list endpoint)
    }
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized. No token provided."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Product not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Mobile App Integration Examples

### React Native / Expo

```javascript
// API Configuration
const API_BASE_URL = 'https://your-domain.com/api';
const JWT_TOKEN = 'your-jwt-token';

// Fetch All Products
async function fetchProducts(filters = {}) {
  try {
    const params = new URLSearchParams({
      page: filters.page || '1',
      limit: filters.limit || '20',
      ...(filters.search && { search: filters.search }),
      ...(filters.category && { category: filters.category }),
      ...(filters.status && { status: filters.status }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.lowStock && { lowStock: 'true' }),
      ...(filters.featured && { featured: 'true' }),
    });

    const response = await fetch(`${API_BASE_URL}/products?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

// Usage Example
const products = await fetchProducts({
  page: 1,
  limit: 20,
  category: 'shoes',
  status: 'active',
  featured: true,
});

console.log('Products:', products.data.products);
console.log('Total:', products.data.pagination.total);
```

### Flutter / Dart

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class MerchandiseAPI {
  static const String baseUrl = 'https://your-domain.com/api';
  static const String jwtToken = 'your-jwt-token';

  Future<Map<String, dynamic>> fetchProducts({
    int page = 1,
    int limit = 20,
    String? search,
    String? category,
    String? status,
    String? brand,
    bool? lowStock,
    bool? featured,
  }) async {
    try {
      final queryParams = <String, String>{
        'page': page.toString(),
        'limit': limit.toString(),
      };

      if (search != null) queryParams['search'] = search;
      if (category != null) queryParams['category'] = category;
      if (status != null) queryParams['status'] = status;
      if (brand != null) queryParams['brand'] = brand;
      if (lowStock == true) queryParams['lowStock'] = 'true';
      if (featured == true) queryParams['featured'] = 'true';

      final uri = Uri.parse('$baseUrl/products').replace(queryParameters: queryParams);

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $jwtToken',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load products: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching products: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchProductById(String productId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/products/$productId'),
        headers: {
          'Authorization': 'Bearer $jwtToken',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to load product: ${response.statusCode}');
      }
    } catch (e) {
      print('Error fetching product: $e');
      rethrow;
    }
  }
}

// Usage Example
final api = MerchandiseAPI();
final result = await api.fetchProducts(
  page: 1,
  limit: 20,
  category: 'shoes',
  status: 'active',
  featured: true,
);

print('Products: ${result['data']['products']}');
print('Total: ${result['data']['pagination']['total']}');
```

### Swift / iOS

```swift
import Foundation

class MerchandiseAPI {
    static let baseURL = "https://your-domain.com/api"
    static let jwtToken = "your-jwt-token"
    
    struct ProductResponse: Codable {
        let success: Bool
        let data: ProductData
    }
    
    struct ProductData: Codable {
        let products: [Product]
        let pagination: Pagination
    }
    
    struct Product: Codable {
        let id: String
        let name: String
        let description: String?
        let sku: String
        let category: String
        let sellingPrice: Double
        let discount: Double?
        let stock: Stock
        let images: [ProductImage]
        // Add other fields as needed
    }
    
    struct Stock: Codable {
        let quantity: Int
        let availableQuantity: Int
    }
    
    struct ProductImage: Codable {
        let url: String
        let alt: String?
        let isPrimary: Bool
    }
    
    struct Pagination: Codable {
        let page: Int
        let limit: Int
        let total: Int
        let pages: Int
    }
    
    func fetchProducts(
        page: Int = 1,
        limit: Int = 20,
        category: String? = nil,
        status: String? = nil,
        featured: Bool? = nil
    ) async throws -> ProductResponse {
        var components = URLComponents(string: "\(Self.baseURL)/products")!
        var queryItems: [URLQueryItem] = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        
        if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        if let status = status {
            queryItems.append(URLQueryItem(name: "status", value: status))
        }
        if let featured = featured, featured {
            queryItems.append(URLQueryItem(name: "featured", value: "true"))
        }
        
        components.queryItems = queryItems
        
        guard let url = components.url else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(Self.jwtToken)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(ProductResponse.self, from: data)
    }
}

// Usage Example
let api = MerchandiseAPI()
do {
    let response = try await api.fetchProducts(
        page: 1,
        limit: 20,
        category: "shoes",
        status: "active",
        featured: true
    )
    print("Products: \(response.data.products)")
    print("Total: \(response.data.pagination.total)")
} catch {
    print("Error: \(error)")
}
```

### Kotlin / Android

```kotlin
import okhttp3.*
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MerchandiseAPI {
    private val baseUrl = "https://your-domain.com/api"
    private val jwtToken = "your-jwt-token"
    private val client = OkHttpClient()
    private val gson = Gson()

    data class ProductResponse(
        val success: Boolean,
        val data: ProductData
    )

    data class ProductData(
        val products: List<Product>,
        val pagination: Pagination
    )

    data class Product(
        val id: String,
        val name: String,
        val description: String?,
        val sku: String,
        val category: String,
        val sellingPrice: Double,
        val discount: Double?,
        val stock: Stock,
        val images: List<ProductImage>
    )

    data class Stock(
        val quantity: Int,
        val availableQuantity: Int
    )

    data class ProductImage(
        val url: String,
        val alt: String?,
        val isPrimary: Boolean
    )

    data class Pagination(
        val page: Int,
        val limit: Int,
        val total: Int,
        val pages: Int
    )

    suspend fun fetchProducts(
        page: Int = 1,
        limit: Int = 20,
        category: String? = null,
        status: String? = null,
        featured: Boolean? = null
    ): ProductResponse = withContext(Dispatchers.IO) {
        val urlBuilder = HttpUrl.parse("$baseUrl/products")?.newBuilder()
            ?: throw IllegalArgumentException("Invalid URL")

        urlBuilder.addQueryParameter("page", page.toString())
        urlBuilder.addQueryParameter("limit", limit.toString())
        category?.let { urlBuilder.addQueryParameter("category", it) }
        status?.let { urlBuilder.addQueryParameter("status", it) }
        if (featured == true) {
            urlBuilder.addQueryParameter("featured", "true")
        }

        val request = Request.Builder()
            .url(urlBuilder.build())
            .addHeader("Authorization", "Bearer $jwtToken")
            .addHeader("Content-Type", "application/json")
            .get()
            .build()

        val response = client.newCall(request).execute()
        
        if (!response.isSuccessful) {
            throw Exception("HTTP error: ${response.code()}")
        }

        val responseBody = response.body()?.string()
            ?: throw Exception("Empty response body")

        gson.fromJson(responseBody, ProductResponse::class.java)
    }
}

// Usage Example (in a coroutine scope)
val api = MerchandiseAPI()
try {
    val response = api.fetchProducts(
        page = 1,
        limit = 20,
        category = "shoes",
        status = "active",
        featured = true
    )
    println("Products: ${response.data.products}")
    println("Total: ${response.data.pagination.total}")
} catch (e: Exception) {
    println("Error: ${e.message}")
}
```

---

## Common Use Cases

### 1. Fetch All Active Products
```http
GET /api/products?status=active&limit=100
```

### 2. Search Products
```http
GET /api/products?search=work+boots
```

### 3. Get Featured Products
```http
GET /api/products?featured=true&status=active
```

### 4. Get Low Stock Products
```http
GET /api/products?lowStock=true
```

### 5. Filter by Category
```http
GET /api/products?category=safety_equipment&status=active
```

### 6. Get Products by Brand
```http
GET /api/products?brand=SafetyPro&status=active
```

### 7. Combined Filters
```http
GET /api/products?category=shoes&status=active&featured=true&lowStock=false&limit=50
```

---

## Best Practices

1. **Pagination**: Always use pagination for large datasets. Start with `limit=20` and increase as needed.

2. **Caching**: Cache product data on the mobile app to reduce API calls and improve performance.

3. **Error Handling**: Always handle network errors and API errors gracefully.

4. **Image Loading**: Use image caching libraries (like React Native's FastImage, Flutter's cached_network_image) for better performance.

5. **Token Management**: Store JWT tokens securely (use secure storage, not plain text).

6. **Rate Limiting**: Be mindful of API rate limits. Implement request throttling if needed.

7. **Offline Support**: Cache products locally for offline access.

---

## Testing the API

### Using cURL

```bash
# Get all products
curl -X GET "https://your-domain.com/api/products?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get products by category
curl -X GET "https://your-domain.com/api/products?category=shoes&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Search products
curl -X GET "https://your-domain.com/api/products?search=work+boots" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Get single product
curl -X GET "https://your-domain.com/api/products/PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Using Postman

1. Create a new GET request
2. Set URL: `https://your-domain.com/api/products`
3. Add query parameters as needed
4. In Headers, add:
   - `Authorization: Bearer YOUR_JWT_TOKEN`
   - `Content-Type: application/json`
5. Send request

---

## Support

For API support or questions, please contact your development team or refer to the main API documentation.

---

## Quick Reference

### Base URL
```
Production: Replace with your actual domain
Development: http://localhost:3000
```

### Authentication Header
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Common Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | Get all products (with filters) |
| `/api/products/{id}` | GET | Get single product by ID |

### Common Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=1` | Page number |
| `limit` | `?limit=20` | Items per page |
| `search` | `?search=work+boots` | Search query |
| `category` | `?category=shoes` | Filter by category |
| `status` | `?status=active` | Filter by status |
| `featured` | `?featured=true` | Featured products only |
| `lowStock` | `?lowStock=true` | Low stock products |

### Example Response Structure
```json
{
  "success": true,
  "data": {
    "products": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

---

## Version History

- **v1.0** (2024-01-15): Initial API release with full CRUD operations and filtering capabilities
