# 📦 Order Data Producer – Lambda Service

This service is an AWS Lambda function that:

- Accepts order data in a specific format  
- Validates the data  
- Transforms it into a new format  
- Publishes it to a webhook  
- Supports health check via HTTP GET  

---

## 📁 Project Structure

lambda/
├── index.ts # Lambda handler
├── validator.ts # Input validation logic
├── transformer.ts # Data transformation logic
├── publisher.ts # Sends transformed data to webhook
├── logger.ts # Centralized logger
├── types.ts # Type definitions
└── test/
└── lambdaHandler.test.ts # Jest test suite

## 🧠 Functionality

### 🔍 Validation

Validates incoming JSON against the `SourceOrderData` model:

- `orderId` starts with `ORD-`
- `orderDate` in `MM/DD/YYYY` format
- `items[]` must have positive `quantity`
- Valid `status`, `paymentMethod`, and required shipping fields

---

### 🔄 Transformation

Transforms valid data to the `TargetOrderModel` format:

- Reformats date
- Structures into nested format
- Adds metadata like `processedAt` timestamp

---

### 🚀 Webhook Publishing

- Fetches destination webhook URL from AWS SSM Parameter Store
- Sends transformed data via `axios.post()`
- Logs success and failure centrally

---

## 🌐 API Endpoints (via API Gateway)

### 1. `POST /order_data_producer`
#### 📨 Sample Payload

{
  "orderId": "ORD-12345",
  "orderDate": "10/15/2023",
  "customerId": "CUST-789",
  "storeId": 42,
  "items": [
    { "sku": "PROD-001", "quantity": 2, "unitPrice": 29.99, "discountAmount": 5.00 },
    { "sku": "PROD-002", "quantity": 1, "unitPrice": 49.99 }
  ],
  "paymentMethod": "CREDIT_CARD",
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Columbus",
    "state": "OH",
    "zipCode": "43215",
    "country": "USA"
  },
  "totalAmount": 104.97,
  "status": "NEW",
  "notes": "Please deliver after 5pm"
}


✅ Success Response
{
  "status": true,
  "orderId": "ORD-12345"
}


### 2. `GET /order_data_producer/healthCheck`

Verifies that the Lambda function is reachable and responsive.
✅ Response
{
  "status": "healthy"
}

## ⚙️ Environment Setup

Set up SSM parameter:  
**Key:** `/order/producer/webhook-url`  
**Value:** The destination webhook URL

**IAM Permissions required:**  
Lambda should have `ssm:GetParameter` for the key above.

---

### 🧪 Testing

Run unit tests using:
npx jest

Covers:
Lambda handler (happy path, invalid input, webhook failure)
Validator logic
Transformer logic
Webhook publication
Health check handler




