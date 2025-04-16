const { Sequelize } = require('sequelize');
const config = require('../config');

/*const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database,
  logging: false
});*/
const sequelize = new Sequelize(config.MYSQL.bdname, config.MYSQL.user, config.MYSQL.pwd, {
  host: config.MYSQL.host,
  port: config.MYSQL.port,
  dialect: 'mysql',
  timezone: '+08:00',
  logging: false,
  pool: {                         //连接池设置
    max: 5,
    min: 0,
    idle: 10000
  }
});

/*const sequelize = new Sequelize(config.POSTGRESQL.bdname, config.POSTGRESQL.user, config.POSTGRESQL.pwd, {
  host: config.POSTGRESQL.host,
  port: config.POSTGRESQL.port,
  dialect: 'postgres',
  timezone: '+08:00',
  logging: false,
  quoteIdentifiers: true,
  pool: {                         //连接池设置
    max: 5,
    min: 0,
    idle: 10000
  }
});
*/
module.exports = sequelize;
