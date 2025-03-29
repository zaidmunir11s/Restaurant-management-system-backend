// controllers/orderController.js
const Order = require('../models/Order');
const Table = require('../models/Table');
const Receipt = require('../models/Receipt');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');

// Get all orders (for a branch)
exports.getOrders = async (req, res) => {
  try {
    let query = {};
    
    // If branch ID is specified
    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }
    
    // If table ID is specified
    if (req.query.tableId) {
      query.tableId = req.query.tableId;
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('tableId', 'number section')
      .populate('serverId', 'firstName lastName');
    
    // Get total count for pagination
    const total = await Order.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active orders (for POS)
exports.getActiveOrders = async (req, res) => {
  try {
    const branchId = req.query.branchId || req.user.branchId;
    
    if (!branchId) {
      return res.status(400).json({ message: 'Branch ID is required' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      if (!req.user.permissions.accessPOS) {
        return res.status(403).json({ message: 'Not authorized to access POS' });
      }
    }
    
    // Get active orders (not completed or cancelled)
    const orders = await Order.find({
      branchId,
      status: { $in: ['preparing', 'confirmed', 'served'] }
    })
      .sort({ createdAt: 1 })
      .populate('tableId', 'number section')
      .populate('serverId', 'firstName lastName');
    
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('tableId', 'number section')
      .populate('serverId', 'firstName lastName')
      .populate('items.menuItemId', 'title imageUrl');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(order.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== order.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new order
exports.createOrder = async (req, res) => {
  try {
    const { 
      branchId, tableId, items, customerName,
      discountType, discountValue
    } = req.body;
    
    // Check if branch and table exist
    const table = await Table.findById(tableId);
    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }
    
    if (table.branchId.toString() !== branchId.toString()) {
      return res.status(400).json({ message: 'Table does not belong to this branch' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      if (!req.user.permissions.accessPOS) {
        return res.status(403).json({ message: 'Not authorized to access POS' });
      }
    }
    
    // Validate and process order items
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must have at least one item' });
    }
    
    // Fetch menu items to verify prices
    const menuItemIds = items.map(item => item.menuItemId);
    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds }
    });
    
    // Create a map for quick access to menu items
    const menuItemMap = {};
    menuItems.forEach(item => {
      menuItemMap[item._id.toString()] = item;
    });
    
    // Process order items and calculate subtotal
    const processedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      const menuItem = menuItemMap[item.menuItemId.toString()];
      
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item with ID ${item.menuItemId} not found` });
      }
      
      const quantity = item.quantity || 1;
      const price = menuItem.price;
      const amount = price * quantity;
      
      processedItems.push({
        menuItemId: menuItem._id,
        name: menuItem.title,
        price,
        quantity,
        amount,
        status: 'ordered'
      });
      
      subtotal += amount;
    }
    
    // Apply discount if any
    let discountAmount = 0;
    if (discountType === 'percent' && discountValue) {
      discountAmount = (subtotal * (discountValue / 100)).toFixed(2);
    } else if (discountType === 'amount' && discountValue) {
      discountAmount = parseFloat(discountValue).toFixed(2);
    }
    
    // Calculate tax (assuming 10% tax rate)
    const taxRate = 0.1;
    const tax = ((subtotal - discountAmount) * taxRate).toFixed(2);
    
    // Calculate total
    const total = (subtotal - discountAmount + parseFloat(tax)).toFixed(2);
    
    // Create new order
    const order = new Order({
      branchId,
      tableId,
      tableNumber: table.number,
      items: processedItems,
      subtotal,
      discountType: discountType || 'none',
      discountValue: discountValue || 0,
      discountAmount,
      tax,
      total,
      customerName: customerName || 'Guest',
      serverId: req.user.id
    });
    
    await order.save();
    
    // Update table status
    await Table.findByIdAndUpdate(tableId, {
      status: 'occupied',
      occupiedSince: new Date(),
      currentOrderId: order._id
    });
    
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update order
exports.updateOrder = async (req, res) => {
  try {
    const { 
      items, status, customerName, discountType, 
      discountValue, paid, paymentMethod
    } = req.body;
    
    let order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(order.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId?.toString() !== order.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      if (!req.user.permissions.accessPOS) {
        return res.status(403).json({ message: 'Not authorized to access POS' });
      }
    }
    
    // Update order fields
    const updateFields = {};
    
    // Update items and recalculate if needed
    if (items && items.length > 0) {
      // Fetch menu items to verify prices
      const menuItemIds = items.map(item => item.menuItemId);
      const menuItems = await MenuItem.find({
        _id: { $in: menuItemIds }
      });
      
      // Create a map for quick access to menu items
      const menuItemMap = {};
      menuItems.forEach(item => {
        menuItemMap[item._id.toString()] = item;
      });
      
      // Process order items and calculate subtotal
      const processedItems = [];
      let subtotal = 0;
      
      for (const item of items) {
        const menuItem = menuItemMap[item.menuItemId.toString()];
        
        if (!menuItem) {
          return res.status(404).json({ message: `Menu item with ID ${item.menuItemId} not found` });
        }
        
        const quantity = item.quantity || 1;
        const price = menuItem.price;
        const amount = price * quantity;
        
        processedItems.push({
          menuItemId: menuItem._id,
          name: menuItem.title,
          price,
          quantity,
          amount,
          status: item.status || 'ordered'
        });
        
        subtotal += amount;
      }
      
      updateFields.items = processedItems;
      updateFields.subtotal = subtotal;
      
      // Apply discount if any
      let discountAmount = 0;
      const newDiscountType = discountType || order.discountType;
      const newDiscountValue = discountValue !== undefined ? discountValue : order.discountValue;
      
      if (newDiscountType === 'percent' && newDiscountValue) {
        discountAmount = (subtotal * (newDiscountValue / 100)).toFixed(2);
      } else if (newDiscountType === 'amount' && newDiscountValue) {
        discountAmount = parseFloat(newDiscountValue).toFixed(2);
      }
      
      // Calculate tax (assuming 10% tax rate)
      const taxRate = 0.1;
      const tax = ((subtotal - discountAmount) * taxRate).toFixed(2);
      
      // Calculate total
      const total = (subtotal - discountAmount + parseFloat(tax)).toFixed(2);
      
      updateFields.discountType = newDiscountType;
      updateFields.discountValue = newDiscountValue;
      updateFields.discountAmount = discountAmount;
      updateFields.tax = tax;
      updateFields.total = total;
      updateFields.modified = true;
    } else if (discountType || discountValue !== undefined) {
      // Only update discount without changing items
      let discountAmount = 0;
      const newDiscountType = discountType || order.discountType;
      const newDiscountValue = discountValue !== undefined ? discountValue : order.discountValue;
      
      if (newDiscountType === 'percent' && newDiscountValue) {
        discountAmount = (order.subtotal * (newDiscountValue / 100)).toFixed(2);
      } else if (newDiscountType === 'amount' && newDiscountValue) {
        discountAmount = parseFloat(newDiscountValue).toFixed(2);
      }
      
      // Calculate tax (assuming 10% tax rate)
      const taxRate = 0.1;
      const tax = ((order.subtotal - discountAmount) * taxRate).toFixed(2);
      
      // Calculate total
      const total = (order.subtotal - discountAmount + parseFloat(tax)).toFixed(2);
      
      updateFields.discountType = newDiscountType;
      updateFields.discountValue = newDiscountValue;
      updateFields.discountAmount = discountAmount;
      updateFields.tax = tax;
      updateFields.total = total;
      updateFields.modified = true;
    }
    
    if (status) updateFields.status = status;
    if (customerName) updateFields.customerName = customerName;
    
    // Handle payment if paid
    if (paid) {
      updateFields.paid = true;
      updateFields.paymentMethod = paymentMethod || 'cash';
      updateFields.paymentDate = new Date();
      
      // If paid and status not already completed, set to completed
      if (status !== 'completed' && status !== 'cancelled') {
        updateFields.status = 'completed';
      }
    }
    
    // Update order
    order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    
    // Handle table status changes based on order status
    if (status === 'completed' || status === 'cancelled') {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        occupiedSince: null,
        currentOrderId: null
      });
      
      // Create receipt if completed and paid
      if (status === 'completed' && (paid || order.paid)) {
        const receipt = new Receipt({
          orderId: order._id,
          branchId: order.branchId,
          tableNumber: order.tableNumber,
          items: order.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: item.amount
          })),
          subtotal: order.subtotal,
          discount: order.discountAmount,
          tax: order.tax,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paid: true
        });
        
        await receipt.save();
      }
    }
    
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete order
exports.deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(order.branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager') {
      if (req.user.branchId?.toString() !== order.branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Delete order
    await Order.findByIdAndDelete(req.params.id);
    
    // Reset table if this order was active
    const table = await Table.findById(order.tableId);
    if (table && table.currentOrderId?.toString() === order._id.toString()) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: 'available',
        occupiedSince: null,
        currentOrderId: null
      });
    }
    
    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};