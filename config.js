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

  MYSQL: {
    bdname: process.env.MYSQL_DBNAME,
    user: process.env.MYSQL_USER,
    pwd: process.env.MYSQL_PWD,
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
  },

  POSTGRESQL: {
    bdname: process.env.PG_DBNAME,
    user: process.env.PG_USER,
    pwd: process.env.PG_PASSWORD,
    host: process.env.PG_HOST, 
    port: parseInt(process.env.PG_PORT)
  }
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
