//const { addUserEvents } = require('./user');
const { addUnitEvents } = require('./unit');

function addWebSocketEventListeners(io, socket) {
  //addUserEvents(io, socket);
  addUnitEvents(io, socket);
}

module.exports = {
  addWebSocketEventListeners,
};