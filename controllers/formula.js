const request = require('sync-request');
//const { getFormulasByRange } = require('../common/cache');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const { Formula, AccessToken } = require('../models');
const util = require('../common/util');
const dotEnv = require('dotenv');
dotEnv.config();

async function getAllFormulas(req, res, next) {
  let formulas;
  let status = true;
  let message = 'ok';
  let total = 0;
  try {
    let all_formulas = await Formula.findAll({
      attributes: [
        'fs_id', 'path', 'server_filename', 'size', 'server_mtime', 'server_ctime', 'local_mtime', 'local_ctime',
        'isdir', 'category', 'md5', 'dir_empty', 'price', 'isSell', 'xhsUrl', 'kind', 'createtime', 'lastupdate'
      ],
      order: [['lastupdate', 'DESC']]
    });
    total = all_formulas.length;
    formulas = all_formulas;
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
    total = 0;
  }
  res.json({ status, message, total, formulas });
}
async function updaueFormula(req, res, next) {
  var json = { status: true, msg: '公式修改成功！', data: null };
  try {
    const { fs_id, price, isSell } = req.body;
    let date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
    var formula = await Formula.update({ price: price, isSell: isSell, lastupdate: date }, { where: { fs_id: fs_id } });
    json.data = formula;
    res.json(json);
  } catch (e) {
    json = { status: false, msg: e.message, data: null };
    res.json(json);
  }
}
async function deleteFormula(req, res, next) {
  var json = { status: true, msg: '公式删除成功！', data: null };
  try {
    const fs_id = req.params.fs_id;
    try {
      let rows = await Formula.destroy({ where: { fs_id: fs_id } });
      json.status = rows === 1;
    } catch (e) {
      console.log('111', e.message);
      json.msg = e.message;
    }
    res.json(json);
  } catch (e) {
    console.log('222', e.message);
    json = { status: false, msg: e.message, data: null };
    res.json(json);
  }
}
async function search(req, res, next) {
  var type = req.body.type;
  if (type === undefined || type === '全部') type = '';

  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';
  let pageIndex = req.body.pageIndex || 1;
  let pageSize = req.body.pageSize || 10;
  let formulas = [];
  let message = 'ok';
  let status = true;
  let total = 0;
  var where = { [Op.and]: [{ isdir: { [Op.eq]: 0 } }, { server_filename: { [Op.like]: `%${keyword}%` } }] }
  if (type.length > 0) {
    where = { [Op.and]: [{ kind: { [Op.eq]: type } }, { isdir: { [Op.eq]: 0 } }, { server_filename: { [Op.like]: `%${keyword}%` } }] }
  }
  try {
    let all_formulas = await Formula.findAll({ where: where, order: [sequelize.literal('"lastupdate" DESC')] });

    total = all_formulas.length;
    let startIndex = (pageIndex - 1) * pageSize;
    formulas = all_formulas.slice(startIndex, startIndex + pageSize);
  } catch (e) {
    status = false;
    message = e.message;
    console.error(e);
  }

  res.json({ status, message, total, formulas });
}

