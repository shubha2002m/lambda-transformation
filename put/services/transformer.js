"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTransformer = void 0;
class OrderTransformer {
    static transform(source) {
        const [month, day, year] = source.orderDate.split('/');
        const createdAt = `${year}-${month}-${day}`;
        return {
            order: {
                id: source.orderId,
                createdAt: createdAt,
                customer: {
                    id: source.customerId
                },
                location: {
                    storeId: source.storeId.toString()
                },
                status: source.status.toLowerCase(),
                payment: {
                    method: source.paymentMethod,
                    total: source.totalAmount
                },
                shipping: {
                    address: source.shippingAddress ? {
                        line1: source.shippingAddress.street,
                        city: source.shippingAddress.city,
                        state: source.shippingAddress.state,
                        postalCode: source.shippingAddress.zipCode,
                        country: source.shippingAddress.country
                    } : {
                        line1: '',
                        city: '',
                        state: '',
                        postalCode: '',
                        country: ''
                    }
                }
            },
            items: source.items.map(item => ({
                productId: item.sku,
                quantity: item.quantity,
                price: {
                    base: item.unitPrice,
                    discount: item.discountAmount || 0,
                    final: (item.quantity * item.unitPrice) - (item.discountAmount || 0)
                }
            })),
            metadata: {
                source: 'order_producer',
                notes: source.notes || '',
                processedAt: new Date().toISOString()
            }
        };
    }
}
exports.OrderTransformer = OrderTransformer;
