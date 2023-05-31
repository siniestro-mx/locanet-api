const { Server } = require('socket.io');
const { authorizeWs, validateEvent } = require('../middleware/auth');
const { joinRooms, addWebSocketEventListeners } = require('./index');
const { socketIOClientsConfig } = require('../../config/config');
let io;

function initSocketIO(server) {
  initSocketIOServer(server);
  initSocketIOClients();
}

function initSocketIOServer(server) {
  // Inicializar una nueva instancia de socket.io pasando el servidor http
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:1841', 'https://nuevo.locanet.mx'], // Asegúrate de agregar tus dominios aquí también
      credentials: true
    }
  });

  io.engine.generateId = (req) => {
    return `${req._query.user}_${req._query.fingerprint}`;
  };

  /*  autorización para websocket */
  io.use(authorizeWs);
  // Escuchar eventos de conexión de Socket.io
  io.on('connection', (socket) => {
    console.log(`Usuario ${socket.user.username} conectado a socket.io`);

    socket.use(validateEvent);

    joinRooms(socket);
    addWebSocketEventListeners(io, socket);
  });
}

function initSocketIOClients() {
  const ioClient = require('socket.io-client');

  for (const client in socketIOClientsConfig) {
    const { ip, port } = socketIOClientsConfig[client];
    // Conéctate al servidor de Socket.IO del microservicio de parser.
    const socket = ioClient.connect(`http://${ip}:${port}`);

    // Escucha el evento 'gpsdata'.
    socket.on('gpsdata', (gpsdata) => {
      const device_id = gpsdata.UniqueID;

      //console.log(`Recibiendo paquete de ${device_id} y reenviandolo a los clientes conectados.`);

      io.to(device_id).emit('gpsdata', gpsdata);
      io.to('units').emit('gpsdata', gpsdata);

    });
  }
}

module.exports = {
  initSocketIO,
};
