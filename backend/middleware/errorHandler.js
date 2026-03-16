const logger = require('../utils/logger');

module.exports = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message   || 'Errore interno del server';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors).map(e => e.message).join('; ');
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Valore duplicato per il campo: ${field}`;
  }
  // JWT
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Token non valido'; }

  if (statusCode >= 500) logger.error(err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
