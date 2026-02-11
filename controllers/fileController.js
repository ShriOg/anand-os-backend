const asyncHandler = require('../middleware/asyncHandler');
const File = require('../models/File');
const fs = require('fs');
const path = require('path');

const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const file = await File.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    user: req.user._id
  });

  res.status(201).json(file);
});

const getFiles = asyncHandler(async (req, res) => {
  const files = await File.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(files);
});

const getFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (file && file.user.toString() === req.user._id.toString()) {
    res.json(file);
  } else {
    res.status(404);
    throw new Error('File not found');
  }
});

const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (file && file.user.toString() === req.user._id.toString()) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await File.deleteOne({ _id: req.params.id });
    res.json({ message: 'File deleted' });
  } else {
    res.status(404);
    throw new Error('File not found');
  }
});

module.exports = {
  uploadFile,
  getFiles,
  getFile,
  deleteFile
};
