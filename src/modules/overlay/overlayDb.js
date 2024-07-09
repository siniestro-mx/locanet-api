const h3 = require('h3-js');
const { get } = require('http');
const Overlay = require('./overlayModel');
const { Unit } = require('../unit/unitModel');
const util = require('util');

async function getOverlaysForUser(user) {
  const overlays = await Overlay.find({ owner: user }).lean();
  const unitNodes = [];

  overlays.forEach(overlay => {
    const overlayId = overlay._id.toString();

    for (const unitId of overlay.unitsInOverlay) {
      unitNodes.push({
        _id: `${overlayId}-${unitId}`,
        category: overlayId,
        uniqueId: unitId,
        name: unitId,
        type: 'unit',
        leaf: true,
        icon: 'https://cdn.locanet.mx/frontend/shared/icons/tracking/overlaystypes/unit.png'
      });
    }
  });

  /* agregar cada elemento del array validUnitsNodes al array overlays */
  overlays.push(...unitNodes);

  return overlays;
}

async function saveOverlaysInDb(overlays) {
  const overlaysLen = overlays.length;
  const newOverlays = overlays.filter(overlay => !overlay._id);
  const newOverlaysLen = newOverlays.length;
  const existingOverlays = overlays.filter(overlay => overlay._id);
  const existingOverlaysLen = existingOverlays.length;
  const totalRecs = [];
  const resolution = 9;

  /** agregamos los indices H3 para las geocercas */
  addH3IndexesToOverlays(overlays);


  console.log(`llegaron ${overlaysLen} overlays para guardar`);
  console.log(`${newOverlaysLen} overlays nuevos`);
  console.log(util.inspect(newOverlays, false, null, true));
  console.log(`${existingOverlaysLen} overlays existentes`);
  console.log(util.inspect(existingOverlays, false, null, true));

  /**  Crear todos los overlays nuevos */
  if (newOverlaysLen) {
    const newOverlaysRecs = await createOverlays(newOverlays);
    totalRecs.push(...newOverlaysRecs);
  }

  /**  Actualizar overlays existentes */
  if (existingOverlaysLen) {
    const existingOverlaysRecs = await updateOverlays(existingOverlays);
    totalRecs.push(...existingOverlaysRecs);
  }

  totalRecs.forEach(rec => rec.loaded = true);

  return totalRecs;
}

async function createOverlays(newOverlays) {
  console.log("Creando nuevas overlays");

  newOverlays = await addUnitsInOverlays(newOverlays);

  const newOverlayDocs = await createOverlaysInDb(newOverlays);

  const addBulkOperations = getAddBulkOperations(newOverlayDocs);

  await updateOverlaysStatusInUnitsCache(addBulkOperations);

  /** 
   * Por cada overlay recien creada, agregamos un elemento a children con la siguiente estructura
   * {
   *  _id: unitId,
   * category: overlay._id.toString(),
   * name: unitId,
   * type: 'unit',
   * leaf: true,
   * icon: 'https://cdn.locanet.mx/frontend/shared/icons/tracking/overlaystypes/unit.png'
   * }
   * 
   * y agregamos una operación de escritura en bloque para cada vehiculo dentro de la overlay,
   * esto para agregar el id de la overlay al array OverlaysIds del documento unit
   */
  addUnitNodes(newOverlayDocs);

  return newOverlayDocs;
}

async function updateOverlays(existingOverlays) {
  console.log("Actualizando overlays existentes");

  existingOverlays = await addUnitsInOverlays(existingOverlays);

  const updatedOverlaysRecs = await updateOverlaysInDb(existingOverlays);

  const updatedOverlays = updatedOverlaysRecs.map(overlay => overlay.existingOverlay);

  const addBulkOperations = getAddBulkOperations(updatedOverlays);

  const removeBulkOperations = getRemoveBulkOperations(updatedOverlaysRecs);

  await updateOverlaysStatusInUnitsCache([...addBulkOperations, ...removeBulkOperations]);

  return updatedOverlays;
}

