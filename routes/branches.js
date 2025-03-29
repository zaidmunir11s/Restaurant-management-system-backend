// routes/branches.js
const express = require('express');
const router = express.Router();
const { 
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
} = require('../controllers/branchController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

// @route   GET /api/branches
// @desc    Get all branches
// @access  Private
router.get('/', auth, getAllBranches);

// @route   GET /api/branches/:id
// @desc    Get branch by ID
// @access  Private
router.get('/:id', auth, getBranchById);

// @route   POST /api/branches
// @desc    Create a branch
// @access  Private (Owner)
router.post('/', auth, checkRole(['owner']), createBranch);

// @route   PUT /api/branches/:id
// @desc    Update a branch
// @access  Private (Owner, Manager)
router.put('/:id', auth, updateBranch);

// @route   DELETE /api/branches/:id
// @desc    Delete a branch
// @access  Private (Owner)
router.delete('/:id', auth, checkRole(['owner']), deleteBranch);

// @route   GET /api/branches/:id/stats
// @desc    Get branch statistics
// @access  Private (Owner, Manager)
router.get('/:id/stats', auth, checkRole(['owner', 'manager']), getBranchStats);

module.exports = router;