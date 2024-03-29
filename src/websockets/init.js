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
      origin: ['http://localhost:1841', 'https://api.locanet.mx'], // Asegúrate de agregar tus dominios aquí también
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

/** La función, se conecta a todos los microservicios del tipo parser, que son los encargados de convertir los paquetes de los
 *  dispositivos en objetos JSON. Una vez conectada escucha por eventos de los parsers; algunas veces los reenvia a los clientes
 *  conectados al frontend y otras los procesa y puede relizar actualizaciónes en la base de datos u otra acción necesaria.
 */
function initSocketIOClients() {
  const ioClient = require('socket.io-client');

  for (const client in socketIOClientsConfig) {
    const { ip, port } = socketIOClientsConfig[client];

    const socket = ioClient.connect(`http://${ip}:${port}`);

    /** El evento gpsdata se recibo de los parsers cada que se recibe un paquete nuevo de algun dispostitivo gps.
     *  Este evento se reenvia a los clientes conectados al frontend. Se emiten dos eventos uno al canal de la unidad
     *  y otro al canal de todas las unidades, al cual tienen acceso los administradores.
     */
    socket.on('gpsdata', (gpsdata) => {
      const device_id = gpsdata.UniqueID;

      io.to(device_id).emit('gpsdata', gpsdata);
      io.to('units').emit('gpsdata', gpsdata);
    });
  }
}

module.exports = {
  initSocketIO,
};
