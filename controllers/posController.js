// controllers/posController.js
const Table = require('../models/Table');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Branch = require('../models/Branch');
const Receipt = require('../models/Receipt');
const Restaurant = require('../models/Restaurant');

// Get POS data (tables, menu, categories)
exports.getPosData = async (req, res) => {
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
    
    // Get branch info
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    
    // Get all tables for this branch
    const tables = await Table.find({ branchId }).sort('number');
    
    // Get all available categories
    const categories = await Category.find({ 
      restaurantId: branch.restaurantId,
      $or: [
        { branchId },
        { branchId: null }
      ]
    }).sort('displayOrder');
    
    // Get all menu items for this branch or restaurant-wide
    const menuItems = await MenuItem.find({
      restaurantId: branch.restaurantId,
      $or: [
        { branchId },
        { branchId: null }
      ],
      status: 'active'
    }).sort('title');
    
    // Get active orders
    const activeOrders = await Order.find({
      branchId,
      status: { $in: ['preparing', 'confirmed', 'served'] }
    }).sort('createdAt');
    
    res.json({
      branch,
      tables,
      categories,
      menuItems,
      activeOrders
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, email } = req.body;
    
    const order = await Order.findById(orderId);
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
    
    // Update order as paid
    order.paid = true;
    order.paymentMethod = paymentMethod;
    order.paymentDate = new Date();
    order.status = 'completed';
    
    await order.save();
    
    // Free up the table
    await Table.findByIdAndUpdate(order.tableId, {
      status: 'available',
      occupiedSince: null,
      currentOrderId: null
    });
    
    // Create receipt
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
      paid: true,
      email: email || ''
    });
    
    await receipt.save();
    
    // Send email receipt if email provided (implement with your email service)
    if (email) {
      receipt.sentToEmail = true;
      await receipt.save();
      
      // You would implement email sending here
      // using a service like nodemailer or SendGrid
    }
    
    res.json({
      message: 'Payment processed successfully',
      receipt,
      order
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};