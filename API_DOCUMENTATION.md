# RebelX V3 API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://api.rebelx.com/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All API responses follow this structure:
```json
{
  "success": true|false,
  "data": {} | [],
  "message": "Response message",
  "error": "Error message (if applicable)"
}
```

## Error Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting
- **Default**: 100 requests per minute per IP
- **Authentication endpoints**: 5 requests per minute per IP
- **File uploads**: 10 requests per minute per user

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "role": "employee",
  "department": "Sales",
  "phone": "555-0100",
  "hourlyRate": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "user@example.com",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "employee",
      "department": "Sales"
    }
  },
  "message": "Registration successful"
}
```

### Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "user@example.com",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "employee",
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  },
  "message": "Login successful"
}
```

### Logout
```http
POST /auth/logout
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Refresh Token
```http
POST /auth/refresh
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Token refreshed"
}
```

### Forgot Password
```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### Reset Password
```http
POST /auth/reset-password/:token
```

**Request Body:**
```json
{
  "password": "NewSecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

## 👥 User Management Endpoints

### Get All Users
```http
GET /users
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `role` (optional): Filter by role (admin|manager|employee)
- `department` (optional): Filter by department
- `status` (optional): Filter by status (active|inactive)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "user@example.com",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "employee",
        "department": "Sales",
        "status": "active",
        "hourlyRate": 50,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "pages": 3,
      "limit": 20
    }
  }
}
```

### Get User by ID
```http
GET /users/:userId
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user@example.com",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "employee",
    "department": "Sales",
    "phone": "555-0100",
    "hourlyRate": 50,
    "status": "active",
    "lastLogin": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Update User
```http
PUT /users/:userId
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Smith",
  "department": "Marketing",
  "phone": "555-0200",
  "hourlyRate": 60,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user@example.com",
    "email": "user@example.com",
    "name": "John Smith",
    "role": "employee",
    "department": "Marketing",
    "phone": "555-0200",
    "hourlyRate": 60,
    "status": "active"
  },
  "message": "User updated successfully"
}
```

### Delete User
```http
DELETE /users/:userId
```
**Headers:** `Authorization: Bearer <token>`
**Note:** Only admins can delete users

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 🏢 Client Management Endpoints

### Get All Clients
```http
GET /clients
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `search` (optional): Search by name, email, or phone
- `contactStatus` (optional): Filter by status
- `industry` (optional): Filter by industry
- `city` (optional): Filter by city
- `ownedBy` (optional): Filter by owner email
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `sort` (optional): Sort field (default: -createdAt)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Acme Corporation",
        "email": "contact@acme.com",
        "phone": "555-0100",
        "contactStatus": "Qualified",
        "industry": "Technology",
        "city": "New York",
        "state": "NY",
        "forecastedAmount": 50000,
        "interactionCount": 5,
        "ownedBy": "sales@rebelx.com",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pages": 5,
      "limit": 20
    }
  }
}
```

### Get Client by ID
```http
GET /clients/:clientId
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation",
    "description": "Leading technology provider",
    "email": "contact@acme.com",
    "phone": "555-0100",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "website": "https://www.acme.com",
    "contactStatus": "Qualified",
    "industry": "Technology",
    "companyType": "Enterprise",
    "forecastedAmount": 50000,
    "interactionCount": 5,
    "ownedBy": "sales@rebelx.com",
    "lastNote": "Interested in premium package",
    "projectedCloseDate": "2024-02-01T00:00:00Z",
    "statusHistory": [
      {
        "status": "New",
        "changedAt": "2024-01-01T00:00:00Z",
        "changedBy": "sales@rebelx.com"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Create Client
```http
POST /clients
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Client Inc",
  "email": "contact@newclient.com",
  "phone": "555-0200",
  "description": "Potential enterprise client",
  "address": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "postalCode": "90001",
  "website": "https://www.newclient.com",
  "industry": "Finance",
  "companyType": "Enterprise",
  "contactStatus": "New",
  "forecastedAmount": 75000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "New Client Inc",
    "email": "contact@newclient.com",
    "contactStatus": "New",
    "ownedBy": "current-user@rebelx.com",
    "createdAt": "2024-01-15T00:00:00Z"
  },
  "message": "Client created successfully"
}
```

### Update Client
```http
PUT /clients/:clientId
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "contactStatus": "Qualified",
  "forecastedAmount": 100000,
  "lastNote": "Ready to proceed with contract",
  "projectedCloseDate": "2024-02-15T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Acme Corporation",
    "contactStatus": "Qualified",
    "forecastedAmount": 100000,
    "lastNote": "Ready to proceed with contract",
    "projectedCloseDate": "2024-02-15T00:00:00Z"
  },
  "message": "Client updated successfully"
}
```

### Delete Client
```http
DELETE /clients/:clientId
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

### Update Client Status
```http
PATCH /clients/:clientId/status
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "Customer",
  "notes": "Contract signed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contactStatus": "Customer",
    "statusHistory": [...]
  },
  "message": "Status updated successfully"
}
```

---

## 📊 Activity Endpoints

### Get Client Activities
```http
GET /clients/:clientId/activities
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `type` (optional): Filter by activity type
- `limit` (optional): Number of activities (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "clientId": "507f1f77bcf86cd799439011",
      "userId": "sales@rebelx.com",
      "type": "email_sent",
      "description": "Email sent: \"Product Demo Information\"",
      "metadata": {
        "subject": "Product Demo Information",
        "recipientEmail": "contact@acme.com"
      },
      "createdAt": "2024-01-10T14:30:00Z"
    }
  ]
}
```

