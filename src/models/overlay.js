const mongoose = require('mongoose');
const geofenceObject = {
  text: String,
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
  tolerance: Number,  
  icon: String,
  radius: {
    type: Number,
    validate : {
      validator : function(v) {
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
  }
};
const poiObject = {
  text: String,
  name: String,
  category: String,
  owner: String,
  clientcategories: [String],
  checked: Boolean,
  type: String,
  fillColor: String,
  strokeColor: String,
  strokeOpacity: Number,
  fillOpacity: Number,
  vehicles: [String],
  tolerance: Number,
  icon: String,
  poiIcon: String,
  overlay: {
    type: {
      type: String,
    },
    coordinates: [ 
      Number,
      Number
    ]
  }
};
const GeofenceSchema = new mongoose.Schema(geofenceObject,{
  collection: 'geofences'
});
const PoiSchema = new mongoose.Schema(poiObject, {
  collection: 'pois'
});

const GeofenceModel = mongoose.model('Geofence', GeofenceSchema);
const PoiModel = mongoose.model('Poi', PoiSchema);

module.exports = {
  GeofenceModel,
  PoiModel
};
