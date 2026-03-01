const mongoose = require('mongoose');
const { pramodDB } = require('../config/db');

const customerSchema = new mongoose.Schema({
  name: String,
  phone: {
    type: String,
    required: true,
    unique: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = pramodDB.model('Customer', customerSchema);
