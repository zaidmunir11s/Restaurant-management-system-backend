// models/Order.js
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['ordered', 'preparing', 'ready', 'served', 'cancelled'],
    default: 'ordered'
  }
});

const OrderSchema = new mongoose.Schema({
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  tableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Table',
    required: true
  },
  tableNumber: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['preparing', 'confirmed', 'served', 'completed', 'cancelled'],
    default: 'preparing'
  },
  items: [OrderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  discountType: {
    type: String,
    enum: ['percent', 'amount', 'none'],
    default: 'none'
  },
  discountValue: {
    type: Number,
    default: 0
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    default: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile', 'qr', ''],
    default: ''
  },
  paymentDate: {
    type: Date,
    default: null
  },
  customerName: {
    type: String,
    default: 'Guest'
  },
  modified: {
    type: Boolean,
    default: false
  },
  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', OrderSchema);