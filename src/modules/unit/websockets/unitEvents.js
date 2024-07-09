//src/modules/unit/websockets/unitEvents.js
const { onUnitGetHistory } = require('./unitController');

function addUnitEvents(socket) {
  socket.on('unit.gethistory', (historyParams) => onUnitGetHistory(historyParams, socket));
}

module.exports = addUnitEvents;
