const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userManagementController');
const { protect } = require('../middleware/authMiddleware');
const { isActive } = require('../middleware/statusMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All user management routes are protected
router.use(protect);
router.use(isActive);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.get('/user/:id', getUserById);
router.post('/create', createUser); // Specific endpoint for the "Add New User" form
router.put('/user/:id', updateUser);
router.delete('/user/:id', deleteUser);

module.exports = router;
