const express = require('express');
const {
  getAllUsers,
  deleteUser,
  getDashboardStats
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/users', getAllUsers);

router.delete('/users/:id', deleteUser);

router.get('/stats', getDashboardStats);

module.exports = router;