async function getFormula(req, res, next) {
  let pageIndex = parseInt(req.query.p);
  if (!pageIndex || pageIndex <= 1) pageIndex = 1;
  let key = req.query.k;
  if (!key) key = '';

  let tabData = await Formula.findAll({
    where: { isdir: 0, [Op.and]: { isSell: 1 } },// { [Op.and]: [ { isdir: { [Op.eq]: 0 } }, { isSell: { [Op.eq]: 1 } }] },  //{ [Op.and]: [ { isdir: { [Op.eq]: 0 } }, { isSell: { [Op.eq]: 1 } }] },
    group: 'kind',
    attributes: ['kind', [sequelize.fn('count', sequelize.col('kind')), 'total']],
    order: [[sequelize.literal('total'), 'DESC']],
    raw: true,
  });
  if (tabData) {
    tabData.forEach((node) => node.key = node.kind);
    var taballItem = { kind: '全部', total: util.calcJsonFieldSum(tabData, 'total'), key: '' }
    tabData.unshift(taballItem);
  }
  let pageSize = 10;
  let start = (pageIndex - 1) * pageSize;
  var where = { isdir: 0, isSell: 1 };
  if (key && key.length > 0) where = { isdir: 0, isSell: 1, kind: key };
  let formulas = await Formula.findAndCountAll({
    where: where,
    order: [['lastupdate', 'DESC']],
    limit: pageSize,
    offset: pageSize * (pageIndex - 1),
    raw: true,
  })

  if (pageIndex !== 0 && formulas.rows.length === 0) {
    res.redirect('/');
  }
  else {
    var retJson = {
      tabs: tabData,
      formulas: formulas.rows,
      total: formulas.count,
      pageSize: pageSize,
      curPage: pageIndex,
      key: key,
      prev: `?p=${pageIndex - 1}`,
      next: `?p=${pageIndex + 1}`
    }
    res.render('formula', retJson);
  }
}
async function showPreviewPage(req, res, next) {
  let fs_id = req.query.id;//parseInt(req.query.id).toString();
  var data = {};
  if (!fs_id || fs_id.trim() === '') data = { code: -1, state: 'failed!', msg: '没有指定预览的文件！', fs_id: '' };
  else {
    let doc = await Formula.findOne({ where: { fs_id: fs_id }, raw: true });
    if (!doc) data = { code: -2, state: 'failed!', msg: '预览的文件不存在！', fs_id: '' };
    else data = { code: 1, state: 'successed!', msg: 'ok', fs_id: fs_id };
  }
  res.render('preview', data);
}
async function downloadDoc(req, res) {
  var ret = {};

  if (req.query == null || typeof (req.query) == 'undefined' || typeof (req.query.id) == 'undefined' || req.query.id == "") {
    ret = { code: -2, state: 'failed', msg: '未指定要下载的文件！', data: null };
    res.send(ret);
    return;
  }

  var doc = await getDocument(req.query.id);

  if (doc.code != 1) { ret = doc; res.send(ret); return; }
  if (["选股公式", "指标公式"].indexOf(doc.kind) >= 0) {
    ret = { code: -7, state: 'failed', msg: '未获授权的操作！', data: null };
    res.send(ret);
    return;
  }
  try {

    var token = await getAccessToken();
    if (token.code === 0) { ret = { code: -3, state: 'failed', msg: '没有授权，无法访问！', data: null }; res.send(ret); return; }

    if (token.code === 1) {
      token = token.data;

      var expireTime = util.DateAdd(new Date(token.updatedAt), 's', token.expires_in);
      if (Date.parse(expireTime) <= Date.parse(new Date())) {
        token = await updateAccessToken(token.refresh_token);
        if (token.code != 1) {
          ret = { code: -6, state: 'failed', msg: '更新access token失败！', data: null };
          res.send(ret);
          return;
        }
      }
      var fileInfo = await get_pan_file_url(token, req.query.id);
      var filemetas = fileInfo.data;
      var fileUrl = filemetas.list[0].dlink + "&access_token={0}".format(token.access_token);
      var filename = filemetas.list[0].filename;
      var header = { 'Host': 'd.pcs.baidu.com' };
      var options = { url: fileUrl, headers: { 'Host': 'd.pcs.baidu.com' } };
      var body = request("GET", fileUrl, header);

      if (body && body.statusCode === 200) ret = { code: 1, state: 'successed', msg: '获取文件成功！', url: body.url };
      else ret = { code: -5, state: 'failed', msg: '获取文件失败（未知原因）！', data: null };
    }
    else {
      ret = { code: -4, state: 'failed', msg: '无法获取token', data: null };
    }
  } catch (e) {
    ret = { code: -1, state: 'failed', msg: e.message, data: null };
  }
  res.send(ret);
}
async function previewDoc(req, res) {
  var ret = {};
  if (req.query == null || typeof (req.query) == 'undefined' || typeof (req.query.id) == 'undefined' || req.query.id == "") {
    ret = { code: -2, state: 'failed', msg: '未指定要下载的文件！', data: null };
    res.send(ret);
    return;
  }
  var doc = await getDocument(req.query.id);
  if (doc.code != 1) { ret = doc; res.send(ret); return; }
  try {
    var token = await getAccessToken();
    if (token.code === 0) { ret = { code: -3, state: 'failed', msg: '没有授权，无法访问！', data: null }; res.send(ret); return; }
    if (token.code === 1) {
      token = token.data;
      var expireTime = util.DateAdd(new Date(token.updatedAt), 's', token.expires_in);
      if (Date.parse(expireTime) <= Date.parse(new Date())) {
        token = await updateAccessToken(token.refresh_token);
        if (token.code != 1) {
          ret = { code: -6, state: 'failed', msg: '更新access token失败！', data: null };
          res.send(ret);
          return;
        }
      }
      var fileInfo = await get_pan_file_url(token, req.query.id);
      var filemetas = fileInfo.data;

      var fileUrl = filemetas.list[0].dlink + "&access_token={0}".format(token.access_token);
      var filename = filemetas.list[0].filename;
      var header = { 'Host': 'd.pcs.baidu.com' };
      var options = { url: fileUrl, headers: { 'Host': 'd.pcs.baidu.com' } };
      var body = request("GET", fileUrl, header);
      if (body && body.statusCode === 200) ret = { code: 1, state: 'successed', msg: '获取文件成功！', data: body };
      else ret = { code: -5, state: 'failed', msg: '获取文件失败（未知原因）！', data: null };
    }
    else {
      ret = { code: -4, state: 'failed', msg: '无法获取token', data: null };
    }
  } catch (e) {
    ret = { code: -1, state: 'failed', msg: e.message, data: null };
  }
  res.send(ret);
  res.write('');
  res.end();
}
async function get_pan_file_url(token, fs_id) {
  var json = {};
  try {
    var reqUrl = `https://pan.baidu.com/rest/2.0/xpan/multimedia?method=filemetas&access_token=${token.access_token}&fsids=[${fs_id}]&dlink=1`;
    var header = { 'Host': 'pan.baidu.com' };
    var ret = request('GET', reqUrl, header);
    var body = JSON.parse(ret.getBody('utf8'))
    json = { code: 1, state: 'successed', msg: 'ok', data: body };
    return json;
  } catch (e) {
    json = { code: -2, state: 'failed', msg: e.message, data: null };
    return json;
  }
}

