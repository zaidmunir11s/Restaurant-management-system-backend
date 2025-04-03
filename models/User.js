// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// models/User.js modifications
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
  // Allow multiple restaurants and branches
  restaurants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant'
  }],
  branches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],
  permissions: {
    editRestaurantDetails: {
      type: Boolean,
      default: false
    },
    createBranches: {
      type: Boolean,
      default: false
    },
    editBranchInfo: {
      type: Boolean,
      default: false
    },
    editMenu: {
      type: Boolean,
      default: false
    },
    editTables: {
      type: Boolean,
      default: false
    },
    accessPOS: {
      type: Boolean,
      default: false
    }
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