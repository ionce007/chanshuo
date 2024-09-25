const fs = require('fs');
const { updateConfig } = require('../common/config');
const { loadAllPages } = require('../common/cache');
const { updateBlogCache } = require('../common/blogcache');
const { Option } = require('../models');
const config = require('../config');
const crypto = require('crypto');

async function getAll(req, res) {
  let options = [];
  let message = 'ok';
  let status = true;
  try {
    options = await Option.findAll({ raw: true });
  } catch (e) {
    status = false;
    message = e.message;
  }
  res.json({ status, message, options });
}

async function zhipuAuth(req, res) {
  let options = [];
  let message = 'ok';
  let status = true;
  let auth = '';
  let deviceId = '';
  let ip = "";
  try {
    options = await Option.findAll({where:{key: 'zhipu_auth'}, raw: true });
    auth = options && options.length > 0 ? options[0].value : '';

    ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress).toString();
    /*var ipArr = ip.split(',');
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    ips = ipArr.filter(item => item);
    var ipValue = ips && ips.length > 0 ? ips[0] : (new Date()).getTime();*/
    deviceId = crypto.createHash('md5').update(ip).digest('hex');
    //res.json({deviceId: deviceId });
  } catch (e) {
    status = false;
    message = e.message;
  }
  res.json({ status, message, auth, deviceId });
}
async function get(req, res) {
  const key = req.params.name;
  let option;
  let status = false;
  let message = 'ok';
  try {
    option = await Option.findOne({
      where: {
        key
      },
      raw: true
    });
    status = option !== null;
  } catch (e) {
    message = e.message;
  }
  res.json({ status, message, option });
}
async function resetCache(req, res, next) {
  let json = { status: true, message: 'success'}
  try {
    await loadAllPages();
    await updateBlogCache();
  }
  catch (error) {
    json = { status: false, message: error.message }
  }
  res.json(json);
}
async function update(req, res, next) {
  const options = req.body;
  for (const [key, value] of Object.entries(options)) {
    if (req.app.locals.config[key] !== value) {
      let newOption = { key, value };
      try {
        let option = await Option.findOne({ where: { key } });
        if (option) { await option.update(newOption);}
      } catch (e) {
        console.error(e);
      }
    }
  }
  // Here we actually didn't check the status.
  let status = true;
  let message = 'ok';
  await updateConfig(req.app);
  res.json({ status, message });
}

async function shutdown(req, res, next) {
  process.exit();
}
async function backupDatabase(req, res, next) {
  let status = true;
  let message = 'ok';
  try {
    let dbFile = config.database;
    const rs = fs.createReadStream(dbFile, { highWaterMark: 1024 * 8 });
    const data = []
    let size = 0
    rs.on('data', chunk => {
      size += chunk.length
      data.push(chunk)
    })
    rs.on('end', () => {
      const buf = Buffer.concat(data, size)
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setStatus = 200
      res.setHeader('content-length', size)
      res.end(buf)
    })
  }
  catch (error) {
    status = false;
    message = error.message;
    console.error(error.message);
    res.json({ status, message });
  }
}
async function uploadDatabase(req, res, next) {
  const { file } = req;
  const newFile = {
    description: req.body.description,
    filename: file.originalname,
    path: config.database,// '/' + file.filename,
    id: file.id
  };
  let status = false;
  let message = 'ok';
  try {
    await loadAllPages();
    await updateBlogCache();
    status = true;
  } catch (e) {
    message = e.message;
    console.log(message);
  }
  res.json({ status, message, file: newFile });
}
module.exports = {
  shutdown,
  update,
  get,
  getAll,
  backupDatabase,
  uploadDatabase,
  resetCache,
  zhipuAuth
};