async function getFileMeta(fs_id) {
  var ret = {};
  if (req.query == null || typeof (req.query) == 'undefined' || typeof (req.query.fs_id) == 'undefined' || req.query.fs_id == "") {
    ret = { code: -3, state: 'failed', msg: '未指定要下载的文件！', data: null };
    res.send(ret);
    return;
  }
  try {
    var token = await getAccessToken();
    if (token.code === 0) { ret = { code: -4, state: 'failed', msg: '没有授权，无法访问！', data: null }; res.send(ret); return; }  //token = await getNewAccessToken();
    if (token.code === 1) {
      var expireTime = token.data.lastupdate.DateAdd('s', token.data.expires_in);
      if (Date.parse(expireTime) <= Date.parse(new Date())) {
        token = await updateAccessToken(token.data.refresh_token);
        if (token.code != 1) {
          ret = { code: -6, state: 'failed', msg: 'access token 更新失败！', data: null };
          res.send(ret);
          return;
        }
      }
      var filemetas = await get_pan_file_url(token.data, req.query.fs_id);

      if (filemetas.code === 1) {
        var fileUrl = filemetas.list[0].dlink + "&access_token={0}".format(token.data.access_token);
        var filename = filemetas.list[0].filename;
        var header = { 'Host': 'd.pcs.baidu.com' };

        var options = { url: fileUrl, headers: { 'Host': 'd.pcs.baidu.com' } };
        var body = request("GET", fileUrl, header);
        if (body && body.statusCode === 200) ret = { code: 1, state: 'successed', msg: '获取文件成功！', data: body };
        else ret = { code: -5, state: 'failed', msg: '获取文件失败（未知原因）！', data: null };
      }
    }
    else {
      ret = { code: -1, state: 'failed', msg: '无法获取token', data: null };
    }
  }
  catch (e) {
    ret = { code: -2, state: 'failed', msg: e.message, data: null };
  }
  res.send(ret);
}
//通过refresh_token从百度开放平台再次获取access_token
async function updateAccessToken(refresh_token) {
  var json = {};
  try {
    var ret = refresh_access_token(refresh_token);
    if (ret.code === 1) {
      var tmp = await updateRefreshAccessToken(ret.data);
      json = { code: 1, msg: "ok", data: ret.data };
    }
    else json = { code: -1, msg: 'refresh access token failed!', data: null };
    return json;
  }
  catch (e) {
    json = { code: -2, state: 'failed', msg: '操作失败', data: null };
    return json;
  }
}
async function updateRefreshAccessToken(token) {
  var json = {};
  try {
    let oldToken = getAccessToken();
    let accToken = {};
    if (oldToken) {
      let date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
      accToken = await AccessToken.update(
        { access_token: token.access_token, refresh_token: token.refresh_token, expires_in: token.expires_in, updatedAt: date },
        { where: { supplier: 'bdpan' } }
      );
    }
    else {
      let date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
      accToken = await AccessToken.create({
        supplier: 'bdpan', access_token: token.access_token, expires_in: token.expires_in,
        refresh_token: token.refresh_token, scope: 'basic netdisk', remark: '百度网盘Access Token',
        updatedAt: date, createddAt: date
      });
    }
    json = { code: 1, state: 'successed!', msg: '保存access token成功', data: accToken };
    return json;
  }
  catch (e) {
    json = { code: -1, state: 'failed', msg: '操作失败', data: token };
    return json;
  }
}
//访问百度网盘平台更新access_token
function refresh_access_token(refresh_token) {
  var json = {}
  try {
    var appKey = process.env.PAN_APIKEY;
    var secretKey = process.env.PAN_SECRETKEY;

    var url = "https://openapi.baidu.com/oauth/2.0/token?grant_type=refresh_token&refresh_token={0}&client_id={1}&client_secret={2}".format(refresh_token, appKey, secretKey);
    var ret = request('GET', url);
    json = { code: 1, state: 'successed', msg: '刷新 token 成功！', data: JSON.parse(ret.getBody('utf8')) };
    return json;
  }
  catch (e) {
    json = { code: -1, state: 'failed', msg: e.message, data: null };
    return json;
  }
}
//从数据库获取网盘访问的access_token
async function getAccessToken() {
  var json = {};
  try {
    let token = await AccessToken.findOne({ where: { supplier: 'bdpan' }, raw: true });

    if (token) { json = { code: 1, state: 'success', msg: 'ok', data: token }; }
    else json = { code: 0, state: 'failed', msg: '没有token', data: null };
    return json;
  } catch (e) {
    json = { code: -1, state: 'failed', msg: e.message, data: null };
    return json;
  }
}
async function getDocument(fs_id) {
  var json = {};
  try {
    let doc = await Formula.findOne({ where: { fs_id: fs_id }, raw: true });
    if (doc) { json = { code: 1, state: 'success', msg: 'ok', data: doc }; }
    else json = { code: 0, state: 'failed', msg: '指定的文件不存在！', data: null };
    return json;
  } catch (e) {
    json = { code: -1, state: 'failed', msg: e.message, data: null };
    return json;
  }
}
function isExpires(token) {
  var expireTime = util.DateAdd(new Date(token.data.updatedAt), 's', token.data.expires_in);
  if (Date.parse(expireTime) <= Date.parse(new Date())) return true;
  return false;
}

