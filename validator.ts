import { validate as uuidValidate } from 'uuid';
import { SourceOrderData } from './types';

export const validateSourceData = (data: SourceOrderData): string[] | null => {
  const errors: string[] = [];
  const requiredFields: (keyof SourceOrderData)[] = ['orderId', 'orderDate', 'customerId', 'storeId', 'items', 'paymentMethod', 'totalAmount', 'status'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  });

  if (data.orderId && !data.orderId.startsWith('ORD-')) {
  errors.push('orderId must start with "ORD-"');
}

  if (data.orderDate && !/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(data.orderDate)) {
    errors.push('orderDate must be in MM/DD/YYYY format');
  }

  if (data.storeId && (typeof data.storeId !== 'number' || data.storeId <= 0)) {
    errors.push('storeId must be a positive number');
  }

  if (data.items) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      errors.push('items must be a non-empty array');
    } else {
      data.items.forEach((item, index) => {
        if (!item.sku) errors.push(`items[${index}].sku is required`);
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`items[${index}].quantity must be a positive number`);
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`items[${index}].unitPrice must be a non-negative number`);
        }
        if (item.discountAmount && (typeof item.discountAmount !== 'number' || item.discountAmount < 0)) {
          errors.push(`items[${index}].discountAmount must be a non-negative number`);
        }
      });
    }
  }

  if (data.totalAmount && (typeof data.totalAmount !== 'number' || data.totalAmount < 0)) {
    errors.push('totalAmount must be a non-negative number');
  }

  const validStatuses: string[] = ['NEW', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`status must be one of: ${validStatuses.join(', ')}`);
  }

 
  if (data.shippingAddress) {
  const address = data.shippingAddress; // ✅ TypeScript now knows it's defined
  const addressFields: (keyof typeof address)[] = ['street', 'city', 'state', 'zipCode', 'country'];

  addressFields.forEach(field => {
    if (!address[field]) {
      errors.push(`shippingAddress.${field} is required when shippingAddress is provided`);
    }
  });
}

  return errors.length ? errors : null;
};