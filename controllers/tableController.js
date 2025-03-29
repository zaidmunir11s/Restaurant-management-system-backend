// controllers/tableController.js
const Table = require('../models/Table');
const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');

// Get tables (for a branch)
exports.getTables = async (req, res) => {
  try {
    let query = {};
    
    // If branch ID is specified
    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }
    
    // If section is specified
    if (req.query.section) {
      query.section = req.query.section;
    }
    
    // If status is specified
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // For managers and waiters, restrict to their branch
    if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId) {
        query.branchId = req.user.branchId;
      } else {
        return res.json([]);
      }
    }
    
    const tables = await Table.find(query).sort('number');
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get table by ID
exports.getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(table.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== table.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    res.json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create table
exports.createTable = async (req, res) => {
  try {
    const { number, branchId, capacity, status, section } = req.body;
    
    // Check if branch exists
    const branch = await Branch.findById(branchId);
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
      if (!req.user.permissions.manageTables || req.user.branchId?.toString() !== branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Check if table number already exists in this branch
    const existingTable = await Table.findOne({ branchId, number });
    if (existingTable) {
      return res.status(400).json({ message: 'Table number already exists in this branch' });
    }
    
    // Create new table
    const table = new Table({
      number,
      branchId,
      capacity,
      status,
      section
    });
    
    await table.save();
    
    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update table
exports.updateTable = async (req, res) => {
  try {
    const { number, capacity, status, section } = req.body;
    
    // Build table object
    const tableFields = {};
    if (number) tableFields.number = number;
    if (capacity) tableFields.capacity = capacity;
    if (status) tableFields.status = status;
    if (section) tableFields.section = section;
    
    let table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(table.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager') {
      if (!req.user.permissions.manageTables || req.user.branchId?.toString() !== table.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else if (req.user.role === 'waiter') {
      // Only waiters can update table status
      if (!req.user.permissions.accessPOS || req.user.branchId?.toString() !== table.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      // Restrict waiters to only update status
      delete tableFields.number;
      delete tableFields.capacity;
      delete tableFields.section;
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // If changing number, check for duplicates
    if (number && number !== table.number) {
      const existingTable = await Table.findOne({ 
        branchId: table.branchId, 
        number, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingTable) {
        return res.status(400).json({ message: 'Table number already exists in this branch' });
      }
    }
    
    // Update table
    table = await Table.findByIdAndUpdate(
      req.params.id,
      { $set: tableFields },
      { new: true }
    );
    
    res.json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete table
exports.deleteTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(table.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager') {
      if (!req.user.permissions.manageTables || req.user.branchId?.toString() !== table.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Table.findByIdAndDelete(req.params.id);
    res.json({ message: 'Table deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};