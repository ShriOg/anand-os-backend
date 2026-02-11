const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  login
);

router.post('/refresh', refreshAccessToken);

router.post('/logout', logout);

router.get('/profile', protect, getProfile);

module.exports = router;
