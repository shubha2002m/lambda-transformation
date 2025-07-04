import * as AWS from 'aws-sdk';
import { OrderValidator } from './services/validator';
import { OrderTransformer } from './services/transformer';
import { WebhookPublisher } from './services/publisher';
import { logger } from './utils/logger';
import {  TargetOrderModel } from './models/TargetOrderModel';
import { SourceOrderData } from './models/SourceOrderModel';
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize AWS SDK
const ssm = new AWS.SSM();

// Environment variables
const WEBHOOK_PARAM: string = '/order/producer/webhook-url';

export class WebhookManager {
  private static cachedUrl: string | null = null;

  static async getWebhookUrl(): Promise<string> {
    if (this.cachedUrl) return this.cachedUrl;
  try {
    const params = await ssm.getParameter({
      Name: WEBHOOK_PARAM,
      WithDecryption: true
    }).promise();

    if (!params.Parameter?.Value) {
  throw new Error('Webhook URL is undefined in parameter store');
}
    this.cachedUrl = params.Parameter.Value;
    logger.info('Successfully retrieved webhook URL');
    return this.cachedUrl;
  } catch (error) {
    logger.error('Failed to retrieve webhook URL', { error });
    throw error;
  }
  }
}

// Lambda handler
export const handler = async (event: any, context: any): Promise<any> => {
  try {
    logger.info('📦 Incoming event', { data: event })
    
    // Health check endpoint
   const path = event?.rawPath || event?.requestContext?.http?.path || '';
    if (path.includes('healthCheck')) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'healthy' })
      };
    }

    // Log incoming request (mask sensitive info)
    const requestBody: SourceOrderData = JSON.parse(event.body || '{}');
    logger.info('📝Received request', {
      orderId: requestBody.orderId,
      customerId: requestBody.customerId,
      itemCount: requestBody.items?.length
    });

    // Validate input
    const validationErrors = OrderValidator.validate(requestBody);
    if (validationErrors) {
      logger.error('Validation failed', { errors: validationErrors });
      return {
        statusCode: 400,
        body: JSON.stringify({ errors: validationErrors })
      };
    }

    // Transform data
    const transformedData = OrderTransformer.transform(requestBody);
    logger.info('🔄.Data transformed successfully', { orderId: transformedData.order.id });

    // Publish to webhook.site
    const webhookUrl = await WebhookManager.getWebhookUrl();
    await WebhookPublisher.publish(webhookUrl, transformedData);
    logger.info('✅.Successfully published', { orderId: transformedData.order.id });

    return {
      statusCode: 200,
      body: JSON.stringify({ status: true, orderId: transformedData.order.id })
    };
  } catch (error) {
    logger.error('Unexpected error', {
  message: (error as Error).message,
  stack: (error as Error).stack,
  raw: error
});

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' , error: (error instanceof Error) ? error.stack : String(error)})
    };
  }
};