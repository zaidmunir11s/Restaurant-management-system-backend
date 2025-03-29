// controllers/menuController.js
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Restaurant = require('../models/Restaurant');
const Branch = require('../models/Branch');

// Helper to check authorization
const checkMenuAuth = async (req, restaurantId, branchId) => {
  // Admin has full access
  
  // Owner can access their restaurants' menus
  if (req.user.role === 'owner') {
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || restaurant.owner.toString() !== req.user.id.toString()) {
      return false;
    }
    return true;
  }
  
  // Manager can access their branch's menu and restaurant menu
  if (req.user.role === 'manager') {
    if (!req.user.permissions.manageMenu) return false;
    
    if (req.user.restaurantId?.toString() !== restaurantId.toString()) {
      return false;
    }
    
    if (branchId && req.user.branchId?.toString() !== branchId.toString()) {
      return false;
    }
    
    return true;
  }
  
  // Waiters can view menu but not edit
  if (req.user.role === 'waiter') {
    if (req.method === 'GET') {
      if (req.user.restaurantId?.toString() !== restaurantId.toString()) {
        return false;
      }
      
      if (branchId && req.user.branchId?.toString() !== branchId.toString()) {
        return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  return false;
};

// Get menu items (for restaurant or branch)
exports.getMenuItems = async (req, res) => {
  try {
    let query = {};
    
    // If restaurant ID is specified
    if (req.query.restaurantId) {
      query.restaurantId = req.query.restaurantId;
    }
    
    // If branch ID is specified
    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }
    
    // If category is specified
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // If status is specified
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // For managers and waiters, restrict to their restaurant/branch
    if (req.user.role === 'manager' || req.user.role === 'waiter') {
      query.restaurantId = req.user.restaurantId;
      
      // If user is assigned to a branch, show branch-specific menu
      // Otherwise show restaurant-level menu
      if (req.user.branchId) {
        query.branchId = req.user.branchId;
      }
    }
    
    const menuItems = await MenuItem.find(query);
    res.json(menuItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get menu item by ID
exports.getMenuItemById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Check authorization
    const isAuthorized = await checkMenuAuth(req, menuItem.restaurantId, menuItem.branchId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(menuItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { 
      title, description, price, category, status, 
      restaurantId, branchId, imageUrl, modelUrl, 
      isVegetarian, isVegan, isGlutenFree, featured 
    } = req.body;
    
    // Check authorization
    const isAuthorized = await checkMenuAuth(req, restaurantId, branchId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Create new menu item
    const menuItem = new MenuItem({
      title,
      description,
      price,
      category,
      status,
      restaurantId,
      branchId,
      imageUrl,
      modelUrl,
      isVegetarian,
      isVegan,
      isGlutenFree,
      featured
    });
    
    await menuItem.save();
    
    res.status(201).json(menuItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const { 
      title, description, price, category, status, 
      restaurantId, branchId, imageUrl, modelUrl, 
      isVegetarian, isVegan, isGlutenFree, featured 
    } = req.body;
    
    // Build menu item object
    const menuItemFields = {};
    if (title) menuItemFields.title = title;
    if (description !== undefined) menuItemFields.description = description;
    if (price) menuItemFields.price = price;
    if (category) menuItemFields.category = category;
    if (status) menuItemFields.status = status;
    if (restaurantId) menuItemFields.restaurantId = restaurantId;
    if (branchId !== undefined) menuItemFields.branchId = branchId;
    if (imageUrl !== undefined) menuItemFields.imageUrl = imageUrl;
    if (modelUrl !== undefined) menuItemFields.modelUrl = modelUrl;
    if (isVegetarian !== undefined) menuItemFields.isVegetarian = isVegetarian;
    if (isVegan !== undefined) menuItemFields.isVegan = isVegan;
    if (isGlutenFree !== undefined) menuItemFields.isGlutenFree = isGlutenFree;
    if (featured !== undefined) menuItemFields.featured = featured;
    
    let menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Check authorization
    const isAuthorized = await checkMenuAuth(req, menuItem.restaurantId, menuItem.branchId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update menu item
    menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: menuItemFields },
      { new: true }
    );
    
    res.json(menuItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Check authorization
    const isAuthorized = await checkMenuAuth(req, menuItem.restaurantId, menuItem.branchId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get categories (for restaurant or branch)
exports.getCategories = async (req, res) => {
  try {
    let query = {};
    
    // If restaurant ID is specified
    if (req.query.restaurantId) {
      query.restaurantId = req.query.restaurantId;
    }
    
    // If branch ID is specified
    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }
    
    // For managers and waiters, restrict to their restaurant/branch
    if (req.user.role === 'manager' || req.user.role === 'waiter') {
      query.restaurantId = req.user.restaurantId;
      
      // If user is assigned to a branch, show branch-specific categories
      if (req.user.branchId) {
        query.branchId = req.user.branchId;
      }
    }
    
    const categories = await Category.find(query).sort('displayOrder');
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update categories (batch operation)
exports.updateCategories = async (req, res) => {
  try {
    const { restaurantId, branchId, categories } = req.body;
    
    // Check authorization
    const isAuthorized = await checkMenuAuth(req, restaurantId, branchId);
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete existing categories
    await Category.deleteMany({ 
      restaurantId, 
      branchId: branchId || null,
      // Preserve special categories like 'Deals' and 'Exclusive Offers'
      isSpecial: false 
    });
    
    // Create new categories
    const categoryDocs = categories
      .filter(cat => cat !== 'All')
      .map((name, index) => ({
        name,
        restaurantId,
        branchId: branchId || null,
        isSpecial: name === 'Deals' || name === 'Exclusive Offers',
        displayOrder: index
      }));
    
    const newCategories = await Category.insertMany(categoryDocs);
    
    res.json(newCategories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};