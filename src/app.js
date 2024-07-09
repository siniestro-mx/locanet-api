require('dotenv').config();
const http = require('http');
const express = require('express');
const compression = require('compression');
const morgan = require('morgan');
const responseTime = require('response-time');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const csrf = require('csrf');
const routes = require('./routesIndex');
const  errorHandler = require('./middleware/errorHandler');
const  notFoundHandler = require('./middleware/notFoundHandler');
const initSocketIO = require('./websocketsInit');
const config = require('../config/config');

const connectDb = require('./dbInit');

const tokens = new csrf();

async function startServer() {
  try {
    await connectDb();

    const app = createApp();
    const server = http.createServer(app);
    
    initSocketIO(server);

    const PORT = config.LOCANET_PORT || 3000;
    const IP = config.LOCANET_IP || "10.132.166.212";

    server.listen(PORT, IP, () => {
      console.log(`Servidor escuchando en el puerto ${PORT} ip ${IP}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor', error);
    process.exit(1); // Salir del proceso con un error
  }
}

function createApp() {
  console.log('Creando locanet-api app');
  const app = express();

  /** configuracion del middleware */
  app.use(responseTime());
  app.use(compression());
  app.use(helmet());
  app.use(cookieParser());
  app.use(cors({
    origin: ['http://localhost:1841', 'https://nuevo.locanet.mx'],
    credentials: true
  }));
  app.use(express.json());

  app.use(morgan('tiny'));
  /** Configurar CSRF */
  //configureCSRF(app);

  /** configuracion de rutas */
  app.use('/', routes);

  /** manejo de rutas no encontradas */
  app.use(notFoundHandler);

  /** manejo de errores */
  app.use(errorHandler);

  return app;
}

function configureCSRF(app) {
  app.use((req, res, next) => {
    if (!req.session.secret) {
      req.session.secret = tokens.secretSync();
    }
    next();
  });

  app.use((req, res, next) => {
    res.cookie('_csrf', tokens.create(req.session.secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Solo en producción
      sameSite: 'strict'
    });
    next();
  });

  const csrfProtection = (req, res, next) => {
    const token = req.cookies._csrf;
    if (!token || !tokens.verify(req.session.secret, token)) {
      return res.status(403).send('Invalid CSRF token');
    }
    next();
  };

  app.post('*', csrfProtection);
}

startServer();