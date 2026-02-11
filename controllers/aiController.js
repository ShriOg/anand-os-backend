const asyncHandler = require('../middleware/asyncHandler');
const ChatMessage = require('../models/ChatMessage');

const chatWithAI = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const response = `This is a placeholder AI response to: "${message}". Integrate your preferred AI service here.`;

  const chatMessage = await ChatMessage.create({
    user: req.user._id,
    message,
    response
  });

  res.json({
    message: chatMessage.message,
    response: chatMessage.response,
    timestamp: chatMessage.createdAt
  });
});

const getChatHistory = asyncHandler(async (req, res) => {
  const chatHistory = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(chatHistory);
});

module.exports = {
  chatWithAI,
  getChatHistory
};
