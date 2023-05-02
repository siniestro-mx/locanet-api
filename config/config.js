// src/config/config.js
const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  LOCANET_DB_URI: process.env.LOCANET_DB_URI,
  LOCANET_PORT: process.env.LOCANET_PORT,
  LOCANET_JWT_KEY: process.env.LOCANET_JTW_KEY,
};
