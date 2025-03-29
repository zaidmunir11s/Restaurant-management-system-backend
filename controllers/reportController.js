// controllers/reportController.js
const Order = require('../models/Order');
const Receipt = require('../models/Receipt');
const MenuItem = require('../models/MenuItem');
const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');
const mongoose = require('mongoose');

// Sales by date range
exports.getSalesByDateRange = async (req, res) => {
  try {
    const { branchId, restaurantId, startDate, endDate } = req.query;
    
    // Authorization check
    if (!await checkReportAuth(req, restaurantId, branchId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const query = {};
    
    // Filter by restaurant if owner or admin
    if (restaurantId && (req.user.role === 'owner' || req.user.role === 'admin')) {
      // Get all branches for this restaurant
      const branches = await Branch.find({ restaurantId }).select('_id');
      const branchIds = branches.map(branch => branch._id);
      query.branchId = { $in: branchIds };
    }
    
    // Filter by specific branch
    if (branchId) {
      query.branchId = branchId;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }
    
    // Only include completed and paid orders
    query.status = 'completed';
    query.paid = true;
    
    // Get daily sales
    const dailySales = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalSales: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          totalSales: 1,
          count: 1
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    // Get total metrics
    const totalMetrics = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalOrders: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] }
        }
      }
    ]);
    
    res.json({
      dailySales,
      metrics: totalMetrics.length > 0 ? totalMetrics[0] : {
        totalSales: 0,
        totalOrders: 0,
        avgOrderValue: 0
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Top selling menu items
exports.getTopSellingItems = async (req, res) => {
  try {
    const { branchId, restaurantId, startDate, endDate, limit } = req.query;
    
    // Authorization check
    if (!await checkReportAuth(req, restaurantId, branchId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const itemLimit = parseInt(limit) || 10;
    
    const query = {};
    
    // Filter by restaurant if owner or admin
    if (restaurantId && (req.user.role === 'owner' || req.user.role === 'admin')) {
      // Get all branches for this restaurant
      const branches = await Branch.find({ restaurantId }).select('_id');
      const branchIds = branches.map(branch => branch._id);
      query.branchId = { $in: branchIds };
    }
    
    // Filter by specific branch
    if (branchId) {
      query.branchId = branchId;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDateTime;
      }
    }
    
    // Only include completed and paid orders
    query.status = 'completed';
    query.paid = true;
    
    // Get top selling items
    const topItems = await Order.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.menuItemId',
          name: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalSales: { $sum: '$items.amount' }
        }
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem'
        }
      },
      {
        $addFields: {
          category: { $arrayElemAt: ['$menuItem.category', 0] },
          imageUrl: { $arrayElemAt: ['$menuItem.imageUrl', 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          imageUrl: 1,
          totalQuantity: 1,
          totalSales: 1
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: itemLimit }
    ]);
    
    // Get overall totals for comparison
    const overallTotals = await Order.aggregate([
      { $match: query },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalItemsSold: { $sum: '$items.quantity' },
          totalSales: { $sum: '$items.amount' }
        }
      },
      { $project: { _id: 0 } }
    ]);
    
    // Calculate percentage of total for each item
    const result = topItems.map(item => {
      const percentageOfQuantity = overallTotals.length > 0 ? 
        ((item.totalQuantity / overallTotals[0].totalItemsSold) * 100).toFixed(2) : 0;
      
      const percentageOfSales = overallTotals.length > 0 ? 
        ((item.totalSales / overallTotals[0].totalSales) * 100).toFixed(2) : 0;
      
      return {
        ...item,
        percentageOfQuantity,
        percentageOfSales
      };
    });
    
    res.json({
      topItems: result,
      totalItemsSold: overallTotals.length > 0 ? overallTotals[0].totalItemsSold : 0,
      totalSales: overallTotals.length > 0 ? overallTotals[0].totalSales : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Sales by category
exports.getSalesByCategory = async (req, res) => {
  try {
    const { branchId, restaurantId, startDate, endDate } = req.query;
    
   // controllers/reportController.js (continued)
    // Authorization check
    if (!await checkReportAuth(req, restaurantId, branchId)) {
        return res.status(403).json({ message: 'Not authorized' });
      }
      
      const query = {};
      
      // Filter by restaurant if owner or admin
      if (restaurantId && (req.user.role === 'owner' || req.user.role === 'admin')) {
        // Get all branches for this restaurant
        const branches = await Branch.find({ restaurantId }).select('_id');
        const branchIds = branches.map(branch => branch._id);
        query.branchId = { $in: branchIds };
      }
      
      // Filter by specific branch
      if (branchId) {
        query.branchId = branchId;
      }
      
      // Filter by date range
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          query.createdAt.$lte = endDateTime;
        }
      }
      
      // Only include completed and paid orders
      query.status = 'completed';
      query.paid = true;
      
      // Get sales by category
      const categoryData = await Order.aggregate([
        { $match: query },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'menuitems',
            localField: 'items.menuItemId',
            foreignField: '_id',
            as: 'menuItem'
          }
        },
        {
          $addFields: {
            category: { $arrayElemAt: ['$menuItem.category', 0] }
          }
        },
        {
          $group: {
            _id: '$category',
            totalSales: { $sum: '$items.amount' },
            itemCount: { $sum: '$items.quantity' }
          }
        },
        {
          $project: {
            _id: 0,
            category: '$_id',
            totalSales: 1,
            itemCount: 1
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
      
      // Calculate total for percentage
      const total = categoryData.reduce((acc, curr) => acc + curr.totalSales, 0);
      
      // Add percentage to each category
      const results = categoryData.map(item => ({
        ...item,
        percentage: total > 0 ? ((item.totalSales / total) * 100).toFixed(2) : 0
      }));
      
      res.json({
        categories: results,
        total
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
  // Helper function to check report authorization
  async function checkReportAuth(req, restaurantId, branchId) {
    // Admin has full access
    
    // Owner can access their restaurant reports
    if (req.user.role === 'owner' && restaurantId) {
      const restaurant = await Restaurant.findById(restaurantId);
      if (!restaurant || restaurant.owner.toString() !== req.user.id.toString()) {
        return false;
      }
      return true;
    }
    
    // Manager can access their branch reports
    if (req.user.role === 'manager') {
      if (branchId && req.user.branchId?.toString() !== branchId.toString()) {
        return false;
      }
      
      if (restaurantId && req.user.restaurantId?.toString() !== restaurantId.toString()) {
        return false;
      }
      
      return true;
    }
    
    // Waiters cannot access reports
    if (req.user.role === 'waiter') {
      return false;
    }
    
    return false;
  }