// src/config/config.js
const socketIOClientsConfig = {
  'gv300': {
    'ip': '10.132.166.212',
    'port': 3666
  }
};

module.exports = {
  LOCANET_DB_URI: process.env.LOCANET_DB_URI,
  LOCANET_PORT: process.env.LOCANET_API_PORT,
  LOCANET_IP: process.env.LOCANET_API_IP,
  LOCANET_DB_HOST: process.env.LOCANET_DB_HOST,
  LOCANET_SIGNIN_PRIVATE_KEY: process.env.LOCANET_SIGNIN_PRIVATE_KEY,
  LOCANET_SIGNIN_PUBLIC_KEY: process.env.LOCANET_SIGNIN_PUBLIC_KEY,
  socketIOClientsConfig
};
