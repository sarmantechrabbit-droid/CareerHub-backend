const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');
const {
  createTask,
  getAllTasks,
  updateTask,
  updateTaskStatus,
  deleteTask
} = require('../controllers/adminTaskController');
const { protect } = require('../middleware/authMiddleware');
const { isActive } = require('../middleware/statusMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes are protected
router.use(protect);
router.use(isActive);
router.use(authorize('admin'));

// Dashboard stats
router.get('/stats', getAdminStats);

// Task routes
router.post('/task', createTask);                  // Create & assign a task
router.get('/tasks', getAllTasks);                  // Get all tasks
router.patch('/task/:id', updateTask);              // Update task title/description
router.patch('/task/:id/status', updateTaskStatus); // Update task status
router.delete('/task/:id', deleteTask);             // Delete a task

module.exports = router;
