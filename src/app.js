// src/app.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middleware/index');
const { initSocketIO } = require('./websockets/init');
const config = require('../config/config');
require('./database/index');

const app = express();

// Middleware para establecer encabezados de seguridad
app.use(helmet());

// Middleware para el análisis de cookies
app.use(cookieParser());

// Configurar CORS
app.use(cors({
  origin: ['http://localhost:1841', 'https://nuevo.locanet.mx', 'http://143.198.11.182'],
  credentials: true
}));

// Middleware para el análisis de JSON
app.use(express.json());

// Rutas
app.use('/', routes)

// Middleware para manejar rutas no encontradas
app.use(notFoundHandler);

// Middleware para manejar errores
app.use(errorHandler);

const PORT = config.LOCANET_PORT || 3000;
const IP = config.LOCANET_IP;

// Crear un servidor http y pasar la app de express
const server = http.createServer(app);

/**  Inicializar socket.io, tanto server como cliente. El server sirve para comunicarse con el frontend
*    el cliente sirve para conectarse a los parsers de los dispositivos gps y recibir actualizaciones de estos
*/
initSocketIO(server);

server.listen(PORT, IP, () => {
  console.log(`Servidor escuchando en el puerto ${PORT} ip ${IP}`);
});

module.exports = app;
