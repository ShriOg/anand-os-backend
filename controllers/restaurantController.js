const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Customer = require('../models/Customer');
const { calculateEstimation } = require('../services/estimationService');

// @desc    Get active menu (flat array, no _id leakage)
// @route   GET /api/restaurant/menu
const getMenu = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({ active: true }).sort({ category: 1, name: 1 });
  res.json({ success: true, data: items });
});

// @desc    Get all menu items including inactive (admin)
// @route   GET /api/restaurant/menu/all
const getMenuAll = asyncHandler(async (req, res) => {
  const items = await MenuItem.find().sort({ category: 1, name: 1 });
  res.json({ success: true, data: items });
});

// @desc    Create a new order (auth optional, guest allowed)
// @route   POST /api/restaurant/orders
const createOrder = asyncHandler(async (req, res) => {
  let { customerName, phone, orderType, persons, tableNumber, note, items } = req.body;

  // Normalize phone to prevent duplicates
  phone = phone ? phone.trim() : phone;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  // Fetch all referenced menu items by _id
  const itemIds = items.map(i => i.itemId);
  const menuItems = await MenuItem.find({ _id: { $in: itemIds }, active: true });

  const menuMap = new Map();
  for (const mi of menuItems) {
    menuMap.set(mi._id.toString(), mi);
  }

  // Recalculate total server-side — never trust frontend prices
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const menuItem = menuMap.get(item.itemId.toString());
    if (!menuItem) {
      res.status(400);
      throw new Error(`Menu item ${item.itemId} not found or inactive`);
    }

    const priceEntry = menuItem.prices.find(p => p.label === item.size);
    if (!priceEntry) {
      res.status(400);
      throw new Error(`Size '${item.size}' not available for ${menuItem.name}`);
    }

    const lineTotal = priceEntry.value * item.quantity;
    total += lineTotal;

    orderItems.push({
      itemId: menuItem._id,
      name: menuItem.name,
      size: item.size,
      price: priceEntry.value,
      quantity: item.quantity
    });
  }

  // Find or create persistent customer by phone
  let customer = await Customer.findOne({ phone });
  if (!customer) {
    customer = await Customer.create({ name: customerName, phone });
  }

  const orderId = `PF${Date.now().toString(36).toUpperCase()}`;

  // AI-based estimation
  const { estimatedMinutes, estimatedCompletionTime } = await calculateEstimation(orderItems);

  const order = await Order.create({
    orderId,
    customerName,
    phone,
    orderType,
    persons: persons || undefined,
    tableNumber: tableNumber || undefined,
    note: note || '',
    items: orderItems,
    total,
    user: req.user ? req.user._id : undefined,
    status: 'PENDING',
    estimatedMinutes,
    estimatedCompletionTime
  });

  // Update persistent customer stats
  await Customer.findOneAndUpdate(
    { phone },
    {
      $inc: {
        totalOrders: 1,
        totalSpent: order.total,
        points: Math.floor(order.total / 10)
      }
    }
  );

  // Loyalty: award points + badges if authenticated
  if (req.user) {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: 10, totalOrders: 1 } },
      { new: true }
    );

    if (updatedUser) {
      const badgesToAdd = [];
      if (updatedUser.totalOrders >= 25 && !updatedUser.badges?.includes('GOLD')) {
        badgesToAdd.push('GOLD');
      }
      if (updatedUser.totalOrders >= 10 && !updatedUser.badges?.includes('SILVER')) {
        badgesToAdd.push('SILVER');
      }
      if (updatedUser.totalOrders >= 5 && !updatedUser.badges?.includes('BRONZE')) {
        badgesToAdd.push('BRONZE');
      }

      if (badgesToAdd.length > 0) {
        await User.findByIdAndUpdate(req.user._id, {
          $addToSet: { badges: { $each: badgesToAdd } }
        });
      }
    }
  }

  // Get suggested upsell items (top 3 from last 7 days, same/complementary category)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const orderedCategories = new Set();
  const orderedItemIds = new Set();

  for (const item of orderItems) {
    const menuItem = menuMap.get(item.itemId.toString());
    if (menuItem) {
      orderedCategories.add(menuItem.category);
      orderedItemIds.add(item.itemId.toString());
    }
  }

  const suggestedItems = await Order.aggregate([
    { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'CANCELLED' } } },
    { $unwind: '$items' },
    {
      $match: {
        'items.itemId': { $nin: Array.from(orderedItemIds).map(id => require('mongoose').Types.ObjectId(id)) }
      }
    },
    {
      $group: {
        _id: '$items.name',
        quantity: { $sum: '$items.quantity' }
      }
    },
    { $sort: { quantity: -1 } },
    { $limit: 3 }
  ]);

  // Enrich suggested items with menu data
  const enrichedSuggestions = [];
  for (const suggestion of suggestedItems) {
    const menuItem = await MenuItem.findOne({ name: suggestion._id });
    if (menuItem) {
      enrichedSuggestions.push({
        name: menuItem.name,
        category: menuItem.category,
        price: menuItem.prices[0]?.value || 0
      });
    }
  }

  // Emit new order to the customer's room and admin room
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.phone}`).emit('restaurant:new-order', order);
    io.to('admin').emit('restaurant:new-order', order);
  }

  res.status(201).json({
    success: true,
    data: {
      orderId: order.orderId,
      total: order.total,
      status: order.status,
      estimatedMinutes: order.estimatedMinutes,
      estimatedCompletionTime: order.estimatedCompletionTime,
      suggestedItems: enrichedSuggestions
    }
  });
});

// @desc    Get all orders (admin)
// @route   GET /api/restaurant/orders
const getAllOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.phone) {
    filter.phone = req.query.phone;
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, data: orders });
});

// @desc    Get today's orders (admin)
// @route   GET /api/restaurant/orders/today
const getTodayOrders = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const filter = { createdAt: { $gte: startOfDay } };
  if (req.query.phone) {
    filter.phone = req.query.phone;
  }
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 });

  res.json({ success: true, data: orders });
});

// @desc    Update order status (admin)
// @route   PATCH /api/restaurant/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400);
    throw new Error('Order ID is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const currentStatus = order.status?.toUpperCase();
  const nextStatus = req.body.status?.toUpperCase();

  switch (currentStatus) {
    case 'PENDING':
      if (nextStatus === 'PREPARING' || nextStatus === 'CANCELLED') {
        order.status = nextStatus;
      } else {
        res.status(400);
        throw new Error('Invalid transition');
      }
      break;

    case 'PREPARING':
      if (nextStatus === 'COMPLETED') {
        order.status = nextStatus;
      } else {
        res.status(400);
        throw new Error('Invalid transition');
      }
      break;

    default:
      res.status(400);
      throw new Error('Unknown current status: ' + currentStatus);
  }

  // Track timestamps for time estimation
  if (nextStatus === 'PREPARING') {
    order.acceptedAt = new Date();
  } else if (nextStatus === 'COMPLETED') {
    order.completedAt = new Date();
    order.actualCompletionTime = Math.round(
      (order.completedAt.getTime() - order.createdAt.getTime()) / 60000
    );
  }

  await order.save();

  // Emit status update to the customer's room and admin room
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.phone}`).emit('restaurant:order-updated', order);
    io.to('admin').emit('restaurant:order-updated', order);

    // If order is completed, recalculate and emit top selling item
    if (nextStatus === 'COMPLETED') {
      const topItem = await getTopSellingToday();
      if (topItem) {
        io.to('admin').emit('restaurant:top-item-update', topItem);
      }
    }
  }

  res.json({ success: true, data: order });
});

