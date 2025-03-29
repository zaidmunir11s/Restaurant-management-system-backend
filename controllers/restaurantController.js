// controllers/restaurantController.js
const Restaurant = require('../models/Restaurant');
const Branch = require('../models/Branch');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// Get all restaurants
exports.getAllRestaurants = async (req, res) => {
  try {
    // If user is owner, return only their restaurants
    if (req.user.role === 'owner') {
      const restaurants = await Restaurant.find({ owner: req.user.id });
      return res.json(restaurants);
    }
    
    // For managers and waiters, return just their assigned restaurant
    if (req.user.restaurantId) {
      const restaurant = await Restaurant.findById(req.user.restaurantId);
      return res.json(restaurant ? [restaurant] : []);
    }
    
    // Admin can see all
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get restaurant by ID
exports.getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if ((req.user.role === 'manager' || req.user.role === 'waiter') && 
        req.user.restaurantId?.toString() !== restaurant._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create restaurant
exports.createRestaurant = async (req, res) => {
  try {
    const { name, cuisine, address, city, state, zipCode, phone, email, website, description, status, imageUrl } = req.body;
    
    // Create new restaurant
    const restaurant = new Restaurant({
      name,
      cuisine,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      status,
      imageUrl,
      owner: req.user.id
    });
    
    await restaurant.save();
    
    res.status(201).json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const { name, cuisine, address, city, state, zipCode, phone, email, website, description, status, imageUrl } = req.body;
    
    // Build restaurant object
    const restaurantFields = {};
    if (name) restaurantFields.name = name;
    if (cuisine !== undefined) restaurantFields.cuisine = cuisine;
    if (address) restaurantFields.address = address;
    if (city) restaurantFields.city = city;
    if (state) restaurantFields.state = state;
    if (zipCode !== undefined) restaurantFields.zipCode = zipCode;
    if (phone) restaurantFields.phone = phone;
    if (email !== undefined) restaurantFields.email = email;
    if (website !== undefined) restaurantFields.website = website;
    if (description !== undefined) restaurantFields.description = description;
    if (status) restaurantFields.status = status;
    if (imageUrl !== undefined) restaurantFields.imageUrl = imageUrl;
    
    let restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update restaurant
    restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: restaurantFields },
      { new: true }
    );
    
    res.json(restaurant);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner' && restaurant.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete restaurant and its dependencies
    await Restaurant.findByIdAndDelete(req.params.id);
    
    // Delete related branches
    await Branch.deleteMany({ restaurantId: req.params.id });
    
    // Delete related menu items
    await MenuItem.deleteMany({ restaurantId: req.params.id });
    
    // Delete related categories
    await Category.deleteMany({ restaurantId: req.params.id });
    
    res.json({ message: 'Restaurant deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get restaurant statistics
exports.getRestaurantStats = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Get branch count
    const branchCount = await Branch.countDocuments({ restaurantId: req.params.id });
    
    // Get menu item count
    const menuItemCount = await MenuItem.countDocuments({ restaurantId: req.params.id, branchId: null });
    
    res.json({
      branchCount,
      menuItemCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};