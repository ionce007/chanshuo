let fs = require('fs');
const dotEnv  = require('dotenv');
dotEnv.config();

let config = {
  port: process.env.PORT || 3000,
  database: process.env.SQLITE_PATH || './data/data.db',
  auth_cookie_name: 'blog',
  uploadPath: process.env.UPLOAD_PATH || './data/upload',
  systemName: 'Blog',
  systemVersion: 'v0.0.0',
  cacheMaxAge: 30 * 24 * 3600,  // 30 days
  maxCachePosts: 32,
  PAN_APPID: process.env.PAN_APPID,
  PAN_APIKEY: process.env.PAN_APIKEY,
  PAN_SECRETKEY: process.env.PAN_SECRETKEY,

  mysql_bdname: 'chanyue',
  mysql_user: 'huangm',
  mysql_pwd: '34756fb129acd30c',
  mysql_host: 'mysql.sqlpub.com',
  mysql_port: 3306,

  pg_bdname: 'db403ff2be13ad49c9a7bd43f620cd2de9stockblog',
  pg_user: 'ionce',
  pg_pwd: 'exitVB13@ifc',
  pg_host: '139.196.89.94',
  pg_port: 5433
};

function init() {
  if (config.systemVersion === 'v0.0.0') {
    if (!fs.existsSync(config.uploadPath)) {
      fs.mkdirSync(config.uploadPath);
    }
    let meta = JSON.parse(fs.readFileSync('package.json').toString());
    config.systemVersion = `v${meta.version}`;
  }
}

init();

module.exports = config;
