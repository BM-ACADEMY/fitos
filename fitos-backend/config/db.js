const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI ||
      (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mongodb') ? process.env.DATABASE_URL : 'mongodb://127.0.0.1:27017/fitos');

    await mongoose.connect(mongoUri);
    console.log('[DB] Connected to MongoDB at ' + mongoUri);
  } catch (err) {
    console.error('[DB] Connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;
