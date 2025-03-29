// models/Table.js
const mongoose = require('mongoose');

const TableSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  capacity: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved'],
    default: 'available'
  },
  section: {
    type: String,
    enum: ['Indoor', 'Outdoor'],
    default: 'Indoor'
  },
  occupiedSince: {
    type: Date,
    default: null
  },
  currentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  }
});

// Compound index to ensure table numbers are unique within a branch
TableSchema.index({ number: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Table', TableSchema);