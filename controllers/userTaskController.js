const Task = require('../models/Task');

// @desc    Get tasks assigned to the logged-in user
// @route   GET /api/user/tasks
// @access  Private/User
const getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user._id })
      .populate('assignedBy', 'fullName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error('getMyTasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching your tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get a single task by ID (only if assigned to logged-in user)
// @route   GET /api/user/tasks/:id
// @access  Private/User
const getMyTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      assignedTo: req.user._id
    }).populate('assignedBy', 'fullName email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('getMyTaskById error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Mark a task as Completed (only if assigned to logged-in user)
// @route   PATCH /api/user/tasks/:id/complete
// @access  Private/User
const markTaskComplete = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, assignedTo: req.user._id },
      { status: 'Completed' },
      { new: true, runValidators: true }
    ).populate('assignedBy', 'fullName email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or not assigned to you'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task marked as completed',
      data: task
    });
  } catch (error) {
    console.error('markTaskComplete error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { getMyTasks, getMyTaskById, markTaskComplete };
