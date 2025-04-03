// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'user' // Can be any custom role name
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  permissions: {
    manageUsers: {
      type: Boolean,
      default: false
    },
    manageRestaurants: {
      type: Boolean,
      default: false
    },
    manageBranches: {
      type: Boolean,
      default: false
    },
    accessPOS: {
      type: Boolean,
      default: false
    }
  },
  // New branch-specific permissions
  branchPermissions: {
    menu: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    }],
    tables: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);