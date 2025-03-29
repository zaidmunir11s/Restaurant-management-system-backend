// models/Category.js
const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },
  isSpecial: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  }
});

// Compound index to ensure category names are unique within a restaurant/branch combination
CategorySchema.index({ name: 1, restaurantId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);