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
  // In models/User.js - add createdBy field to schema
createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
// In models/User.js - verify the password hashing middleware
// Password hashing middleware
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password using our new salt
    this.password = await bcrypt.hash(this.password, salt);
    
    console.log('Password hashed successfully');
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Method to compare passwords
// In models/User.js - verify the comparePassword method
// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    console.log('Comparing password in User model method');
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('Password match result (in model):', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing password:', error);
    throw error;
  }
};

module.exports = mongoose.model('User', UserSchema);