"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookPublisher = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
class WebhookPublisher {
    static async publish(webhookUrl, data) {
        try {
            const response = await axios_1.default.post(webhookUrl, data);
            logger_1.logger.info('Webhook published', { status: response.status, orderId: data.order.id });
            return response;
        }
        catch (error) {
            logger_1.logger.error('Failed to publish to webhook', { error: error.message });
            throw error;
        }
    }
}
exports.WebhookPublisher = WebhookPublisher;
