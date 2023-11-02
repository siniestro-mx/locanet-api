const Unit = require('../models/unit');

async function getUnitsInOverlay(overlay) {
  let unitsInOverlay = [];

  // Verifica el tipo de overlay y realiza la consulta correspondiente
  switch (overlay.type) {
    case 'circle':
    case 'marker':
      unitsInOverlay = await Unit.find({
        UniqueID: { $in: overlay.vehicles },
        Position: {
          $near: {
            $geometry: overlay.overlay,
            $maxDistance: overlay.tolerance || overlay.radius,
          },
        },
      });
      break;
    case 'polygon':
    case 'rectangle':
    case 'polyline':
      unitsInOverlay = await Unit.find({
        UniqueID: { $in: overlay.vehicles },
        Position: {
          $geoWithin: {
            $geometry: overlay.type === 'polyline' ? overlay.overlayPolygon : overlay.overlay,
          },
        },
      });
      break;
  }

  return unitsInOverlay;
}

module.exports = {
  getUnitsInOverlay
};