// @desc    Update a menu item (admin)
// @route   PATCH /api/restaurant/menu/:id
const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!item) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  res.json({ success: true, data: item });
});

// @desc    Dashboard stats (admin)
// @route   GET /api/restaurant/stats
const getStats = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalOrders, totalRevenueAgg, todayRevenueAgg, todayOrders, totalCustomers] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.distinct('phone')
  ]);

  res.json({
    success: true,
    data: {
      totalOrders,
      todayOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      totalCustomers: totalCustomers.length
    }
  });
});

// @desc    Analytics data (admin)
// @route   GET /api/restaurant/analytics
const getAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  lastWeekStart.setHours(0, 0, 0, 0);

  const [
    dailyRevenue,
    topItems,
    ordersByStatus,
    repeatCustomersData,
    totalCustomers,
    avgPrepTimeData,
    thisWeekRevenueData,
    lastWeekRevenueData
  ] = await Promise.all([
    // Revenue per day (last 7 days)
    Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo }, status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    // Top selling items
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 }
    ]),
    // Orders by status
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Repeat customers
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$phone', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'repeatCount' }
    ]),
    // Total unique customers
    Order.distinct('phone'),
    // Average prep time (last 7 days)
    Order.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: sevenDaysAgo }, actualCompletionTime: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: '$actualCompletionTime' } } }
    ]),
    // This week revenue
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: thisWeekStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    // Last week revenue
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ])
  ]);

  // Calculate new metrics
  const repeatCustomerCount = repeatCustomersData.length > 0 ? repeatCustomersData[0].repeatCount : 0;
  const totalCustomerCount = totalCustomers.length;
  const repeatRate = totalCustomerCount > 0 ? ((repeatCustomerCount / totalCustomerCount) * 100).toFixed(2) : 0;

  const averagePrepTime = avgPrepTimeData.length > 0 ? Math.round(avgPrepTimeData[0].avgTime) : 0;

  const thisWeekRevenue = thisWeekRevenueData.length > 0 ? thisWeekRevenueData[0].total : 0;
  const lastWeekRevenue = lastWeekRevenueData.length > 0 ? lastWeekRevenueData[0].total : 0;
  const weeklyGrowth = lastWeekRevenue > 0 ? (((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100).toFixed(2) : 0;

  res.json({
    success: true,
    data: {
      dailyRevenue,
      topItems,
      ordersByStatus,
      repeatRate: parseFloat(repeatRate),
      averagePrepTimeMinutes: averagePrepTime,
      weeklyGrowth: parseFloat(weeklyGrowth)
    }
  });
});

