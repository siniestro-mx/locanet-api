const Overlay = require('../models/overlay');
const Unit = require('../models/unit');
const { getUnitsInOverlay } = require('../utils/overlay');
const util = require('util');

async function getOverlaysForUser(user) {
  const overlays = await Overlay.find({ owner: user });
  const vehiclesNodes = [];

  overlays.forEach(overlay => {
    const overlayId = overlay._id.toString();

    for (const unitId of overlay.unitsInOverlay) {
      vehiclesNodes.push({
        _id: `${overlayId}-${unitId}`,
        category: overlayId,
        name: unitId,
        type: 'vehicle',
        leaf: true,
        icon: 'resources/avl/icons/geofences/vehicle.png'
      });
    }
  });

  /* agregar cada elemento del array vehiclesNodes al array overlays */
  overlays.push(...vehiclesNodes);

  return overlays;
}

async function saveOverlaysInDb(overlays) {
  const overlaysLen = overlays.length;
  const existingOverlays = overlays.filter(overlay => overlay._id);
  const existingOverlaysLen = existingOverlays.length;
  const newOverlays = overlays.filter(overlay => !overlay._id);
  const newOverlaysLen = newOverlays.length;
  const totalRecs = [];

  console.log(`llegaron ${overlaysLen} overlays para guardar`);
  console.dir(overlays);
  console.log(`${newOverlaysLen} overlays nuevos`);
  console.log(`${existingOverlaysLen} overlays existentes`);

  // Crear todos los overlays nuevos
  if (newOverlaysLen) {
    const newOverlaysRecs = await createOverlays(newOverlays);
    totalRecs.push(...newOverlaysRecs);
  }

  if (existingOverlaysLen) {
    const existingOverlaysRecs = await updateOverlays(existingOverlays);
    totalRecs.push(...existingOverlaysRecs);
  }

  return totalRecs;
}

async function createOverlays(newOverlays) {
  const newOverlaysLen = newOverlays.length;
  const bulkOperations = [];
  /* verificar si alguna unidad dentro del array vehicles se encuentra dentro de la overlay
  *  y del array de unidades dentro, actualizar su documento unit para reflejar overlay
  *  en su array Overlays
  *  */

  for (const overlay of newOverlays) {
    const unitsInOverlay = await getUnitsInOverlay(overlay);

    console.dir(`${unitsInOverlay.length} unidades en ${overlay.name}`);

    const unitsInOverlayIds = unitsInOverlay.map(unit => unit.UniqueID);

    /*  actualizar el status de los vehiculos dentro de esta geocerca */
    overlay.unitsInOverlay = unitsInOverlayIds;
  }

  console.log(`creando ${newOverlaysLen} overlays nuevos`);

  const result = await Overlay.insertMany(newOverlays);

  const newOverlaysRecs = result.map(overlayRec => {
    const overlay = overlayRec.toObject();

    overlay.children = overlay.unitsInOverlay.map(unitId => {
      const vehicleOverlayStatusUpdate = {
        updateOne: {
          filter: { UniqueID: unitId },
          update: { $addToSet: { Overlays: overlay._id.toString() } },
        },
      };

      // Añade la operación al array
      bulkOperations.push(vehicleOverlayStatusUpdate);

      return {
        _id: `${overlay._id}-${unitId}`,
        category: overlay._id,
        name: unitId,
        type: 'vehicle',
        leaf: true,
        icon: 'resources/avl/icons/geofences/vehicle.png'
      };
    });

    return overlay;
  });

  /* ejecutamos el bulkOperations */
  if (bulkOperations.length > 0) {
    console.log("agregando el id del overlay a los vehiculos que se encuentran dentro de él");
    const bulkResult = await Unit.bulkWrite(bulkOperations);
    console.log(util.inspect(bulkResult, false, null, true));
  }

  return newOverlaysRecs;
}

