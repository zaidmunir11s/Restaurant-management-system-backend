// controllers/userController.js
const User = require('../models/User');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create user (admin function)
// controllers/userController.js - Update the createUser function
exports.createUser = async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, 
      role, restaurantId, branchId, permissions, branchPermissions 
    } = req.body;
    
    // Create user object with all fields
    const userData = { 
      firstName, lastName, email, password, role,
      permissions: permissions || {
        manageUsers: false,
        manageRestaurants: false,
        manageBranches: false,
        accessPOS: true
      },
      branchPermissions: {
        menu: branchPermissions?.menu || [],
        tables: branchPermissions?.tables || []
      }
    };
    
    // Add IDs if present
    if (restaurantId) userData.restaurantId = restaurantId;
    if (branchId) userData.branchId = branchId;
    
    console.log('Creating user with data:', userData);
    
    // Create the user
    const user = new User(userData);
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Error in createUser:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// controllers/userController.js - Update the updateUser function
exports.updateUser = async (req, res) => {
  try {
    const { 
      firstName, lastName, email, password, 
      role, restaurantId, branchId, permissions, branchPermissions 
    } = req.body;
    
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields one by one to ensure proper handling
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    if (role) user.role = role;
    if (restaurantId !== undefined) user.restaurantId = restaurantId;
    if (branchId !== undefined) user.branchId = branchId;
    
    // Update permissions
    if (permissions) {
      user.permissions = permissions;
    }
    
    // Update branch permissions
    if (branchPermissions) {
      user.branchPermissions = {
        menu: branchPermissions.menu || [],
        tables: branchPermissions.tables || []
      };
    }
    
    // Save the updated user
    await user.save();
    
    // Return updated user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json(userResponse);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get users by restaurant
exports.getUsersByRestaurant = async (req, res) => {
  try {
    const users = await User.find({ restaurantId: req.params.restaurantId }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get users by branch
exports.getUsersByBranch = async (req, res) => {
  try {
    const users = await User.find({ branchId: req.params.branchId }).select('-password');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};