async function getPanCookie() {
  let ret = { status: true, msg: '获取百度网盘访问cookie成功！', data: '' };
  try {
    var ret1 = await AccessToken.findOne({ where: { supplier: 'bdpan_cookie' } }, { raw: true });
    if (ret1) ret.data = ret1.access_token;
  } catch (e) {
    ret.msg = e.message;
    ret.status = false;
  }
  return ret;
}
async function createPanCookie(cookie) {
  var date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
  var newToken = {
    supplier: 'bdpan_cookie', access_token: cookie, expires_in: 0, refresh_token: '',
    scope: '网盘文件列表', remark: '访问百度网盘时的Cookie', createdAt: date, updatedAt: date
  };
  await AccessToken.create(newToken);
}
async function updatePanCookie(cookie) {
  var date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
  var accToken = await AccessToken.update({ access_token: cookie, updatedAt: date }, { where: { supplier: 'bdpan_cookie' } });
}
function getKind(path) {
  var arr = path.split('/');
  return arr[2];
}
async function panSynchronize(req, res, next) {
  var json = { status: true, msg: '网盘文件同步成功！', data: null }
  try {
    var cookie = req.body.cookie;
    var updateCookie = true;
    if (!cookie || cookie.trim() === '') {
      var dbCookie = await getPanCookie()
      if (!dbCookie.status || dbCookie.data.trim() === '') {
        json.msg = '请先登录百度网盘，并输入访问Cookie!';
        json.status = false;
        res.json(json);
        return;
      }
      cookie = dbCookie.data;
      updateCookie = false;
    }
    var token = await getAccessToken();
    var access_token = token.data.access_token;
    if (token && isExpires(token)) { token = refresh_access_token(token.refresh_access_token); access_token = token.data.access_token; }
    var path = encodeURIComponent("/Formula");
    var url = `https://pan.baidu.com/rest/2.0/xpan/multimedia?method=listall&access_token=${access_token}&path=${path}&recursion=1`
    var header = { 'Host': 'pan.baidu.com', 'Cookie': cookie };
    var options = { headers: header };
    var ret = request("GET", url, options);
    var pan_res = JSON.parse(ret.getBody('utf8'));

    if (ret.statusCode === 200 && updateCookie) {
      var dbCookie = await getPanCookie();
      if (!dbCookie.status || dbCookie.data.trim() === '') createPanCookie(cookie);
      else updatePanCookie(cookie);
    }
    var formulas = await Formula.findAll();
    var dbNo = pan_res.list.filter(item => !formulas.some(dbItem => dbItem.fs_id == item.fs_id));
    var date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS')
    dbNo.forEach((node) => { node.price = 0, node.isSell = 0, node.xhsUrl = '', node.kind = getKind(node.path), node.createtime = date, node.lastupdate = date });
    json.data = dbNo;// pan_res.list;
    if (dbNo && dbNo.length > 0) Formula.bulkCreate(dbNo);//网盘存在，数据库不存在的数据，批量插入数据库

    var panNo = formulas.filter(item => item.isSell == 1 && !pan_res.list.some(pItem => pItem.fs_id == item.fs_id));
    if (panNo && panNo.length > 0) { //数据库存在，网盘不存在的数据，批量修改其在售标志
      var valueArr = panNo.map(function (item) { return { fs_id: item.fs_id, isSell: 0, lastupdate: date } });
      Formula.bulkCreate(valueArr, { updateOnDuplicate: ['isSell', 'lastupdate'] });
    }
  }
  catch (e) {
    json.status = false;
    json.msg = e.message;
    console.log('error = ' + e.message);
  }
  res.json(json);
}

String.prototype.format = function () {
  if (arguments.length == 0) {
    return this;
  }
  for (var s = this, i = 0; i < arguments.length; i++) {
    s = s.replace(new RegExp("\\{" + i + "\\}", "g"), arguments[i]);
  }
  return s;
};
Date.prototype.toDateString = function (format = "yyyy-MM-dd HH:mm:ss") {
  const date = new Date(this);// new Date(time);
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', millisecond: '3-digit'
  });
  const formattedDate = formatter.format(date);
  return formattedDate.replaceAll('/', '-');
}

module.exports = {
  getFormula,
  previewDoc,
  downloadDoc,
  showPreviewPage,
  getAllFormulas,
  search,
  updaueFormula,
  deleteFormula,
  panSynchronize,
};