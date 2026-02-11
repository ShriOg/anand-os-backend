const asyncHandler = require('../middleware/asyncHandler');
const Note = require('../models/Note');

const createNote = asyncHandler(async (req, res) => {
  const { title, content } = req.body;

  const note = await Note.create({
    title,
    content,
    user: req.user._id
  });

  res.status(201).json(note);
});

const getNotes = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const notes = await Note.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Note.countDocuments({ user: req.user._id });

  res.json({
    notes,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

const getNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (note && note.user.toString() === req.user._id.toString()) {
    res.json(note);
  } else {
    res.status(404);
    throw new Error('Note not found');
  }
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (note && note.user.toString() === req.user._id.toString()) {
    note.title = req.body.title || note.title;
    note.content = req.body.content || note.content;

    const updatedNote = await note.save();
    res.json(updatedNote);
  } else {
    res.status(404);
    throw new Error('Note not found');
  }
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (note && note.user.toString() === req.user._id.toString()) {
    await Note.deleteOne({ _id: req.params.id });
    res.json({ message: 'Note deleted' });
  } else {
    res.status(404);
    throw new Error('Note not found');
  }
});

module.exports = {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote
};
