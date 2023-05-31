//const { addUserEvents } = require('./user');
const { addUnitEvents } = require('./unit');

function joinRooms(socket){
  const role = socket.user.role;
  const units = socket.user.units;

  if(role === 'admin'){
    socket.join('units');
    console.log(`${socket.user.username} se unió al room units`);
  }
  else{
    units.forEach(unit => {
      socket.join(unit);
    });
    console.log(`${socket.user.username} se unió a(l) (los) room(s) ${units.join(',')}`);
  }
}

function addWebSocketEventListeners(io, socket) {
  //addUserEvents(io, socket);
  addUnitEvents(io, socket);
}

module.exports = {
  addWebSocketEventListeners,
  joinRooms,
};