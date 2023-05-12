// src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  
  console.error(err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ha ocurrido un error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
    error: err.name || 'ServerError',
  });
}

module.exports = {
  errorHandler
};