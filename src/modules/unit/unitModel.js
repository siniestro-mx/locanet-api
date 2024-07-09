//src/models/unit.js
const mongoose = require('mongoose');
const unitBaseSchemaDefinition = {
  ProtocolVersion: {
    type: Number
  },
  UniqueID: {
    type: String,
    required: true
  },
  Alias: {
    type: String,
  },
  SendTime: {
    type: Date,
    required: true
  },
  CountNumber: {
    type: Number,
    required: true
  },
  Latitude: {
    type: Number,
    min: -90,
    max: 90
  },
  Longitude: {
    type: Number,
    min: -180,
    max: 180
  },
  Position: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  Altitude: {
    type: Number,
  },
  Speed: {
    type: Number
  },
  Azimuth: {
    type: Number,
    min: 0,
    max: 360
  },
  Mileage: {
    type: Number,
  },
  GPSAccuracy: {
    type: Number,
  },
  Inputs: {
    type: String,
  },
  Outputs: {
    type: String,
  },
  BackupBatteryPercentage: {
    type: Number,
    max: 100
  },
  MCC: {
    type: String
  },
  MNC: {
    type: String
  },
  LAC: {
    type: String
  },
  CellID: {
    type: String
  },
  HourMeterCount: {
    type: Number,
  },
  ReceivedAt: {
    type: Date,
  },
  Engine: {
    type: Boolean,
  },
  EngineLock: {
    type: Boolean,
  },
  Address: {
    type: String,
  },
  City: {
    type: String,
  },
  State: {
    type: String,
  },
  Country: {
    type: String,
  },
  MessageType: {
    type: String,
  },
  Model: {
    type: String,
    required: true
  },
  Brand: {
    type: String,
    required: true
  },
  Event: {
    type: String,
    required: true
  },
  ValidPosition: {
    type: Boolean,
    required: true
  }
};

const liveUnitSchemaDefinition = Object.assign({}, unitBaseSchemaDefinition, {
  OverlaysIds: {
    type: Array,
    default: []
  }
});

const historySchemaDefinition = Object.assign({}, unitBaseSchemaDefinition, {
  Overlays: {
    type: Array,
    default: []
  }
});

const liveUnitSchema = new mongoose.Schema(liveUnitSchemaDefinition, {
  timestamps: false,
  collection: 'unitsCache',
  strict: false
});

const historyUnitSchema = new mongoose.Schema(historySchemaDefinition, {
  timestamps: false,
  collection: "gpsHistories",
  timeseries: {
    timeField: "SendTime",
    metaField: null,
    granularity: "seconds",
  },
  strict: false
});

const UnitHistoryModel = mongoose.model('GpsHistory', historyUnitSchema);

const UnitLiveModel = mongoose.model('GpsCache', liveUnitSchema);

module.exports = {
  Unit: UnitLiveModel,
  UnitHistory: UnitHistoryModel
};