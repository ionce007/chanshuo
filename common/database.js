const { Sequelize } = require('sequelize');
const config = require('../config');

/*const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database,
  logging: false
});*/
/*const sequelize = new Sequelize(config.mysql_bdname, config.mysql_user, config.mysql_pwd, {
  host: config.mysql_host,
  port: config.mysql_port,
  dialect: 'mysql',
  timezone: '+08:00',
  logging: true,
  pool: {                         //连接池设置
    max: 5,
    min: 0,
    idle: 10000
  }
});*/

const sequelize = new Sequelize(config.pg_bdname, config.pg_user, config.pg_pwd, {
  host: config.pg_host,
  port: config.pg_port,
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
module.exports = sequelize;
