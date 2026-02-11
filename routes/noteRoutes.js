const express = require('express');
const { body } = require('express-validator');
const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote
} = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').trim().notEmpty().withMessage('Content is required')
  ],
  validate,
  createNote
);

router.get('/', getNotes);

router.get('/:id', getNote);

router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('content').optional().trim().notEmpty().withMessage('Content cannot be empty')
  ],
  validate,
  updateNote
);

router.delete('/:id', deleteNote);

module.exports = router;
