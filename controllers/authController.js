const jwt = require('jsonwebtoken');
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({
    username,
    email,
    password
  });

  if (user) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    await RefreshToken.create({
      token: refreshToken,
      user: user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      accessToken,
      refreshToken
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401);
    throw new Error('Refresh token required');
  }

  const storedToken = await RefreshToken.findOne({ token: refreshToken });

  if (!storedToken) {
    res.status(403);
    throw new Error('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    await RefreshToken.deleteOne({ token: refreshToken });
    res.status(403);
    throw new Error('Refresh token expired');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = generateAccessToken(decoded.id);

    res.json({ accessToken });
  } catch (error) {
    res.status(403);
    throw new Error('Invalid refresh token');
  }
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  res.json({ message: 'Logged out successfully' });
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getProfile
};
