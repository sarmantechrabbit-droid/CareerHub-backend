const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  resetPassword
} = require('../controllers/userController');
const {
  getMyTasks,
  getMyTaskById,
  markTaskComplete
} = require('../controllers/userTaskController');
const { protect } = require('../middleware/authMiddleware');
const { isActive } = require('../middleware/statusMiddleware');

// All user routes are protected by auth and status check
router.use(protect);
router.use(isActive);

// Profile routes
router.get('/profile', getUserProfile);
router.patch('/change-password', changePassword);
router.patch('/reset-password', resetPassword);
router.patch('/update-profile', updateUserProfile);

// Task routes (only tasks assigned to the logged-in user)
router.get('/tasks', getMyTasks);                        // Get all my tasks
router.get('/tasks/:id', getMyTaskById);                 // Get a single task
router.patch('/tasks/:id/complete', markTaskComplete);   // Mark task as completed

module.exports = router;
