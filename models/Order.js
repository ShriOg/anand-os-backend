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
    enum: ['PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = pramodDB.model('Order', orderSchema);
