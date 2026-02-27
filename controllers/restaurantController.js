const asyncHandler = require('../middleware/asyncHandler');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');

// @desc    Create a new order (auth optional, guest allowed)
// @route   POST /api/restaurant/orders
const createOrder = asyncHandler(async (req, res) => {
  const { customerName, phone, orderType, persons, tableNumber, items } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Order must contain at least one item');
  }

  // Fetch all referenced menu items in one query
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
    const menuItem = menuMap.get(item.itemId);
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

  const orderId = `PF${Date.now().toString(36).toUpperCase()}`;

  const order = await Order.create({
    orderId,
    customerName,
    phone,
    orderType,
    persons,
    tableNumber,
    items: orderItems,
    total,
    user: req.user ? req.user._id : undefined,
    status: 'PENDING'
  });

  // Loyalty: award points + badges if authenticated
  if (req.user) {
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { points: 10, totalOrders: 1 } },
      { new: true }
    );

    const badgesToAdd = [];
    if (updatedUser.totalOrders >= 25 && !updatedUser.badges.includes('GOLD')) {
      badgesToAdd.push('GOLD');
    }
    if (updatedUser.totalOrders >= 10 && !updatedUser.badges.includes('SILVER')) {
      badgesToAdd.push('SILVER');
    }
    if (updatedUser.totalOrders >= 5 && !updatedUser.badges.includes('BRONZE')) {
      badgesToAdd.push('BRONZE');
    }

    if (badgesToAdd.length > 0) {
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { badges: { $each: badgesToAdd } }
      });
    }
  }

  // Emit real-time event (does not touch battle namespace)
  const io = req.app.get('io');
  if (io) {
    io.emit('restaurant:new-order', order);
  }

  res.status(201).json({ success: true, data: order });
});

// @desc    Get today's orders (admin)
// @route   GET /api/restaurant/orders/today
const getTodayOrders = asyncHandler(async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const orders = await Order.find({ createdAt: { $gte: startOfDay } })
    .sort({ createdAt: -1 });

  res.json({ success: true, data: orders });
});

// @desc    Update order status (admin)
// @route   PATCH /api/restaurant/orders/:id/status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({ success: true, data: order });
});

// @desc    Get active menu
// @route   GET /api/restaurant/menu
const getMenu = asyncHandler(async (req, res) => {
  const items = await MenuItem.find({ active: true }).sort({ category: 1, name: 1 });
  res.json({ success: true, data: items });
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

  const [totalOrders, totalRevenueAgg, todayRevenueAgg, totalCustomers] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([
      { $match: { status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfDay }, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Order.distinct('phone')
  ]);

  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      totalCustomers: totalCustomers.length
    }
  });
});

module.exports = {
  createOrder,
  getTodayOrders,
  updateOrderStatus,
  getMenu,
  updateMenuItem,
  getStats
};
