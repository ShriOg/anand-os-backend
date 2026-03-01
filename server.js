require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const initBattleSockets = require('./socket/battleManager');
const autoSeedMenu = require('./services/menuSeedService');

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const fileRoutes = require('./routes/fileRoutes');
const aiRoutes = require('./routes/aiRoutes');
const adminRoutes = require('./routes/adminRoutes');
const restaurantRoutes = require('./routes/restaurant');

const app = express();

connectDB().then(() => {
  if (process.env.NODE_ENV === "development") {
    console.log("🌱 Development mode detected — seeding menu...");
    try { autoSeedMenu(); } catch (err) { console.error('[MenuSeed] Error:', err.message); }
  } else {
    console.log("🚀 Production mode — skipping menu seeding.");
  }
});

app.use(helmet());
app.use(morgan('combined'));

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "https://anand-dev.tech"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.options("*", cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Anand Web OS API',
    version: '1.0.0',
    status: 'running'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/restaurant', restaurantRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.set('io', io);

// Battle game sockets (separate namespace-like handling inside)
initBattleSockets(io);

// Restaurant admin sockets — join "admin" room for real-time order events
io.on('connection', (socket) => {
  socket.on('join-admin', () => {
    socket.join('admin');
  });

  socket.on('leave-admin', () => {
    socket.leave('admin');
  });

  socket.on('join-room', (phone) => {
    if (!phone) return;
    socket.join(`user_${phone}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("CORS enabled for:", allowedOrigins);
});
