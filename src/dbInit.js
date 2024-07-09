// src/database/init.js
const mongoose = require('mongoose');
const config = require('../config/config');

const connectDb = async () => {
  try {
    console.log(`Intentando conectar a la base de datos...`);
    
    await mongoose.connect("mongodb+srv://locanetbkend:049zxPYA8321ih6y@private-locanet-dbs-999bdbe6.mongo.ondigitalocean.com/locanet?tls=true&authSource=admin&replicaSet=locanet-dbs", {//config.LOCANET_DB_URI, {
    });
    
    console.log('Conexión a la base de datos establecida');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    process.exit(1);
  }
};

module.exports = connectDb;
