const {
  successHandler
} = require('../utils/response');
const {
  getOverlaysForUser,
  saveOverlaysInDb,
  updateOverlaysVisibilityInDb
} = require('../database/overlay');

async function getListForUser(req, res, next) {
  let records = [
    {
      "_id": "geofence",
      "name": "Geocercas",
      "icon": "resources/avl/icons/geofences/geofence.png",
      "loaded": true,
      "category": "root",
      "checked": true
    },
    {
      "_id": "poi",
      "name": "Puntos y Localizaciones",
      "icon": "resources/avl/icons/geofences/poi.png",
      "loaded": true,
      "category": "root",
      "checked": true
    }
  ];
  const overlays = await getOverlaysForUser(req.user.username);

  overlays.forEach(overlay => {
    if (overlay.checked === false) {
      if (overlay.category === 'geofence') {
        records[0].checked = false;
      } else if (overlay.category === 'poi') {
        records[1].checked = false;
      }
    }
  });

  records = records.concat(overlays);

  successHandler(res, 200, 'Lista de overlays', records);
}

async function saveOverlays(req, res, next) {
  const overlays = req.body;
  const existingOverlays = overlays.filter(overlay => { if (overlay._id) { return true; } return false; });
  /* overlays es un array de objetos overlay con varias propiedades, verificar si contienen el campo _id, si lo contienen, actualizar
  *  los datos en la base de datos, si no tiene, crear nuevos documentos en la base */



  console.log('llegaron geocercas para guardar');
  console.dir(overlays);
  console.log('geocercas existentes');
  console.dir(existingOverlays);
  const result = await saveOverlaysInDb(overlays);
  console.log('resultado de guardar geocercas');
  console.dir(result);
  successHandler(res, 200, 'Overlays guardados', result);
}

async function updateOverlaysVisibility(req, res, next) {
  const overlays = req.body;
  const result = await updateOverlaysVisibilityInDb(overlays);

  console.dir(result);

  successHandler(res, 200, 'Visibilidad de geocerca(s) y/o punto(s) actualizada', result);
}

module.exports = {
  getListForUser,
  saveOverlays,
  updateOverlaysVisibility
};