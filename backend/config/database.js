const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');

  mongoose.set('strictQuery', false);

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on('error', err => logger.error('MongoDB error', err));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  logger.info(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = { connectDB };
