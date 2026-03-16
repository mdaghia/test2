'use strict';
/**
 * Oracle client — usa oracledb v6 Thin Mode (nessun Oracle Instant Client richiesto)
 * Thin mode supporta Oracle DB 12.1+, si connette direttamente via TCP
 */
const oracledb = require('oracledb');
const logger = require('../logger');

// Thin mode: no Oracle Client libraries needed
oracledb.initOracleClient = undefined; // Ensure thin mode stays active

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchTypeHandler = (metadata) => {
  // Return dates as JS Date objects
  if (metadata.dbType === oracledb.DB_TYPE_DATE ||
      metadata.dbType === oracledb.DB_TYPE_TIMESTAMP) {
    return { type: oracledb.DATE };
  }
};

let pool = null;

async function initPool() {
  if (pool) return pool;

  const config = {
    user:            process.env.ORACLE_USER,
    password:        process.env.ORACLE_PASSWORD,
    connectString:   `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE}`,
    poolMin:         1,
    poolMax:         5,
    poolIncrement:   1,
    poolTimeout:     60,
    poolPingInterval: 60,
  };

  try {
    pool = await oracledb.createPool(config);
    logger.info(`Oracle connection pool created → ${config.connectString}`);
    return pool;
  } catch (err) {
    logger.error('Oracle pool creation failed', { message: err.message, code: err.errorNum });
    throw err;
  }
}

async function getConnection() {
  const p = await initPool();
  return p.getConnection();
}

async function query(sql, binds = {}, opts = {}) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT, ...opts });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}

async function closePool() {
  if (pool) {
    await pool.close(10);
    pool = null;
    logger.info('Oracle pool closed');
  }
}

// Test connectivity
async function ping() {
  const conn = await getConnection();
  try {
    await conn.execute('SELECT 1 FROM DUAL');
    return true;
  } finally {
    await conn.close();
  }
}

module.exports = { initPool, query, closePool, ping };
