📦 Order Data Producer – Lambda Service
This service is an AWS Lambda function that:

Accepts order data in a specific format

Validates the data

Transforms it into a new format

Publishes it to a webhook

Supports health check via HTTP GET

📁 Project Structure
bash
Copy
Edit
lambda/
├── index.ts             # Lambda handler
├── validator.ts         # Input validation logic
├── transformer.ts       # Data transformation logic
├── publisher.ts         # Sends transformed data to webhook
├── logger.ts            # Centralized logger
├── types.ts             # Type definitions
└── test/
    └── lambdaHandler.test.ts  # Jest test suite
🧠 Functionality
1. 🔍 Validation
Ensures input SourceOrderData has all required fields and proper formats:

orderId must start with ORD-

orderDate in MM/DD/YYYY

items[] must have positive quantities

Valid values for status, paymentMethod, etc.

2. 🔄 Transformation
Maps validated input into a new TargetOrderModel format:

Date reformatting

Flattened and structured object hierarchy

Adds metadata.processedAt timestamp

3. 🚀 Webhook Publishing
Webhook URL is fetched from AWS SSM Parameter Store

Data is sent using axios.post()

Logs success or errors centrally

🌐 API Endpoints (via API Gateway)
1. POST /order_data_producer
Purpose: Accepts and processes order data.

Body Example:

json
Copy
Edit
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
Success Response:

json
Copy
Edit
{ "status": true, "orderId": "ORD-12345" }
2. GET /order_data_producer/healthCheck
Purpose: Verifies Lambda is deployed and responding.

Response:

json
Copy
Edit
{ "status": "healthy" }
⚙️ Environment & Parameters
Required SSM Parameter
Key: /order/producer/webhook-url

Value: Webhook URL

🧪 Testing
Run tests:

bash
Copy
Edit
npx jest
Coverage:
Handler (valid flow, invalid input, webhook error)

Validator rules

Transformer logic

Webhook publisher

Health check endpoint

✅ Deployment Notes
Ensure the Lambda has permission to read from SSM

API Gateway routes must include /order_data_producer/healthCheck and POST /order_data_producer

Set up SSM parameter /order/producer/webhook-url with webhook destination