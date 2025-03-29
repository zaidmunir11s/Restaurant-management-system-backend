// routes/restaurants.js
const express = require('express');
const router = express.Router();
const { 
  getAllRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  getRestaurantStats
} = require('../controllers/restaurantController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');



// @route   GET /api/restaurants
// @desc    Get all restaurants
// @access  Private
router.get('/', auth, getAllRestaurants);

// @route   GET /api/restaurants/:id
// @desc    Get restaurant by ID
// @access  Private
router.get('/:id', auth, getRestaurantById);

// @route   POST /api/restaurants
// @desc    Create a restaurant
// @access  Private (Owner)
router.post('/', auth, checkRole(['owner']), createRestaurant);

// @route   PUT /api/restaurants/:id
// @desc    Update a restaurant
// @access  Private (Owner)
router.put('/:id', auth, checkRole(['owner']), updateRestaurant);

// @route   DELETE /api/restaurants/:id
// @desc    Delete a restaurant
// @access  Private (Owner)
router.delete('/:id', auth, checkRole(['owner']), deleteRestaurant);

// @route   GET /api/restaurants/:id/stats
// @desc    Get restaurant statistics
// @access  Private (Owner, Manager)
router.get('/:id/stats', auth, checkRole(['owner', 'manager']), getRestaurantStats);

module.exports = router;