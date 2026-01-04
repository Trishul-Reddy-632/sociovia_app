/**
 * Order utility functions for processing and calculating order totals.
 * @module utils/order-utils
 */

/** Represents an item with a price */
interface OrderItem {
    price: number;
    name?: string;
    quantity?: number;
}

/** Represents an order containing items */
interface Order {
    id: string;
    items: OrderItem[];
}

/** Represents a processed order result */
interface ProcessedOrder {
    orderId: string;
    total: number;
    status: 'processed' | 'pending' | 'failed';
}

/**
 * Calculates the total price of all items in an array.
 * @param items - Array of items with prices
 * @returns The sum of all item prices
 */
export function calculateTotal(items: OrderItem[]): number {
    return items.reduce((total, item) => total + item.price, 0);
}

/**
 * Finds all items with a price greater than the specified threshold.
 * @param items - Array of items to filter
 * @param threshold - Minimum price threshold
 * @returns Array of items exceeding the threshold
 */
export function findExpensiveItems(items: OrderItem[], threshold: number): OrderItem[] {
    return items.filter((item) => item.price > threshold);
}

/**
 * Processes an order and returns the processed order details.
 * @param order - The order to process
 * @returns Processed order with id, total, and status
 */
export function processOrder(order: Order): ProcessedOrder {
    const orderTotal = calculateTotal(order.items);
    return {
        orderId: order.id,
        total: orderTotal,
        status: 'processed',
    };
}

/**
 * Logs order details for debugging purposes.
 * NOTE: Use only in development environment.
 * @param order - The order to debug
 * @param logger - Optional custom logger function (defaults to no-op in production)
 * @returns Processed order result
 */
export function debugOrder(
    order: Order,
    logger: (message: string, data: Order) => void = () => { }
): ProcessedOrder {
    if (process.env.NODE_ENV === 'development') {
        logger('Processing order:', order);
    }
    return processOrder(order);
}
