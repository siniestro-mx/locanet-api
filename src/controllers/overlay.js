const turfBuffer = require('@turf/buffer');
const {
  successHandler
} = require('../utils/response');
const {
  getOverlaysForUser,
  saveOverlaysInDb,
  deleteOverlaysInDb,
  removeOverlaysFromUnitsCache,
  updateOverlaysVisibilityInDb
} = require('../database/overlay');
const util = require('util');

async function getListForUser(req, res, next) {
  let records = [
    {
      "_id": "geofence",
      "name": "Geocercas",
      "icon": "resources/icons/tracking/geofencemanager/overlaystypes/geofence.png",
      "loaded": true,
      "category": "root",
      "checked": true,
      "expanded": true
    },
    {
      "_id": "poi",
      "name": "Puntos y Localizaciones",
      "icon": "resources/icons/tracking/geofencemanager/overlaystypes/poi.png",
      "loaded": true,
      "category": "root",
      "checked": true,
      "expanded": true
    }
  ];

  console.log('obteniendo overlays');
  const overlays = await getOverlaysForUser(req.user.username);

  overlays.forEach(overlay => {
    overlay.loaded = true;
    overlay.expanded = true;
    
    if (overlay.checked === false) {
      if (overlay.category === 'geofence') {
        records[0].checked = false;
      } else if (overlay.category === 'poi') {
        records[1].checked = false;
      }
    }
  });

  console.log(`enviando ${overlays.length} overlays`);
  records = records.concat(overlays);

  console.dir(records, { depth: null });
  successHandler(res, 200, 'Lista de overlays', records);
}

async function saveOverlays(req, res, next) {
  const overlays = req.body;

  console.dir(overlays);

  /* overlays es un array de objetos overlay, los que incluyen _id, se actualizan, los demas se crean  */
  let savedOverlays = await saveOverlaysInDb(overlays);
  console.log('resultado de guardar overlays');
  console.log(util.inspect(savedOverlays, false, null, true));

  successHandler(res, 200, 'Overlays guardados', savedOverlays);
}

async function deleteOverlays(req, res, next) {
  const overlays = req.body;
  const result = await deleteOverlaysInDb(overlays);
  const unitsCacheResult = await removeOverlaysFromUnitsCache(overlays);

  console.log('resultado de eliminar geocercas');
  console.dir(result);
  console.log('resultado de eliminar geocercas de unitsCache');
  console.dir(unitsCacheResult);
  successHandler(res, 200, 'Geocerca(s) y/o punto(s) eliminado(s)', result);
}

async function updateOverlaysVisibility(req, res, next) {
  const overlays = req.body;
  const result = await updateOverlaysVisibilityInDb(overlays);

  successHandler(res, 200, 'Visibilidad de geocerca(s) y/o punto(s) actualizada', result);
}

module.exports = {
  getListForUser,
  saveOverlays,
  deleteOverlays,
  updateOverlaysVisibility
};