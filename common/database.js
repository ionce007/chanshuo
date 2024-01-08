const { Sequelize } = require('sequelize');
const config = require('../config');

/*const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: config.database,
  logging: false
});*/
const sequelize = new Sequelize(config.mysql_bdname, config.mysql_user, config.mysql_pwd, {
  host: config.mysql_host,
  port: config.mysql_port,
  dialect: 'mysql',
  timezone: '+08:00',
  logging: false,
  pool: {                         //连接池设置
    max: 5,
    min: 0,
    idle: 10000
  }
});
module.exports = sequelize;
