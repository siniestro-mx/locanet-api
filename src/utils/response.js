// src/utils/response.js
function successHandler(res, statusCode, message, data = null) {
  const response = {
    success: true,
    message,
  };

  if (data) {
    response.data = data;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  successHandler,
};