async function updateOverlays(existingOverlays) {
  // Contenedor para las operaciones de escritura en bloque
  const updatedOverlays = [];

  for (const overlay of existingOverlays) {
    const overlayId = overlay._id;
    const unitsInOverlay = await getUnitsInOverlay(overlay);
    const bulkOperations = [];

    console.dir(`${unitsInOverlay.length} unidades en ${overlay.name} : ${overlay._id.toString()}`);

    const unitsInOverlayIds = unitsInOverlay.map(unit => unit.UniqueID);

    for (const vehicleId of unitsInOverlayIds) {
      const vehicleOverlayStatusUpdate = {
        updateOne: {
          filter: { UniqueID: vehicleId },
          update: { $addToSet: { Overlays: overlayId } },
        },
      };

      // Añade la operación al array
      bulkOperations.push(vehicleOverlayStatusUpdate);
    }

    /*  actualizar el status de los vehiculos dentro de esta geocerca */
    overlay.unitsInOverlay = unitsInOverlayIds;

    let oldOverlay = await Overlay.findOneAndUpdate({ _id: overlay._id }, overlay, { returnDocument: 'before' });

    oldOverlay = oldOverlay.toObject();

    /* 
    *  Por cada vehiculo dentro del overlay agregamos un elemento a childre con la siguiente estructura
    *  {
    *    _id: unitId,
    *    category: overlay._id.toString(),
    *    name: unitId,
    *    type: 'vehicle',
    *    leaf: true,
    *    icon: 'resources/avl/icons/geofences/vehicle.png'
    *  }
    */
    overlay.children = overlay.unitsInOverlay.map(unitId => {
      return {
        _id: `${overlayId}-${unitId}`,
        category: overlayId,
        name: unitId,
        type: 'vehicle',
        leaf: true,
        icon: 'resources/avl/icons/geofences/vehicle.png'
      };
    });

    /* Obtenemos la lista de vehículos que ya no son validos (listados en la propiedad vehicles del documento) para esta geocerca. Esto se logra, 
    *  comparando la lista de vehículos en la base de datos con la lista recibida en el objeto overlay
    */
    //const vehiclesNoLongerValid = oldOverlay.vehicles.filter(id => !overlay.vehicles.includes(id));

    /* obtenemos la lista de vehiculos que estaban dentro pero ya no */
    const wasInsideButNoLongerIds = oldOverlay.unitsInOverlay.filter(id => !unitsInOverlayIds.includes(id));

    for (const vehicleId of wasInsideButNoLongerIds) {
      const vehicleOverlayStatusUpdate = {
        updateOne: {
          filter: { UniqueID: vehicleId },
          update: { $pull: { Overlays: overlayId } },
        },
      };

      // Añade la operación al array
      bulkOperations.push(vehicleOverlayStatusUpdate);
    }

    if (bulkOperations.length > 0) {

      console.log("bulkWrite object");
      const result = await Unit.bulkWrite(bulkOperations);

      console.log("resultado del bulkWrite");
      console.log(util.inspect(result, false, null, true));
    }

    updatedOverlays.push(overlay);
  }

  return updatedOverlays;
}

async function deleteOverlaysInDb(overlaysIds) {
  // Borra todos los Geofences con los IDs proporcionados
  const result = await Overlay.deleteMany({ _id: { $in: overlaysIds } });

  console.log('resultado de borrar overlays');
  console.dir(result);

  return result;
}

async function removeOverlaysFromUnitsCache(overlaysIds){
  // Modifica los documentos en la colección unitsCache utilizando $pull
  const bulkOperations = [];

  for (const overlayId of overlaysIds) {
    const updateOperation = {
      updateMany: {
        filter: { Overlays: overlayId },
        update: { $pull: { Overlays: overlayId } },
      },
    };
    bulkOperations.push(updateOperation);
  }

  // Ejecuta las operaciones de actualización en bloque en la colección unitsCache
  if (bulkOperations.length > 0) {
    const updateResult = await Unit.bulkWrite(bulkOperations);
    console.log('Resultado de actualizar unidades en unitsCache:');
    console.dir(updateResult);
    return updateResult;
  }

  return [];
}

async function updateOverlaysVisibilityInDb(overlays) {
  const results = [];
  /* overlays es un objeto que contiene como llaves los _id de las overlay que se van a modificar y los valores
  de cada llave son un objeto que contiene dos propiedades, checked que se actualizaran en la baser de datos, cada _id su respectivo valor, la propiedad que hay que actualizar
  es checked, utilizando el modelo GeofenceModel o PoiModel de acuerdo a la segunda propiedad de este objeto que es type, si es geofence se utilizara el GeofenceModel y si
  el valor es poi se utilizara el PoiModel*/

  for (const overlay in overlays) {
    const result = await Overlay.updateOne({ _id: overlay }, { $set: { checked: overlays[overlay] } });
    results.push(result);
  }

  return results;
}

module.exports = {
  getOverlaysForUser,
  saveOverlaysInDb,
  deleteOverlaysInDb,
  updateOverlaysVisibilityInDb,
  removeOverlaysFromUnitsCache
};