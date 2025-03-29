// controllers/notificationController.js
const Notification = require('../models/Notification');
const Branch = require('../models/Branch');
const Restaurant = require('../models/Restaurant');

// Get notifications for user
exports.getNotifications = async (req, res) => {
  try {
    const query = {};
    
    // Filter by specific branch if user is manager or waiter
    if (req.user.role === 'manager' || req.user.role === 'waiter') {
      if (req.user.branchId) {
        query.branchId = req.user.branchId;
      } else {
        return res.json([]);
      }
    } else if (req.user.role === 'owner') {
      // For owners, get notifications from all their branches
      const restaurants = await Restaurant.find({ owner: req.user.id }).select('_id');
      const restaurantIds = restaurants.map(restaurant => restaurant._id);
      
      const branches = await Branch.find({ restaurantId: { $in: restaurantIds } }).select('_id');
      const branchIds = branches.map(branch => branch._id);
      
      query.branchId = { $in: branchIds };
    }
    
    // Recipient-specific notifications
    query.$or = [
      { recipientId: req.user.id },
      { recipientId: null }
    ];
    
    // Get unread first, then recent notifications
    const notifications = await Notification.find(query)
      .sort({ read: 1, createdAt: -1 })
      .limit(20)
      .populate('branchId', 'name')
      .populate('tableId', 'number section')
      .populate('orderId', 'tableNumber')
      .exec();
    
    // Count total unread
    const unreadCount = await Notification.countDocuments({
      ...query,
      read: false
    });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check authorization
    if (notification.recipientId && notification.recipientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const { branchId } = req.query;
    
    const query = {
      read: false
    };
    
    // Filter by branch
    if (branchId) {
      query.branchId = branchId;
    } else if (req.user.branchId) {
      query.branchId = req.user.branchId;
    }
    
    // Only update notifications for this user or general ones
    query.$or = [
      { recipientId: req.user.id },
      { recipientId: null }
    ];
    
    await Notification.updateMany(query, { $set: { read: true } });
    
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create notification (for internal use and testing)
exports.createNotification = async (req, res) => {
  try {
    const { type, title, message, branchId, tableId, orderId, recipientId } = req.body;
    
    // Check authorization
    if (req.user.role === 'owner') {
      const branch = await Branch.findById(branchId);
      if (branch) {
        const restaurant = await Restaurant.findById(branch.restaurantId);
        if (restaurant && restaurant.owner.toString() !== req.user.id.toString()) {
          return res.status(403).json({ message: 'Not authorized' });
        }
      }
    } else if (req.user.role === 'manager') {
      if (req.user.branchId?.toString() !== branchId.toString()) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }
    
    const notification = new Notification({
      type,
      title,
      message,
      branchId,
      tableId: tableId || null,
      orderId: orderId || null,
      recipientId: recipientId || null
    });
    
    await notification.save();
    
    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};