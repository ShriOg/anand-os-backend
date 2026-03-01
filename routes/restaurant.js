const express = require('express');
const { body, param } = require('express-validator');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validateMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/roleMiddleware');
const User = require('../models/User');
const Customer = require('../models/Customer');
const {
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
  getInsights
} = require('../controllers/restaurantController');

const router = express.Router();

// ── Optional auth: attaches req.user if valid token, else continues as guest ──
const optionalAuth = async (req, _res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (_) {
      // invalid token → proceed as guest
    }
  }
  next();
};

// ── Rate limiter for order creation ──
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many orders from this IP, please try again later.'
});

// ── Public ──
router.get('/menu', getMenu);

// ── Customer lookup by phone ──
router.get('/users/:phone', getUserByPhone);

// ── Order creation (guest or authed) ──
router.post(
  '/orders',
  orderLimiter,
  optionalAuth,
  [
    body('customerName').trim().notEmpty().withMessage('Customer name is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('orderType').isIn(['DINE_IN', 'TAKEAWAY']).withMessage('Invalid order type'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.itemId').isMongoId().withMessage('Item ID must be a valid ID'),
    body('items.*.size').trim().notEmpty().withMessage('Item size is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validate,
  createOrder
);

// ── Admin-only ──
router.get('/stats', /* protect, admin, */ getStats);
router.get('/analytics', /* protect, admin, */ getAnalytics);
router.get('/insights', /* protect, admin, */ getInsights);
router.get('/orders', /* protect, admin, */ getAllOrders);
router.get('/orders/today', /* protect, admin, */ getTodayOrders);
router.get('/menu/all', /* protect, admin, */ getMenuAll);

router.patch(
  '/orders/:id/status',
  /* protect, admin, */
  [
    param('id').isMongoId().withMessage('Invalid order ID'),
    body('status')
      .isIn([
        'Pending', 'Preparing', 'Completed', 'Cancelled',
        'PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'
      ])
      .withMessage('Invalid status')
  ],
  validate,
  updateOrderStatus
);

router.patch(
  '/menu/:id',
  /* protect, admin, */
  [param('id').isMongoId().withMessage('Invalid menu item ID')],
  validate,
  updateMenuItem
);

router.delete(
  '/orders/:id',
  /* protect, admin, */
  [param('id').isMongoId().withMessage('Invalid order ID')],
  validate,
  deleteOrder
);

// ── Cancel order by custom orderId ──
router.patch(
  '/orders/:orderId/cancel',
  [
    param('orderId').trim().notEmpty().withMessage('Order ID is required')
  ],
  validate,
  cancelOrder
);

router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find({})
      .sort({ createdAt: -1 });

    // Enrich customer data with dynamically calculated metrics from COMPLETED orders
    const enrichedCustomers = await Promise.all(
      customers.map(async (customer) => {
        const completedOrdersCount = await Order.countDocuments({
          phone: customer.phone,
          status: 'COMPLETED'
        });

        const completedRevenue = await Order.aggregate([
          { $match: { phone: customer.phone, status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const totalSpent = completedRevenue.length > 0 ? completedRevenue[0].total : 0;

        return {
          ...customer.toObject(),
          totalOrders: completedOrdersCount,     // Override with calculated value
          totalSpent,                            // Override with calculated value
          // Keep stored values for reference/legacy
          _storedTotalOrders: customer.totalOrders,
          _storedTotalSpent: customer.totalSpent
        };
      })
    );

    return res.json({
      success: true,
      data: enrichedCustomers
    });

  } catch (error) {
    console.error("Error fetching customers:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customers"
    });
  }
});

module.exports = router;
