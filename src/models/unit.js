const mongoose = require('mongoose');
const schemaObject = {
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
  GPSUTCTime: {
    type: Date,
  },
  IOStatus: {
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
  IsValid: {
    type: Boolean,
    required: true
  },
  ValidPosition: {
    type: Boolean,
    required: true
  }
};

const unitSchema = new mongoose.Schema(schemaObject, {
  collection: 'unitsCache',
});

const Unit = mongoose.model('Unit', unitSchema);

module.exports = Unit;