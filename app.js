const express = require('express');
const http = require('http');
const session = require('express-session');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { updateConfig, loadNoticeContent } = require('./common/config');
const config = require('./config');
const serveStatic = require('serve-static');
const path = require('path');
const enableRSS = require('./common/rss').enableRSS;
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const UploadBigFile = require("./middlewares/uploadBigFile");
const GN = require("./middlewares/concept");
const dotEnv = require('dotenv');
dotEnv.config();

const crypto = require('crypto');
const webRouter = require('./routes/web-router');
const apiRouterV1 = require('./routes/api-router.v1');
const app = express();
const server = http.createServer(app);
const { initializeDatabase } = require('./models');
const { loadAllPages } = require('./common/cache');
const { loadAllBlogs } = require('./common/blogcache');
const localUtil = require('./common/local');

app.use(rateLimit({ windowMs: 30 * 1000, max: 60 }));
app.use('/api/comment', rateLimit({ windowMs: 60 * 1000, max: 5 }));
app.use(compression());
app.locals.systemName = config.systemName;
app.locals.systemVersion = config.systemVersion;
app.locals.config = {};
app.locals.config.theme = 'bulma';
app.locals.page = undefined;
app.locals.notice = '请创建一个链接为 notice 的页面，其内容将在此显示';
app.locals.loggedin = false;
app.locals.isAdmin = false;
app.locals.sitemap = undefined;

app.locals.localUtil = new localUtil();

app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(cookieParser(crypto.randomBytes(64).toString('hex')));
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: crypto.randomBytes(64).toString('hex')
  })
);

app.use(flash());

(async () => {
  await initializeDatabase();
  // load configuration & update app.locals
  await updateConfig(app);
  await loadNoticeContent(app);
  enableRSS(app.locals.config);
  // load pages
  await loadAllPages();
  await loadAllBlogs();

  // Then we set up the app.
  let serveStaticOptions = {
    maxAge: config.cacheMaxAge * 1000
  };
  app.use('/upload', serveStatic(config.uploadPath, serveStaticOptions));
  app.use('/img', serveStatic('./data/img', serveStaticOptions));
  app.use('/admin', serveStatic(path.join(__dirname, 'public', 'admin'), serveStaticOptions));
  app.get('/feed.xml', (req, res) => {
    res.download(path.join(__dirname, 'public', 'feed.xml'));
  });
  app.get('/downgn', (req, res) => {
    console.log('downgn: ', 'downgn')
    var filename = path.join(__dirname, 'public', 'conceptchange.txt');
    const fs = require("fs");
    if (!fs.existsSync(filename)) { res.send({ code: -1, msg: '文件不存在！' }); }
    else res.download(filename);
  });
  app.get('/api/deviceid', (req, res) => {
    const ip = req.connection.remoteAddress || req.headers['x-forwarded-for'];
    var ipArr = ip.split(':');
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    var ips = ipArr.filter(item => item && regex.test(item));
    var ip = ips && ips.length > 0 ? ips[0] : (new Date()).getTime();
    var deviceId = crypto.createHash('md5').update(ip).digest('hex');
    res.json({deviceId: deviceId });
  });
  app.use(
    serveStatic(path.join(__dirname, 'data', 'index'), serveStaticOptions)
  );

  app.use('*', (req, res, next) => {
    if (req.session.user !== undefined) {
      res.locals.loggedin = true;
      res.locals.isAdmin = req.session.user.isAdmin;
    }
    next();
  });

  app.use('/', webRouter);
  app.use('/api', apiRouterV1);

  app.use(function (req, res, next) {
    if (!res.headersSent) {
      res.render('message', {
        title: '未找到目标页面',
        message: '所请求的页面不存在，请检查页面链接是否正确'
      });
    }
  });
})();

const upload = new UploadBigFile();

server.on("request", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.status = 200;
    res.end();
    return;
  }

  if (req.url === '/api/components') {
    res.on('close', function () {
      console.log('res close!')
      res.end();
    })
    GN.componentChange(req, res);
  }
  if (req.url === '/api/export4TDX') {
    res.on('close', function () {
      res.download(path.join(__dirname, 'public', 'conceptchange.txt'));
      console.log('res close!')
      res.end();
    })
    GN.export4TDX(req, res);
  }
  if (req.url === "/bigfile/verify") {
    await upload.handleVerifyUpload(req, res);
    return;
  }

  if (req.url === "/bigfile/merge") {
    await upload.handleMerge(req, res);
    return;
  }

  if (req.url === "/bigfile" || req.url === '/bigfile/') {
    await upload.handleFormData(req, res);
  }

  if (req.url === "/bigfile/delete") {
    console.log('/bigfile/delete request method: ', req.method);
    await upload.deleteFiles(req, res);
  }
});

server.listen(config.port);

server.on('close', e => {
  console.log(`connection on port ${config.port} is closed.`);
  console.error(e.toString());
});

server.on('error', err => {
  console.error(
    `An error occurred on the server, please check if port ${config.port} is occupied.`
  );
  console.error(err.toString());
});

server.on('listening', () => {
  console.log(`Server listen on port: ${config.port}.`);
});

module.exports = app;
