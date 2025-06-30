"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const maskSensitive = (input) => {
    const data = JSON.parse(JSON.stringify(input)); // deep copy
    if (typeof data.body === 'string') {
        try {
            data.body = JSON.parse(data.body);
        }
        catch {
            // leave as-is if not parsable
        }
    }
    if (data?.customerId) {
        data.customerId = '***';
    }
    if (data?.shippingAddress?.street) {
        data.shippingAddress.street = '***';
    }
    if (typeof data.body === 'object') {
        if (data.body.customerId) {
            data.body.customerId = '***';
        }
        if (data.body.shippingAddress?.street) {
            data.body.shippingAddress.street = '***';
        }
    }
    return data;
};
const maskFormat = winston_1.default.format((info) => {
    if (info.data) {
        info.data = maskSensitive(info.data);
    }
    if (info.raw) {
        info.raw = maskSensitive(info.raw);
    }
    return info;
});
exports.logger = winston_1.default.createLogger({
    level: 'info',
    format: winston_1.default.format.combine(maskFormat(), winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [new winston_1.default.transports.Console()]
});
