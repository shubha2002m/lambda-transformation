import axios from 'axios';
import { logger } from './logger';
import { TargetOrderModel } from './types';

export const publishToWebhook = async (webhookUrl: string, data: TargetOrderModel): Promise<any> => {
  try {
    const response = await axios.post(webhookUrl, data);
    logger.info('Webhook published', { status: response.status, orderId: data.order.id });
    return response;
  } catch (error: any) {
    logger.error('Failed to publish to webhook', { error: error.message });
    throw error;
  }
};