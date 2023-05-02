// src/app.js
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middleware/index');

const app = express();

// Middleware para establecer encabezados de seguridad
app.use(helmet());

// Middleware para el análisis de cookies
app.use(cookieParser());

// Configurar CORS
/*app.use(
  cors({
    origin: 'https://yourfrontend.com', // Reemplaza esto con la URL de tu frontend
    credentials: true,
  });
);*/
app.use(cors());

// Middleware para el análisis de JSON
app.use(express.json());

// Rutas
app.use('/', routes);

// Middleware para manejar rutas no encontradas
app.use(notFoundHandler);

// Middleware para manejar errores
app.use(errorHandler);

const PORT = process.env.LOCANET_PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});

module.exports = app;
