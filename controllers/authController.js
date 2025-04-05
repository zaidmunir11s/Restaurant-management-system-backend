// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/auth');

// Register User
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, restaurantId, branchId, permissions } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      restaurantId,
      branchId,
      permissions
    });
    
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
    
    // Return token and user data (without password)
    const userData = { ...user.toObject() };
    delete userData.password;
    
    res.status(201).json({
      token,
      user: userData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login User
// controllers/authController.js - Fix the login function to include branch permissions in the token

// controllers/authController.js
// In controllers/authController.js - ensure login is properly comparing passwords
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Verify password - include debug output
    console.log('Comparing passwords for user:', email);
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      config.jwtSecret,
      { expiresIn: '1d' }
    );
    
    // Return token and user data (without password)
    const userData = { ...user.toObject() };
    delete userData.password;
    
    res.json({
      token,
      user: userData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};