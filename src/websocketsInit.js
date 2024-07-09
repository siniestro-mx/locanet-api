const {
  Server
} = require('socket.io');
const {
  authorizeWs,
  validateEvent
} = require('./middleware/auth');
const {
  socketIOClientsConfig
} = require('../config/config');
const addUnitEvents = require('./modules/unit/websockets/unitEvents');
let io;

function initSocketIO(server) {
  console.log('Inicializando socket.io');

  initSocketIOServer(server);

  initSocketIOClients();
}

function initSocketIOServer(server) {
  // Inicializar una nueva instancia de socket.io pasando el servidor http
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:1841', 'https://nuevo.locanet.mx'],
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

    //socket.use(validateEvent);

    joinRooms(socket);
    addWebSocketEventListeners(socket);
  });
}

function joinRooms(socket) {
  const role = socket.user.role;
  const units = socket.user.units;

  if (role === 'admin') {
    socket.join('units');
    console.log(`${socket.user.username} se unió al room units`);
  }
  else {
    units.forEach(unit => {
      socket.join(unit);
    });
    console.log(`${socket.user.username} se unió a(l) (los) room(s) ${units.join(',')}`);
  }
}

function addWebSocketEventListeners(socket) {
  addUnitEvents(socket);
}
/** La función, se conecta a todos los microservicios del tipo parser, que son los encargados de convertir los paquetes de los
 *  dispositivos en objetos JSON. Una vez conectada escucha por eventos de los parsers; algunas veces los reenvia a los clientes
 *  conectados al frontend y otras los procesa y puede relizar actualizaciónes en la base de datos u otra acción necesaria.
 */
function initSocketIOClients() {
  const ioClient = require('socket.io-client');

  for (const client in socketIOClientsConfig) {
    const {
      ip,
      port
    } = socketIOClientsConfig[client];

    const socket = ioClient.connect(`http://${ip}:${port}`);

    /** El evento gpsdata se recibo de los parsers cada que se recibe un paquete nuevo de algun dispostitivo gps.
     *  Este evento se reenvia a los clientes conectados al frontend. Se emiten dos eventos uno al canal de la unidad
     *  y otro al canal de todas las unidades, al cual tienen acceso los administradores.
     */
    socket.on('gpsdata', (gpsdata) => {
      const deviceId = gpsdata.UniqueID;

      io.to(deviceId).emit('gpsdata', gpsdata);
      io.to('units').emit('gpsdata', gpsdata);
    });

    socket.on('entered.overlays', (deviceId, enteredOverlays) => {
      io.to('units').emit('entered.overlays', deviceId, enteredOverlays);
      io.to(deviceId).emit('entered.overlays', enteredOverlays);
    });

    socket.on('exited.overlays', (deviceId, exitedOverlays) => {
      io.to('units').emit('exited.overlays', deviceId, exitedOverlays);
      io.to(deviceId).emit('exited.overlays', exitedOverlays);
    });
  }
}

module.exports = initSocketIO;