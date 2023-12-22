const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database,
  //timezone: '+08:00',
  logging: false
});

module.exports = sequelize;
