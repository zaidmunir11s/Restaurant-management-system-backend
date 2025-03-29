// routes/users.js
const express = require('express');
const router = express.Router();
const { 
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRestaurant,
  getUsersByBranch
} = require('../controllers/userController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Owner, Manager)
router.get('/', auth, checkRole(['owner', 'manager']), getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Owner, Manager)
router.get('/:id', auth, checkRole(['owner', 'manager']), getUserById);

// @route   POST /api/users
// @desc    Create a user
// @access  Private (Owner, Manager)
router.post('/', auth, checkRole(['owner', 'manager']), createUser);

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Private (Owner, Manager)
router.put('/:id', auth, checkRole(['owner', 'manager']), updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Owner)
router.delete('/:id', auth, checkRole(['owner']), deleteUser);

// @route   GET /api/users/restaurant/:restaurantId
// @desc    Get users by restaurant
// @access  Private (Owner)
router.get('/restaurant/:restaurantId', auth, checkRole(['owner']), getUsersByRestaurant);

// @route   GET /api/users/branch/:branchId
// @desc    Get users by branch
// @access  Private (Owner, Manager)
router.get('/branch/:branchId', auth, checkRole(['owner', 'manager']), getUsersByBranch);

module.exports = router;