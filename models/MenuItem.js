const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  desc: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  prices: [{
    label: { type: String, required: true },
    value: { type: Number, required: true },
    _id: false
  }],
  special: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.__v;
      delete ret.createdAt;
      delete ret.updatedAt;
      return ret;
    }
  }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