function getAddBulkOperations(overlays) {
  const bulkOperations = [];

  for (const overlay of overlays) {
    const overlayId = overlay._id;
    const unitsInOverlayIds = overlay.unitsInOverlay;

    for (const unitId of unitsInOverlayIds) {
      const unitOverlayStatusUpdate = {
        updateOne: {
          filter: { UniqueID: unitId },
          update: {
            $addToSet: {
              OverlaysIds: overlayId
            }
          },
        },
      };

      // Añade la operación al array
      bulkOperations.push(unitOverlayStatusUpdate);
    }
  }

  return bulkOperations;
}

function getRemoveBulkOperations(updatedOverlaysRecs) {
  /* Obtenemos la lista de vehículos que ya no son validos (listados en la propiedad validUnits del documento) para esta geocerca. Esto se logra, 
  *  comparando la lista de vehículos en la base de datos con la lista recibida en el objeto overlay
  */
  const bulkOperations = [];
  for (const rec of updatedOverlaysRecs) {
    const oldOverlay = rec.oldOverlay;
    const overlay = rec.existingOverlay;
    const overlayId = overlay._id;
    /* obtenemos la lista de vehiculos que estaban dentro pero ya no */
    const wasInsideButNoLongerIds = oldOverlay.unitsInOverlay.filter(id => !overlay.unitsInOverlay.includes(id));

    for (const unitId of wasInsideButNoLongerIds) {
      const unitOverlayStatusUpdate = {
        updateOne: {
          filter: { UniqueID: unitId },
          update: { $pull: { OverlaysIds: overlayId } },
        },
      };

      // Añade la operación al array
      bulkOperations.push(unitOverlayStatusUpdate);
    }
  }

  return bulkOperations;
}

async function updateOverlaysInDb(existingOverlays) {
  const overlays = [];

  for (const overlay of existingOverlays) {
    const overlayId = overlay._id;

    /* actualizamos el overlay en la base de datos  y recuperamos el documento recien sustituido */
    let oldOverlay = await Overlay.findOneAndUpdate({ _id: overlayId }, overlay, { returnDocument: 'before' });

    /** 
    *  Por cada vehiculo dentro del overlay agregamos un elemento a children con la siguiente estructura
    *  {
    *    _id: unitId,
    *    category: overlay._id.toString(),
    *    name: unitId,
    *    type: 'unit',
    *    leaf: true,
    *    icon: 'https://cdn.locanet.mx/frontend/shared/icons/tracking/overlaystypes/unit.png'
    *  }
    */
    overlay.children = overlay.unitsInOverlay.map(unitId => {
      return {
        _id: `${overlayId}-${unitId}`,
        category: overlayId,
        name: unitId,
        type: 'unit',
        leaf: true,
        icon: 'https://cdn.locanet.mx/frontend/shared/icons/tracking/overlaystypes/unit.png'
      };
    });

    oldOverlay = oldOverlay.toObject();

    oldOverlay._id = oldOverlay._id.toString();

    overlays.push({ existingOverlay: overlay, oldOverlay });
  }

  return overlays;
}

async function deleteOverlaysInDb(overlaysIds) {
  // Borra todos los Geofences con los IDs proporcionados
  const result = await Overlay.deleteMany({ _id: { $in: overlaysIds } });

  console.log('resultado de borrar overlays');
  console.dir(result);

  return result;
}

