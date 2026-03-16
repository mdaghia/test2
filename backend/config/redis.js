const Redis = require('ioredis');
const logger = require('../utils/logger');

let client;

async function connectRedis() {
  client = new Redis(process.env.REDIS_URL, {
    retryStrategy: times => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', err => logger.error('Redis error', err));

  await client.ping();
  return client;
}

function getRedis() {
  if (!client) throw new Error('Redis not initialized');
  return client;
}

module.exports = { connectRedis, getRedis };
