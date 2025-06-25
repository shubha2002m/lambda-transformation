import * as AWS from 'aws-sdk';
import { validateSourceData } from './validator';
import { transformData } from './transformer';
import { publishToWebhook } from './publisher';
import { logger } from './logger';
import { SourceOrderData, TargetOrderModel } from './types';
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize AWS SDK
const ssm = new AWS.SSM();

// Environment variables
const WEBHOOK_PARAM: string = '/order/producer/webhook-url';
let webhookUrl: string | null = null;

// Get webhook URL from Parameter Store
const getWebhookUrl = async (): Promise<string> => {
  if (webhookUrl) return webhookUrl;
  try {
    const params = await ssm.getParameter({
      Name: WEBHOOK_PARAM,
      WithDecryption: true
    }).promise();

    if (!params.Parameter?.Value) {
  throw new Error('Webhook URL is undefined in parameter store');
}
    webhookUrl = params.Parameter.Value;
    logger.info('Successfully retrieved webhook URL');
    return webhookUrl;
  } catch (error) {
    logger.error('Failed to retrieve webhook URL', { error });
    throw error;
  }
};

// Lambda handler
export const handler = async (event: any, context: any): Promise<any> => {
  try {
    logger.info(event)
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
    const validationErrors: string[] | null = validateSourceData(requestBody);
    if (validationErrors) {
      logger.error('Validation failed', { errors: validationErrors });
      return {
        statusCode: 400,
        body: JSON.stringify({ errors: validationErrors })
      };
    }

    // Transform data
    const transformedData: TargetOrderModel = transformData(requestBody);
    logger.info('🔄.Data transformed successfully', { orderId: transformedData.order.id });

    // Publish to webhook.site
    const webhook: string = await getWebhookUrl();
    await publishToWebhook(webhook, transformedData);
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