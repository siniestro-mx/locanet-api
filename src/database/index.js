// src/database/index.js
const mongoose = require('mongoose');
const userDb = require('./user');
const unitDb = require('./unit');
//const alertDb = require('./alert');
//const maintenanceDb = require('./mtto');
const config = require('../../config/config');

const connectDb = async () => {
  try {
    console.log('Intentando conectar a la base de datos...');
    await mongoose.connect(config.LOCANET_DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conexión a la base de datos establecida');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1);
  }
};

connectDb();

module.exports = {
  ...userDb,
  ...unitDb,
  //...alertDb,
  //...maintenanceDb,
};