// @desc    Delete an order (admin)
// @route   DELETE /api/restaurant/orders/:id
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Emit deletion to the customer's room and admin room
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.phone}`).emit('restaurant:order-deleted', { orderId: order._id });
    io.to('admin').emit('restaurant:order-deleted', { orderId: order._id });
  }

  res.json({ success: true, message: 'Order deleted' });
});

// @desc    Get customer by phone
// @route   GET /api/restaurant/users/:phone
const getUserByPhone = asyncHandler(async (req, res) => {
  let { phone } = req.params;
  
  // Normalize phone to prevent lookup issues
  phone = phone ? phone.trim() : phone;

  const customer = await Customer.findOne({ phone });

  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }

  res.json({ success: true, data: customer });
});

// @desc    Cancel an order by custom orderId
// @route   PATCH /api/restaurant/orders/:orderId/cancel
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderId: req.params.orderId });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const currentStatus = order.status?.toUpperCase();

  if (currentStatus === 'CANCELLED') {
    res.status(400);
    throw new Error('Order is already cancelled');
  }

  const { valid, message } = Order.validateTransition(currentStatus, 'CANCELLED');
  if (!valid) {
    res.status(400);
    throw new Error(message);
  }

  order.status = 'CANCELLED';
  await order.save();

  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.phone}`).emit('restaurant:order-updated', order);
    io.to('admin').emit('restaurant:order-updated', order);
  }

  res.json({ success: true, data: order });
});

