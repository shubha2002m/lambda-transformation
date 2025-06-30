import axios from 'axios';
import { logger } from '../utils/logger';
import { TargetOrderModel } from '../models/interfaces';

export class WebhookPublisher {
  static async publish(webhookUrl: string, data: TargetOrderModel): Promise<any> {
  try {
    const response = await axios.post(webhookUrl, data);
    logger.info('Webhook published', { status: response.status, orderId: data.order.id });
    return response;
  } catch (error: any) {
    logger.error('Failed to publish to webhook', { error: error.message });
    throw error;
  }
  
}
}