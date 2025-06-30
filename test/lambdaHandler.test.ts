import { handler } from '../src/index';
import { OrderValidator } from '../src/services/validator';
import { OrderTransformer } from '../src/services/transformer';
import { WebhookPublisher } from '../src/services/publisher';
import { logger } from '../src/utils/logger';
import * as AWS from 'aws-sdk';
import axios from 'axios';
import { SourceOrderData, TargetOrderModel } from '../src/models/interfaces';

// Mock AWS SDK
jest.mock('aws-sdk', () => {
  const mockSSM = {
    getParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Parameter: { Value: 'https://webhook.site/test' }
      })
    })
  };
  return { SSM: jest.fn(() => mockSSM) };
});

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger
jest.spyOn(logger, 'info').mockImplementation();
jest.spyOn(logger, 'error').mockImplementation();

const validInput: SourceOrderData = {
  orderId: 'ORD-12345',
  orderDate: '10/15/2023',
  customerId: 'CUST-789',
  storeId: 42,
  items: [
    { sku: 'PROD-001', quantity: 2, unitPrice: 29.99, discountAmount: 5.00 },
    { sku: 'PROD-002', quantity: 1, unitPrice: 49.99 }
  ],
  paymentMethod: 'CREDIT_CARD',
  shippingAddress: {
    street: '123 Main St',
    city: 'Columbus',
    state: 'OH',
    zipCode: '43215',
    country: 'USA'
  },
  totalAmount: 104.97,
  status: 'NEW',
  notes: 'Please deliver after 5pm'
};

describe('Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ status: 200 });
  });

  test('should handle health check request', async () => {
    const event = { requestContext: { http: { path: '/healthCheck' } } };
    const response = await handler(event, {});
    
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ status: 'healthy' });
  });

  test('should process valid order successfully', async () => {
    const event = { body: JSON.stringify(validInput) };
    const response = await handler(event, {});
    
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      status: true,
      orderId: 'ORD-12345'
    });
    expect(mockedAxios.post).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });

  test('should return 400 for invalid input', async () => {
    const invalidInput = { ...validInput, orderId: 'INVALID' };
    const event = { body: JSON.stringify(invalidInput) };
    const response = await handler(event, {});
    
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).errors).toContain('orderId must start with "ORD-"');
  });

  test('should handle webhook publication failure', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Webhook failed'));
    const event = { body: JSON.stringify(validInput) };
    const response = await handler(event, {});
    
    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal server error');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('OrderValidator', () => {
  test('should pass valid input', () => {
    const errors = OrderValidator.validate(validInput);
    expect(errors).toBeNull();
  });

  test('should fail on missing required fields', () => {
    const invalidInput = { ...validInput, orderId: undefined };
    const errors = OrderValidator.validate(invalidInput as any);
    expect(errors).toContain('orderId is required');
  });

  test('should fail on invalid date format', () => {
    const invalidInput = { ...validInput, orderDate: '2023-10-15' };
    const errors = OrderValidator.validate(invalidInput);
    expect(errors).toContain('orderDate must be in MM/DD/YYYY format');
  });

  test('should fail on invalid status', () => {
    const invalidInput = { ...validInput, status: 'INVALID' };
    const errors = OrderValidator.validate(invalidInput);
    expect(errors).toContain('status must be one of: NEW, PROCESSING, SHIPPED, DELIVERED, CANCELLED');
  });

  test('should fail on invalid item quantity', () => {
    const invalidInput = {
      ...validInput,
      items: [{ ...validInput.items[0], quantity: 0 }]
    };
    const errors = OrderValidator.validate(invalidInput);
    expect(errors).toContain('items[0].quantity must be a positive number');
  });

  test('should fail on missing shipping address fields', () => {
    const invalidInput: SourceOrderData = {
      ...validInput,
      shippingAddress: {
        ...validInput.shippingAddress,
        street: '', // invalid
        city: 'Columbus',
        state: 'OH',
        zipCode: '43215',
        country: 'USA'
      }
    };
    const errors = OrderValidator.validate(invalidInput);
    expect(errors).toContain('shippingAddress.street is required when shippingAddress is provided');
  });
});

describe('OrderTransformer', () => {
  test('should transform valid input correctly', () => {
    const result = OrderTransformer.transform(validInput);
    expect(result).toMatchObject({
      order: {
        id: 'ORD-12345',
        createdAt: '2023-10-15',
        customer: { id: 'CUST-789' },
        location: { storeId: '42' },
        status: 'new',
        payment: { method: 'CREDIT_CARD', total: 104.97 },
        shipping: {
          address: {
            line1: '123 Main St',
            city: 'Columbus',
            state: 'OH',
            postalCode: '43215',
            country: 'USA'
          }
        }
      },
      items: [
        {
          productId: 'PROD-001',
          quantity: 2,
          price: { base: 29.99, discount: 5.00, final: 54.98 }
        },
        {
          productId: 'PROD-002',
          quantity: 1,
          price: { base: 49.99, discount: 0, final: 49.99 }
        }
      ],
      metadata: {
        source: 'order_producer',
        notes: 'Please deliver after 5pm'
      }
    });
    expect(result.metadata.processedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});

describe('WebhookPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ status: 200 });
  });

  test('should publish to webhook successfully', async () => {
    const transformedData = OrderTransformer.transform(validInput);
    await WebhookPublisher.publish('https://webhook.site/test', transformedData);
    expect(mockedAxios.post).toHaveBeenCalledWith('https://webhook.site/test', transformedData);
    expect(logger.info).toHaveBeenCalledWith('Webhook published', expect.any(Object));
  });

  test('should throw error on webhook failure', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Webhook failed'));
    const transformedData = OrderTransformer.transform(validInput);
    await expect(WebhookPublisher.publish('https://webhook.site/test', transformedData)).rejects.toThrow('Webhook failed');
    expect(logger.error).toHaveBeenCalled();
  });
});
