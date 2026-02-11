const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { chatWithAI, getChatHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many AI requests, please try again later.'
});

router.use(protect);

router.post(
  '/',
  aiLimiter,
  [
    body('message').trim().notEmpty().withMessage('Message is required')
  ],
  validate,
  chatWithAI
);

router.get('/history', getChatHistory);

module.exports = router;
