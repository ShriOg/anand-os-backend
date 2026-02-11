const express = require('express');
const {
  uploadFile,
  getFiles,
  getFile,
  deleteFile
} = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../config/multer');

const router = express.Router();

router.use(protect);

router.post('/upload', upload.single('file'), uploadFile);

router.get('/', getFiles);

router.get('/:id', getFile);

router.delete('/:id', deleteFile);

module.exports = router;
