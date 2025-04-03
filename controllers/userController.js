// controllers/userController.js
const User = require('../models/User');

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
exports.createUser = async (req, res) => {
  try {
    console.log('Create user request received:', req.body);
    
    // Extract fields from request
    const { 
      firstName, lastName, email, password, 
      role, restaurantId, branchId, permissions 
    } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create user object
    const userData = { 
      firstName, lastName, email, password, role 
    };
    
    // Add optional fields
    if (restaurantId) userData.restaurantId = restaurantId;
    if (branchId) userData.branchId = branchId;
    if (permissions) userData.permissions = permissions;
    
    console.log('Creating user with data:', userData);
    
    // Create the user
    const user = new User(userData);
    await user.save();
    
    // Return user without password
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (err) {
    console.error('Error in createUser:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update user
// controllers/userController.js - update user function
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, restaurants, branches, permissions } = req.body;
    
    // Build user object
    const userFields = {};
    if (firstName) userFields.firstName = firstName;
    if (lastName) userFields.lastName = lastName;
    if (email) userFields.email = email;
    if (password && password.trim() !== '') {
      // Only hash and update password if it's provided
      const salt = await bcrypt.genSalt(10);
      userFields.password = await bcrypt.hash(password, salt);
    }
    if (role) userFields.role = role;
    if (restaurants) userFields.restaurants = restaurants;
    if (branches) userFields.branches = branches;
    if (permissions) userFields.permissions = permissions;
    
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (err) {
    console.error(err);
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