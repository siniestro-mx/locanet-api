const Unit = require('../models/unit');

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
  getUnitsInOverlay
};
