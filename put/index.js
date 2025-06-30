"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = exports.WebhookManager = void 0;
const AWS = __importStar(require("aws-sdk"));
const validator_1 = require("./services/validator");
const transformer_1 = require("./services/transformer");
const publisher_1 = require("./services/publisher");
const logger_1 = require("./utils/logger");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// Initialize AWS SDK
const ssm = new AWS.SSM();
// Environment variables
const WEBHOOK_PARAM = '/order/producer/webhook-url';
class WebhookManager {
    static async getWebhookUrl() {
        if (this.cachedUrl)
            return this.cachedUrl;
        try {
            const params = await ssm.getParameter({
                Name: WEBHOOK_PARAM,
                WithDecryption: true
            }).promise();
            if (!params.Parameter?.Value) {
                throw new Error('Webhook URL is undefined in parameter store');
            }
            this.cachedUrl = params.Parameter.Value;
            logger_1.logger.info('Successfully retrieved webhook URL');
            return this.cachedUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve webhook URL', { error });
            throw error;
        }
    }
}
exports.WebhookManager = WebhookManager;
WebhookManager.cachedUrl = null;
// Lambda handler
const handler = async (event, context) => {
    try {
        logger_1.logger.info('📦 Incoming event', { data: event });
        // Health check endpoint
        const path = event?.rawPath || event?.requestContext?.http?.path || '';
        if (path.includes('healthCheck')) {
            return {
                statusCode: 200,
                body: JSON.stringify({ status: 'healthy' })
            };
        }
        // Log incoming request (mask sensitive info)
        const requestBody = JSON.parse(event.body || '{}');
        logger_1.logger.info('📝Received request', {
            orderId: requestBody.orderId,
            customerId: requestBody.customerId,
            itemCount: requestBody.items?.length
        });
        // Validate input
        const validationErrors = validator_1.OrderValidator.validate(requestBody);
        if (validationErrors) {
            logger_1.logger.error('Validation failed', { errors: validationErrors });
            return {
                statusCode: 400,
                body: JSON.stringify({ errors: validationErrors })
            };
        }
        // Transform data
        const transformedData = transformer_1.OrderTransformer.transform(requestBody);
        logger_1.logger.info('🔄.Data transformed successfully', { orderId: transformedData.order.id });
        // Publish to webhook.site
        const webhookUrl = await WebhookManager.getWebhookUrl();
        await publisher_1.WebhookPublisher.publish(webhookUrl, transformedData);
        logger_1.logger.info('✅.Successfully published', { orderId: transformedData.order.id });
        return {
            statusCode: 200,
            body: JSON.stringify({ status: true, orderId: transformedData.order.id })
        };
    }
    catch (error) {
        logger_1.logger.error('Unexpected error', {
            message: error.message,
            stack: error.stack,
            raw: error
        });
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error', error: (error instanceof Error) ? error.stack : String(error) })
        };
    }
};
exports.handler = handler;
