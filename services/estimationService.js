const Order = require('../models/Order');

const BASE_TIME_MIN = 6;
const BASE_TIME_MAX = 8;
const PER_ITEM_MIN = 1;
const PER_ITEM_MAX = 2;
const LOAD_FACTOR_MIN = 1;
const LOAD_FACTOR_MAX = 3;

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Get average prep time from last 20 completed orders
 * @returns {Promise<number>} Average prep time in minutes
 */
async function getDynamicBaseTime() {
  const recentCompleted = await Order.find({
    status: 'COMPLETED',
    actualCompletionTime: { $exists: true }
  })
    .sort({ completedAt: -1 })
    .limit(20)
    .select('actualCompletionTime');

  if (recentCompleted.length === 0) {
    // Fallback to default if no completed orders
    return randomInRange(BASE_TIME_MIN, BASE_TIME_MAX);
  }

  const avgTime = recentCompleted.reduce((sum, order) => sum + order.actualCompletionTime, 0) / recentCompleted.length;
  return Math.max(avgTime, BASE_TIME_MIN); // Ensure minimum time
}

/**
 * Calculate estimated preparation time for an order.
 * Uses dynamic base time from recent orders instead of random values.
 *
 * @param {Array} items - Order items array (each with a `quantity` field)
 * @returns {Promise<{ estimatedMinutes: number, estimatedCompletionTime: Date }>}
 */
async function calculateEstimation(items) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const activeOrders = await Order.countDocuments({ status: 'PREPARING' });

  // Smart prep time: use dynamic base time from historical data
  const baseTime = await getDynamicBaseTime();
  const itemTime = totalQuantity * 1.5; // Consistent per-item time
  const loadTime = activeOrders * 2; // Consistent load factor

  const estimatedMinutes = Math.round(baseTime + itemTime + loadTime);
  const estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

  return { estimatedMinutes, estimatedCompletionTime };
}

module.exports = { calculateEstimation };
