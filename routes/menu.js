// routes/menu.js
const express = require('express');
const router = express.Router();
const { 
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getCategories,
  updateCategories
} = require('../controllers/menuController');
const auth = require('../middleware/auth');

const multer= require("multer");

const upload = multer({ dest: "uploads/" });

// @route   GET /api/menu
// @desc    Get menu items
// @access  Private
router.get('/', auth,getMenuItems);

// @route   GET /api/menu/:id
// @desc    Get menu item by ID
// @access  Private
router.get('/:id', auth, getMenuItemById);

// @route   POST /api/menu
// @desc    Create a menu item
// @access  Private (Owner, Manager with permission)
router.post('/', auth,upload.single("modelUrl"),  createMenuItem);

// @route   PUT /api/menu/:id
// @desc    Update a menu item
// @access  Private (Owner, Manager with permission)
router.put('/:id', auth,upload.single("modelUrl"),  updateMenuItem);

// @route   DELETE /api/menu/:id
// @desc    Delete a menu item
// @access  Private (Owner, Manager with permission)
router.delete('/:id', auth, deleteMenuItem);

// @route   GET /api/menu/categories
// @desc    Get categories
// @access  Private
router.get('/categories', auth, getCategories);

// @route   POST /api/menu/categories
// @desc    Update categories
// @access  Private (Owner, Manager with permission)
router.post('/categories', auth, updateCategories);

module.exports = router;