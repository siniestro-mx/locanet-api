const { Server } = require('socket.io');
const { authorizeWs, validateEvent } = require('../middleware/auth');
const { addWebSocketEventListeners } = require('./index');
let io;

function initSocketIO(server) {
  initSocketIOServer(server);
  initSocketIOClient();
}

function initSocketIOServer(server) {
  // Inicializar una nueva instancia de socket.io pasando el servidor http
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:1841', 'https://nuevo.locanet.mx'], // Asegúrate de agregar tus dominios aquí también
      credentials: true
    }
  });

  /*io.engine.generateId = (req) => {
    return `${req._query.user}_${req._query.fingerprint}`;
  };*/

  /*  autorización para websocket */
  //io.use(authorizeWs);
  // Escuchar eventos de conexión de Socket.io
  io.on('connection', (socket) => {
    console.log('Un usuario se ha conectado.');

    //socket.use(validateEvent);
    socket.join('units')
    addWebSocketEventListeners(io, socket);
  });
}

function initSocketIOClient() {
  const ioClient = require('socket.io-client');

  // Conéctate al servidor de Socket.IO del microservicio de parser.
  // Asegúrate de reemplazar 'http://localhost:3666' con la URL y puerto correctos.
  const socket = ioClient.connect('http://10.132.166.214:3666');

  // Escucha el evento 'gpsdata'.
  socket.on('gpsdata', (gpsdata) => {
    // Maneja los datos de GPS aquí. Por ejemplo, podrías:
    // - Actualizar un caché en memoria.
    // - Emitir los datos a los clientes conectados.
    // - O cualquier otra cosa que necesites hacer con los datos de GPS en tiempo real.
    const device_id = gpsdata.UniqueID;

    console.log(`Recibiendo paquete de ${device_id}`);

    io.to(device_id).emit('gpsdata', gpsdata);
    io.to('units').emit('gpsdata', gpsdata);

  });
}

module.exports = {
  initSocketIO,
};
