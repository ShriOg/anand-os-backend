const mongoose = require('mongoose');
const { pramodDB } = require('../config/db');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  orderType: {
    type: String,
    enum: ['DINE_IN', 'TAKEAWAY'],
    required: true
  },
  persons: {
    type: Number
  },
  tableNumber: {
    type: Number
  },
  note: {
    type: String,
    trim: true,
    default: ''
  },
  items: [{
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: { type: String, required: true },
    size: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    _id: false
  }],
  total: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Pending', 'Preparing', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  acceptedAt: { type: Date },
  completedAt: { type: Date },
  estimatedMinutes: { type: Number },
  estimatedCompletionTime: { type: Date },
  actualCompletionTime: { type: Number }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// ── Status transition rules ──
const ALLOWED_TRANSITIONS = {
  Pending:   ['Preparing', 'Cancelled'],
  Preparing: ['Completed'],
  Completed: [],
  Cancelled: []
};

orderSchema.statics.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

/**
 * Validate whether a status transition is allowed.
 * Returns { valid, message }.
 */
orderSchema.statics.validateTransition = function (from, to) {
  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed) {
    return { valid: false, message: `Unknown current status: ${from}` };
  }
  if (!allowed.includes(to)) {
    return { valid: false, message: `Transition from "${from}" to "${to}" is not allowed` };
  }
  return { valid: true };
};

module.exports = pramodDB.model('Order', orderSchema);
