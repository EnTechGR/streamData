const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vessel = sequelize.define('Vessel', {
  timestamp: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mmsi: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  imo: {
    type: DataTypes.STRING,
  },
  navigational_status: {
    type: DataTypes.STRING,
  },
  longitude: {
    type: DataTypes.FLOAT,
  },
  latitude: {
    type: DataTypes.FLOAT,
  },
  heading: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  cog: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  sog: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  ship_name: {
    type: DataTypes.STRING,
  },
  callsign: {
    type: DataTypes.STRING,
  },
  ship_type: {
    type: DataTypes.STRING,
  },
  draught: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  size_bow: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  size_stern: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  size_port: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  size_starboard: {
    type: DataTypes.STRING,
    defaultValue: '0',
  },
  destinations: {
    type: DataTypes.STRING,
  },
}, {
  // Options
  timestamps: false, // Disable automatic timestamp fields
});

module.exports = Vessel;
