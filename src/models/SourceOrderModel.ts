export interface SourceOrderData {
  orderId: string;
  orderDate: string;
  customerId: string;
  storeId: number;
  items: Array<{
    sku: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
  paymentMethod: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  totalAmount: number;
  status: string;
  notes?: string;
}