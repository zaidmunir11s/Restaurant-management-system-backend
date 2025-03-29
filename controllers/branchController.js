// controllers/branchController.js
const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

// Get all branches (for a restaurant if specified)
exports.getAllBranches = async (req, res) => {
  try {
    let query = {};
    
    // If restaurant ID is specified in query params
    if (req.query.restaurantId) {
      query.restaurantId = req.query.restaurantId;
    }
    
    // If user is manager or waiter, only return their branch
    if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId) {
        query._id = req.user.branchId;
      } else if (req.user.restaurantId) {
        query.restaurantId = req.user.restaurantId;
      }
    }
    
    const branches = await Branch.find(query);
    res.json(branches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get branch by ID
exports.getBranchById = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('restaurantId', 'name cuisine')
      .populate('managerId', 'firstName lastName email');
      
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const restaurant = await Restaurant.findById(branch.restaurantId);
      if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== branch._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create branch
exports.createBranch = async (req, res) => {
  try {
    const { 
      name, restaurantId, address, city, state, zipCode, 
      phone, email, managerId, openingTime, closingTime, 
      weekdayHours, weekendHours, description, imageUrl, 
      status, tableCount 
    } = req.body;
    
    // Check if restaurant exists and user has access
  
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    
    // Verify ownership if user is owner
    if (req.user.role === 'owner' && restaurant.owner.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add branches to this restaurant' });
    }
    
    // Create new branch
    const branch = new Branch({
      name,
      restaurantId,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      managerId,
      openingTime,
      closingTime,
      weekdayHours,
      weekendHours,
      description,
      imageUrl,
      status,
      tableCount
    });
    
    await branch.save();
    
    // Create tables for the branch
    const tables = [];
    let indoorCount = Math.ceil(tableCount / 2);
    let outdoorCount = tableCount - indoorCount;
    
    // Create indoor tables
    for (let i = 1; i <= indoorCount; i++) {
      const capacity = i % 3 === 0 ? 6 : (i % 2 === 0 ? 4 : 2);
      const table = new Table({
        number: i,
        branchId: branch._id,
        capacity,
        status: 'available',
        section: 'Indoor'
      });
      tables.push(table);
    }
    
    // Create outdoor tables
    for (let i = indoorCount + 1; i <= tableCount; i++) {
      const capacity = i % 3 === 0 ? 6 : (i % 2 === 0 ? 4 : 2);
      const table = new Table({
        number: i,
        branchId: branch._id,
        capacity,
        status: 'available',
        section: 'Outdoor'
      });
      tables.push(table);
    }
    
    // Save all tables
    await Table.insertMany(tables);
    
    // Create default menu and categories if requested
    if (req.body.includeDefaultMenu) {
      // Clone restaurant-level menu items if they exist
      const restaurantMenuItems = await MenuItem.find({ restaurantId, branchId: null });
      
      if (restaurantMenuItems.length > 0) {
        // Clone existing menu items
        const branchMenuItems = restaurantMenuItems.map(item => {
          const newItem = { ...item.toObject() };
          delete newItem._id;
          newItem.branchId = branch._id;
          return newItem;
        });
        
        await MenuItem.insertMany(branchMenuItems);
      } else {
        // Create default categories
        const defaultCategories = ['Appetizers', 'Main Courses', 'Desserts', 'Beverages'];
        const categoryDocs = defaultCategories.map((name, index) => ({
          name,
          restaurantId,
          branchId: branch._id,
          displayOrder: index
        }));
        
        const categories = await Category.insertMany(categoryDocs);
        
        // Create some sample menu items for each category
        const menuItems = [];
        
        // Appetizers
        menuItems.push(new MenuItem({
          title: 'House Salad',
          description: 'Fresh mixed greens with tomatoes, cucumbers, and house dressing',
          price: 8.99,
          category: 'Appetizers',
          status: 'active',
          restaurantId,
          branchId: branch._id
        }));
        
        // Main courses
        menuItems.push(new MenuItem({
          title: 'Grilled Chicken',
          description: 'Tender grilled chicken breast with seasonal vegetables',
          price: 16.99,
          category: 'Main Courses',
          status: 'active',
          restaurantId,
          branchId: branch._id
        }));
        
        // Desserts
        menuItems.push(new MenuItem({
          title: 'Chocolate Cake',
          description: 'Rich chocolate cake with vanilla ice cream',
          price: 7.99,
          category: 'Desserts',
          status: 'active',
          restaurantId,
          branchId: branch._id
        }));
        
        // Beverages
        menuItems.push(new MenuItem({
          title: 'Fresh Lemonade',
          description: 'Freshly squeezed lemonade with mint',
          price: 3.99,
          category: 'Beverages',
          status: 'active',
          restaurantId,
          branchId: branch._id
        }));
        
        await MenuItem.insertMany(menuItems);
      }
    }
    
    res.status(201).json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update branch
exports.updateBranch = async (req, res) => {
  try {
    const { 
      name, restaurantId, address, city, state, zipCode, 
      phone, email, managerId, openingTime, closingTime, 
      weekdayHours, weekendHours, description, imageUrl, 
      status, tableCount 
    } = req.body;
    
    // Build branch object
    const branchFields = {};
    if (name) branchFields.name = name;
    if (restaurantId) branchFields.restaurantId = restaurantId;
    if (address) branchFields.address = address;
    if (city) branchFields.city = city;
    if (state) branchFields.state = state;
    if (zipCode !== undefined) branchFields.zipCode = zipCode;
    if (phone) branchFields.phone = phone;
    if (email !== undefined) branchFields.email = email;
    if (managerId !== undefined) branchFields.managerId = managerId;
    if (openingTime) branchFields.openingTime = openingTime;
    if (closingTime) branchFields.closingTime = closingTime;
    if (weekdayHours) branchFields.weekdayHours = weekdayHours;
    if (weekendHours) branchFields.weekendHours = weekendHours;
    if (description !== undefined) branchFields.description = description;
    if (imageUrl !== undefined) branchFields.imageUrl = imageUrl;
    if (status) branchFields.status = status;
    if (tableCount) branchFields.tableCount = tableCount;
    
    let branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const restaurant = await Restaurant.findById(branch.restaurantId);
      if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else if (req.user.role === 'manager') {
      if (req.user.branchId?.toString() !== branch._id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else if (req.user.role === 'waiter') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update branch
    branch = await Branch.findByIdAndUpdate(
      req.params.id,
      { $set: branchFields },
      { new: true }
    );
    
    // If table count has increased, add new tables
    if (tableCount && tableCount > branch.tableCount) {
      const newTablesCount = tableCount - branch.tableCount;
      const existingTablesCount = await Table.countDocuments({ branchId: branch._id });
      
      const newTables = [];
      for (let i = existingTablesCount + 1; i <= existingTablesCount + newTablesCount; i++) {
        const capacity = i % 3 === 0 ? 6 : (i % 2 === 0 ? 4 : 2);
        const section = i % 2 === 0 ? 'Indoor' : 'Outdoor';
        
        newTables.push({
          number: i,
          branchId: branch._id,
          capacity,
          status: 'available',
          section
        });
      }
      
      await Table.insertMany(newTables);
    }
    
    res.json(branch);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete branch
exports.deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const restaurant = await Restaurant.findById(branch.restaurantId);
      if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete branch
    await Branch.findByIdAndDelete(req.params.id);
    
    // Delete all tables associated with this branch
    await Table.deleteMany({ branchId: req.params.id });
    
    // Delete all menu items associated with this branch
    await MenuItem.deleteMany({ branchId: req.params.id });
    
    // Delete all categories associated with this branch
    await Category.deleteMany({ branchId: req.params.id });
    
    res.json({ message: 'Branch deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get branch statistics
exports.getBranchStats = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Get table count
    const tableCount = await Table.countDocuments({ branchId: req.params.id });
    
    // Get available, occupied, and reserved tables
    const availableTables = await Table.countDocuments({ branchId: req.params.id, status: 'available' });
    const occupiedTables = await Table.countDocuments({ branchId: req.params.id, status: 'occupied' });
    const reservedTables = await Table.countDocuments({ branchId: req.params.id, status: 'reserved' });
    
    // Get menu item count
    const menuItemCount = await MenuItem.countDocuments({ branchId: req.params.id });
    
    res.json({
      tableCount,
      availableTables,
      occupiedTables,
      reservedTables,
      menuItemCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};