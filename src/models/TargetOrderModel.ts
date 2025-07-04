export interface TargetOrderModel {
  order: {
    id: string;
    createdAt: string;
    customer: {
      id: string;
    };
    location: {
      storeId: string;
    };
    status: string;
    payment: {
      method: string;
      total: number;
    };
    shipping: {
      address: {
        line1: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
    };
  };
  items: Array<{
    productId: string;
    quantity: number;
    price: {
      base: number;
      discount: number;
      final: number;
    };
  }>;
  metadata: {
    source: string;
    notes: string;
    processedAt: string;
  };
}