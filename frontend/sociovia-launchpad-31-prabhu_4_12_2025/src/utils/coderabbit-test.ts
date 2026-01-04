/**
 * Test utility file to demonstrate CodeRabbit AI code review
 * This file contains intentional issues for CodeRabbit to detect
 */

// Example 1: Missing type annotations (CodeRabbit should flag this)
export function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

// Example 2: Could use array method instead of loop
export function findExpensiveItems(items, threshold) {
    const result = [];
    for (let i = 0; i < items.length; i++) {
        if (items[i].price > threshold) {
            result.push(items[i]);
        }
    }
    return result;
}

// Example 3: Unused variable (CodeRabbit should detect)
export function processOrder(order) {
    const unusedVariable = "this is never used";
    const orderTotal = calculateTotal(order.items);
    return {
        orderId: order.id,
        total: orderTotal,
        status: "processed"
    };
}

// Example 4: Console.log in production code (CodeRabbit should warn)
export function debugOrder(order) {
    console.log("Processing order:", order);
    return processOrder(order);
}
