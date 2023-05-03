// src/middleware/notFoundHandler.js
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: 'La ruta solicitada no se encontró',
    error: 'NotFound',
  });
}

module.exports = {
  notFoundHandler
};