async function removeOverlaysFromUnitsCache(overlaysIds) {
  overlaysIds = overlaysIds.map(overlayId => overlayId._id);

  // Modifica los documentos en la colección unitsCache utilizando $pull con $in para optimizar
  const updateResult = await Unit.updateMany(
    { OverlaysIds: { $in: overlaysIds } }, // Documentos que contengan cualquier OverlayId a eliminar
    { $pull: { OverlaysIds: { $in: overlaysIds } } } // Eliminar todos los OverlaysIds en la lista
  );

  console.log('Resultado de actualizar unidades en unitsCache:');
  console.log(util.inspect(updateResult, false, null, true));
  return updateResult;
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

/**
 * 
 * Funciones auxiliares
 * 
 */

function addH3IndexesToOverlays(overlays) {
  const resolution = 5;

  overlays.forEach(overlay => {
    const overlayBufferPolygon = overlay.overlayBufferPolygon;

    overlay.h3Indexes = calculateH3Indexes(overlayBufferPolygon, resolution);
  });
}

function calculateH3Indexes(overlayBufferPolygon, resolution) {
  if (overlayBufferPolygon.type === "Polygon") {
    const coordinates = overlayBufferPolygon.coordinates[0];

    // Obtener los índices H3 para cada punto del polígono
    let h3Indexes = coordinates.map(coord => h3.latLngToCell(coord[1], coord[0], resolution));

    // Remover índices duplicados
    h3Indexes = [...new Set(h3Indexes)];

    return h3Indexes;
  }
  return [];
}

async function addUnitsInOverlays(overlays) {
  for (const overlay of overlays) {
    const unitsInOverlay = await getUnitsInOverlay(overlay);
    const unitsInOverlayIds = unitsInOverlay.map(unit => unit.UniqueID);

    console.log(`${unitsInOverlay.length} unidades dentro de ${overlay.name}`);

    /*  agregar el status de los vehiculos dentro de esta geocerca */
    overlay.unitsInOverlay = unitsInOverlayIds;
  }

  return overlays;
}

async function createOverlaysInDb(newOverlays) {
  const newOverlaysLen = newOverlays.length;
  const newOverlayDocs = [];

  console.log(`guardando ${newOverlaysLen} overlays nuevos en la base de datos`);

  const newOverlayRecs = await Overlay.insertMany(newOverlays);

  newOverlayRecs.forEach(overlay => {
    overlay = overlay.toObject();
    overlay._id = overlay._id.toString();
    newOverlayDocs.push(overlay);
  });

  return newOverlayDocs;
}

function addUnitNodes(newOverlayDocs) {
  newOverlayDocs.forEach(overlayDoc => {
    const unitNodes = [];
    const overlayId = overlayDoc._id;

    for (const unitId of overlayDoc.unitsInOverlay) {
      unitNodes.push({
        _id: `${overlayId}-${unitId}`,
        category: overlayId,
        uniqueId: unitId,
        name: unitId,
        type: 'unit',
        leaf: true,
        icon: 'https://cdn.locanet.mx/frontend/shared/icons/tracking/overlaystypes/unit.png'
      });
    }

    overlayDoc.children = unitNodes;
  });
}

async function updateOverlaysStatusInUnitsCache(bulkOperations) {
  /* ejecutamos el bulkOperations */
  if (bulkOperations.length > 0) {
    console.log("agregando el id del overlay a los vehiculos que se encuentran dentro de él");
    console.log("y quitando el id del overlay a los vehiculos que ya no se encuentran dentro de él");
    console.log(JSON.stringify(bulkOperations));

    const bulkResult = await Unit.bulkWrite(bulkOperations);

    console.log(bulkResult);

    return bulkResult;
  }

  return [];
}

async function getUnitsInOverlay(overlay) {
  const query = {
    UniqueID: { $in: overlay.validUnits },
    Position: {
      $geoWithin: {
        $geometry: overlay.overlayBufferPolygon,
      },
    },
  }

  console.log(`Buscando unidades en overlay ${overlay.name}`);
  console.dir(overlay, { depth: null });

  // Verifica el tipo de overlay y realiza la consulta correspondiente
  const unitsInOverlay = await Unit.find(query);

  return unitsInOverlay;
}
module.exports = {
  getOverlaysForUser,
  saveOverlaysInDb,
  deleteOverlaysInDb,
  updateOverlaysVisibilityInDb,
  removeOverlaysFromUnitsCache
};