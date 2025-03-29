// routes/notifications.js
const express = require('express');
const router = express.Router();
const { 
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// @route   GET /api/notifications
// @desc    Get notifications
// @access  Private
router.get('/', auth, getNotifications);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, markAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, markAllAsRead);

// @route   POST /api/notifications
// @desc    Create notification (for testing)
// @access  Private (Owner, Manager)
router.post('/', auth, checkRole(['owner', 'manager']), createNotification);

module.exports = router;