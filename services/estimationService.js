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
 * Calculate estimated preparation time for an order.
 *
 * @param {Array} items - Order items array (each with a `quantity` field)
 * @returns {Promise<{ estimatedMinutes: number, estimatedCompletionTime: Date }>}
 */
async function calculateEstimation(items) {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const activeOrders = await Order.countDocuments({ status: 'Preparing' });

  const baseTime = randomInRange(BASE_TIME_MIN, BASE_TIME_MAX);
  const itemTime = totalQuantity * randomInRange(PER_ITEM_MIN, PER_ITEM_MAX);
  const loadTime = activeOrders * randomInRange(LOAD_FACTOR_MIN, LOAD_FACTOR_MAX);

  const estimatedMinutes = Math.round(baseTime + itemTime + loadTime);
  const estimatedCompletionTime = new Date(Date.now() + estimatedMinutes * 60 * 1000);

  return { estimatedMinutes, estimatedCompletionTime };
}

module.exports = { calculateEstimation };
