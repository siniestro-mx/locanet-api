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

  console.log('obteniendo overlays');
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

  console.log(`enviando ${overlays.length} overlays`);
  records = records.concat(overlays);

  successHandler(res, 200, 'Lista de overlays', records);
}

async function saveOverlays(req, res, next) {
  const overlays = req.body;

  /* agregamos un GeoJSON de tipo Polygon a la linea, para abarcar la tolerancia */
  overlays.forEach(overlay => {
    if (overlay.type === 'polyline') {
      const tolerance = Math.round((overlay.tolerance / 1000)) || 0.05;
      overlay.overlayPolygon = turfBuffer(overlay.overlay, tolerance, { units: 'kilometers' }).geometry;
    }
  });

  /* overlays es un array de objetos overlay con varias propiedades, verificar si contienen el campo _id, si lo contienen, actualizar
  *  los datos en la base de datos, si no tiene, crear nuevos documentos en la base */
  let resultSaveOverlays = await saveOverlaysInDb(overlays);
  console.log('resultado de guardar overlays');
  console.log(util.inspect(resultSaveOverlays, false, null, true));

  successHandler(res, 200, 'Overlays guardados', resultSaveOverlays);
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