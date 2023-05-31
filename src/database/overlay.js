const { GeofenceModel, PoiModel } = require('../models/overlay');

async function getOverlaysForUser(user) {
  const geofences = await GeofenceModel.find({ owner: user });
  const pois = await PoiModel.find({ owner: user });

  return [].concat(geofences, pois);
}

async function saveOverlaysInDb(overlays) {
  const newPois = overlays.filter(overlay => overlay.category === 'poi' && !overlay._id);
  const newGeofences = overlays.filter(overlay => overlay.category === 'geofence' && !overlay._id);

  const existingPois = overlays.filter(overlay => overlay.category === 'poi' && overlay._id);
  const existingGeofences = overlays.filter(overlay => overlay.category === 'geofence' && overlay._id);
  let result;
  let total = [];
  // Para guardar los nuevos POIs y Geofences
  if (newPois.length) {
    console.log('guardando nuevos pois');
    result = await PoiModel.insertMany(newPois);
    total = total.concat(result);
  }
  if (newGeofences.length) {
    console.log('guardando nuevas geocercas');
    result = await GeofenceModel.insertMany(newGeofences);
    total = total.concat(result);
  }

  // Actualizar todos los POIs y Geofences en `existingPois` y `existingGeofences`
  let updates = existingPois.map(poi => ({
    updateOne: {
      filter: { _id: poi._id },
      update: poi
    }
  }));

  if (updates.length) {
    console.log('actualizando pois');
    result = await PoiModel.bulkWrite(updates);
    total = total.concat(result);
  }

  updates = existingGeofences.map(geofence => ({
    updateOne: {
      filter: { _id: geofence._id },
      update: geofence
    }
  }));

  if (updates.length) {
    console.log('actualizando geocercas');
    result = await GeofenceModel.bulkWrite(updates);
    total = total.concat(result);
  }

  total = total.map(item => item.toObject());
  
  return total;
}

async function updateOverlaysVisibilityInDb(overlays) {
  /* overlays es un objeto que contiene como llaves los _id de las overlay que se van a modificar y los valores
  de cada llave son un objeto que contiene dos propiedades, checked que se actualizaran en la baser de datos, cada _id su respectivo valor, la propiedad que hay que actualizar
  es checked, utilizando el modelo GeofenceModel o PoiModel de acuerdo a la segunda propiedad de este objeto que es type, si es geofence se utilizara el GeofenceModel y si
  el valor es poi se utilizara el PoiModel*/

  const geofences = overlays.filter(overlay => overlay.type === 'geofence');
  const pois = overlays.filter(overlay => overlay.type === 'poi');
  let results = [];

  for (const geofence of geofences) {
    const result = await GeofenceModel.updateOne({ _id: geofence._id }, { $set: { checked: geofence.checked } });
    results.push(result);
  }

  for (const poi of pois) {
    const result = await PoiModel.updateOne({ _id: poi._id }, { $set: { checked: poi.checked } });
    results.push(result);
  }

  return results;
}

module.exports = {
  getOverlaysForUser,
  saveOverlaysInDb,
  updateOverlaysVisibilityInDb
};