### Create Activity
```http
POST /activities
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "type": "call_made",
  "description": "Call made (15 minutes)",
  "metadata": {
    "duration": 15,
    "outcome": "Scheduled follow-up meeting"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "clientId": "507f1f77bcf86cd799439011",
    "userId": "current-user@rebelx.com",
    "type": "call_made",
    "description": "Call made (15 minutes)",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Activity logged successfully"
}
```

### Get Activity Statistics
```http
GET /activities/stats
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `startDate` (optional): Start date for statistics
- `endDate` (optional): End date for statistics
- `userId` (optional): Filter by user

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "email_sent",
      "totalCount": 150,
      "dailyCounts": [
        {
          "date": "2024-01-15",
          "count": 10
        }
      ]
    }
  ]
}
```

---

## 💳 Payment Endpoints

### Add Payment Method
```http
POST /clients/:clientId/payment-methods
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "stripeToken": "tok_visa",
  "nameOnCard": "John Doe",
  "billingZip": "10001",
  "isDefault": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "brand": "visa",
    "last4": "4242",
    "expMonth": 12,
    "expYear": 2025,
    "isDefault": true
  },
  "message": "Payment method added successfully"
}
```

### Get Payment Methods
```http
GET /clients/:clientId/payment-methods
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "brand": "visa",
      "last4": "4242",
      "expMonth": 12,
      "expYear": 2025,
      "nameOnCard": "John Doe",
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Remove Payment Method
```http
DELETE /clients/:clientId/payment-methods/:paymentMethodId
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed successfully"
}
```

### Process Payment
```http
POST /payments/charge
```
**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clientId": "507f1f77bcf86cd799439011",
  "amount": 5000,
  "currency": "usd",
  "description": "Premium package subscription",
  "paymentMethodId": "pm_test_123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chargeId": "ch_1234567890",
    "amount": 5000,
    "currency": "usd",
    "status": "succeeded",
    "receiptUrl": "https://pay.stripe.com/receipts/..."
  },
  "message": "Payment processed successfully"
}
```

---

## 📁 Import/Export Endpoints

### Import Clients (CSV)
```http
POST /clients/import
```
**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `file`: CSV file with client data
- `updateExisting`: true|false (optional)

**CSV Format:**
```csv
name,email,phone,city,state,industry,contactStatus
"Acme Corp","contact@acme.com","555-0100","New York","NY","Technology","New"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "updated": 5,
    "failed": 2,
    "errors": [
      {
        "row": 3,
        "error": "Invalid email format"
      }
    ]
  },
  "message": "Import completed"
}
```

### Export Clients (CSV)
```http
GET /clients/export
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `format`: csv|json (default: csv)
- `fields`: Comma-separated list of fields to export
- `contactStatus`: Filter by status
- `startDate`: Export clients created after this date
- `endDate`: Export clients created before this date

**Response:**
Returns a CSV file download or JSON data based on format parameter.

---

## 📈 Analytics Endpoints

### Dashboard Statistics
```http
GET /analytics/dashboard
```
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClients": 250,
    "newClientsThisMonth": 25,
    "totalRevenue": 500000,
    "averageDealSize": 25000,
    "conversionRate": 0.35,
    "statusDistribution": {
      "New": 50,
      "Attempted": 40,
      "Contacted": 30,
      "Qualified": 35,
      "Unqualified": 20,
      "Customer": 75
    },
    "topPerformers": [
      {
        "userId": "sales@rebelx.com",
        "name": "John Doe",
        "closedDeals": 15,
        "revenue": 150000
      }
    ]
  }
}
```

### Sales Forecast
```http
GET /analytics/forecast
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `period`: month|quarter|year (default: quarter)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "Q1 2024",
    "projected": 750000,
    "bestCase": 900000,
    "worstCase": 600000,
    "pipeline": [
      {
        "month": "January",
        "projected": 250000,
        "qualified": 150000,
        "contacted": 100000
      }
    ]
  }
}
```

---

## 🔄 Webhook Endpoints

### Stripe Webhooks
```http
POST /webhooks/stripe
```
**Headers:** `Stripe-Signature: <signature>`

Handles Stripe events:
- `payment_intent.succeeded`
- `payment_intent.failed`
- `customer.subscription.created`
- `customer.subscription.deleted`

---

## 🔍 Search Endpoints

### Global Search
```http
GET /search
```
**Headers:** `Authorization: Bearer <token>`
**Query Parameters:**
- `q`: Search query (required)
- `type`: clients|users|activities (optional)
- `limit`: Results per type (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "clients": [...],
    "users": [...],
    "activities": [...]
  }
}
```

---

## ⚠️ Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "field": "Specific field error"
  },
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `AUTH_FAILED`: Authentication failed
- `INVALID_TOKEN`: Invalid or expired token
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ENTRY`: Resource already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## 🔒 Security Headers

All API responses include these security headers:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

---

## 📝 Notes

1. All dates are in ISO 8601 format
2. All monetary values are in cents (multiply by 100)
3. File uploads are limited to 10MB
4. CSV imports are limited to 5000 rows
5. Pagination is available on all list endpoints
6. Use webhook endpoints for real-time updates
7. Rate limits reset every minute

For additional support or questions about the API, please contact: api-support@rebelx.com