// @desc    Get top selling item today (LIVE)
// @route   Internal helper
const getTopSellingToday = asyncHandler(async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const result = await Order.aggregate([
    { $match: { status: 'COMPLETED', createdAt: { $gte: startOfDay } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.name',
        totalSold: { $sum: '$items.quantity' }
      }
    },
    { $sort: { totalSold: -1 } },
    { $limit: 1 }
  ]);

  if (result.length === 0) {
    return null;
  }

  return {
    itemName: result[0]._id,
    totalSold: result[0].totalSold
  };
});

// @desc    Get comprehensive restaurant insights
// @route   GET /api/restaurant/insights
const getInsights = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);
  lastWeekStart.setHours(0, 0, 0, 0);

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);

  const [
    topSellingToday,
    repeatCustomersData,
    totalCustomers,
    avgPrepTimeData,
    thisWeekRevenueData,
    lastWeekRevenueData,
    thirtyDayRevenue
  ] = await Promise.all([
    // 1. Top selling item today
    Order.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: startOfDay } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' } } },
      { $sort: { totalSold: -1 } },
      { $limit: 1 }
    ]),

    // 2. Repeat customers (orders > 1)
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: '$phone', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'repeatCount' }
    ]),

    // 3. Total unique customers
    Order.distinct('phone'),

    // 4. Average prep time (last 7 days)
    Order.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: sevenDaysAgo }, actualCompletionTime: { $exists: true } } },
      { $group: { _id: null, avgTime: { $avg: '$actualCompletionTime' } } }
    ]),

    // 5. This week revenue
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: thisWeekStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),

    // 6. Last week revenue
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),

    // 7. 30-day revenue trend
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' }, createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  // Calculate metrics
  const topItem = topSellingToday.length > 0 ? {
    itemName: topSellingToday[0]._id,
    totalSold: topSellingToday[0].totalSold
  } : null;

  const repeatCustomerCount = repeatCustomersData.length > 0 ? repeatCustomersData[0].repeatCount : 0;
  const totalCustomerCount = totalCustomers.length;
  const repeatRate = totalCustomerCount > 0 ? ((repeatCustomerCount / totalCustomerCount) * 100).toFixed(2) : 0;

  const averagePrepTime = avgPrepTimeData.length > 0 ? Math.round(avgPrepTimeData[0].avgTime) : 0;

  const thisWeekRevenue = thisWeekRevenueData.length > 0 ? thisWeekRevenueData[0].total : 0;
  const lastWeekRevenue = lastWeekRevenueData.length > 0 ? lastWeekRevenueData[0].total : 0;
  const weeklyGrowth = lastWeekRevenue > 0 ? (((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100).toFixed(2) : 0;

  // Suggested insights
  const suggestedInsights = [];
  if (topItem && topItem.totalSold > 0) {
    suggestedInsights.push(`Top item today: ${topItem.itemName} (${topItem.totalSold} sold)`);
  }
  if (parseFloat(repeatRate) > 30) {
    suggestedInsights.push(`Strong repeat customer rate: ${repeatRate}%`);
  } else if (parseFloat(repeatRate) < 20) {
    suggestedInsights.push(`Low repeat customer rate: ${repeatRate}%. Focus on retention!`);
  }
  if (parseFloat(weeklyGrowth) > 0) {
    suggestedInsights.push(`Revenue growing: +${weeklyGrowth}% week-over-week`);
  } else if (parseFloat(weeklyGrowth) < 0) {
    suggestedInsights.push(`Revenue declining: ${weeklyGrowth}% week-over-week`);
  }

  res.json({
    success: true,
    data: {
      topSellingToday: topItem,
      repeatRate: parseFloat(repeatRate),
      averagePrepTimeMinutes: averagePrepTime,
      weeklyGrowth: parseFloat(weeklyGrowth),
      revenueTrend: thirtyDayRevenue,
      suggestedInsights
    }
  });
});

module.exports = {
  getMenu,
  getMenuAll,
  createOrder,
  getAllOrders,
  getTodayOrders,
  updateOrderStatus,
  updateMenuItem,
  getStats,
  getAnalytics,
  deleteOrder,
  getUserByPhone,
  cancelOrder,
  getTopSellingToday,
  getInsights
};
