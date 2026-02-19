const Task = require('../models/Task');
const User = require('../models/User');

// @desc    Create a new task and assign it to a user by email
// @route   POST /api/admin/task
// @access  Private/Admin
const createTask = async (req, res) => {
  try {
    const { title, description, assignToEmail } = req.body;

    // --- Input Validation ---
    if (!title || !description || !assignToEmail) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and assignToEmail'
      });
    }

    // --- Email format validation ---
    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(assignToEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // --- Find the user by email ---
    const assignedUser = await User.findOne({ email: assignToEmail.toLowerCase() });

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: `No user found with email: ${assignToEmail}`
      });
    }

    // --- Create the task ---
    const task = await Task.create({
      title,
      description,
      assignedTo: assignedUser._id,
      assignedBy: req.user._id,
      status: 'Pending'
    });

    // Populate references for the response
    await task.populate([
      { path: 'assignedTo', select: 'fullName email' },
      { path: 'assignedBy', select: 'fullName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Task created and assigned successfully',
      data: task
    });
  } catch (error) {
    console.error('createTask error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all tasks (admin view)
// @route   GET /api/admin/tasks
// @access  Private/Admin
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate('assignedTo', 'fullName email')
      .populate('assignedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('getAllTasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update task title/description (admin)
// @route   PATCH /api/admin/task/:id
// @access  Private/Admin
const updateTask = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least a title or description to update'
      });
    }

    const updateFields = {};
    if (title) updateFields.title = title.trim();
    if (description) updateFields.description = description.trim();

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'fullName email')
      .populate('assignedBy', 'fullName email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('updateTask error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update task status (admin)
// @route   PATCH /api/admin/task/:id/status
// @access  Private/Admin
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['Pending', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "Pending" or "Completed"'
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'fullName email')
      .populate('assignedBy', 'fullName email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });
  } catch (error) {
    console.error('updateTaskStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Delete a task (admin)
// @route   DELETE /api/admin/task/:id
// @access  Private/Admin
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('deleteTask error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { createTask, getAllTasks, updateTask, updateTaskStatus, deleteTask };
