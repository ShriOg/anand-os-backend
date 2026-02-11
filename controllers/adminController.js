const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const Note = require('../models/Note');
const File = require('../models/File');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }

    await Note.deleteMany({ user: user._id });
    await File.deleteMany({ user: user._id });
    await User.deleteOne({ _id: req.params.id });

    res.json({ message: 'User deleted successfully' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const totalNotes = await Note.countDocuments({});
  const totalFiles = await File.countDocuments({});

  const files = await File.find({});
  const totalStorage = files.reduce((acc, file) => acc + file.size, 0);

  res.json({
    totalUsers,
    totalNotes,
    totalFiles,
    totalStorage
  });
});

module.exports = {
  getAllUsers,
  deleteUser,
  getDashboardStats
};
