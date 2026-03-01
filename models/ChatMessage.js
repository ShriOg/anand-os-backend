const mongoose = require('mongoose');
const { osDB } = require('../config/db');

const chatMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = osDB.model('ChatMessage', chatMessageSchema);
