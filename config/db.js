const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Database handles — created synchronously so models can register immediately.
// Operations buffer until connectDB() establishes the underlying connection.
const osDB = mongoose.connection.useDb('anand-os', { useCache: true });
const pramodDB = mongoose.connection.useDb('pramod', { useCache: true });

module.exports = { connectDB, osDB, pramodDB };
