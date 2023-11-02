const mongoose = require('mongoose');
const overlayObject = {
  name: String,
  category: String,
  checked: Boolean,
  owner: String,
  clientcategories: [String],
  type: String,
  fillColor: String,
  strokeColor: String,
  strokeOpacity: Number,
  fillOpacity: Number,
  strokeWeight: Number,
  vehicles: [String],
  unitsInOverlay: Array,
  tolerance: Number,
  icon: String,
  poiIcon: String,
  radius: {
    type: Number,
    validate: {
      validator: function (v) {
        // validación personalizada
        return this.overlay.type === 'Point' ? v !== null : true;
      },
      message: props => 'El radio es necesario cuando el tipo es Punto.'
    }
  },
  overlay: {
    type: {
      type: String,
      enum: ['Point', 'LineString', 'Polygon'],
      required: true
    },
    coordinates: {
      type: [],
      required: true
    }
  },
  overlayPolygon: {
    type: {
      type: String,
      enum: ['Polygon']
    },
    coordinates: {
      type: []
    }
  }
};

const OverlaySchema = new mongoose.Schema(overlayObject, {
  collection: 'overlays',
  strict: false
});

const Overlay = mongoose.model('Overlay', OverlaySchema);

module.exports = Overlay;
