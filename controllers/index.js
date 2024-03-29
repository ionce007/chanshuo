const { updateView, getLinks, convertContent, getPageListByTag, getPagesByRange } = require('../common/cache');
//const { loadAllBlogs } = require('../common/blogcache');
const { getAllBlogsTitle } = require('../common/blogcache');
const { getDate, dateFormat,formatDateTime } = require('../common/util');
const { Page, Formula } = require('../models');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const { PAGE_STATUS, PAGE_TYPES } = require('../common/constant');
const { Op } = require('sequelize');
const path = require('path');
const config = require('../config');
const { parseTagStr } = require('../common/util');

async function getIndex(req, res, next) {
  if (req.url === '/' && req.app.locals.config.index_page_content !== '') {
    if (req.app.locals.config.index_page_content === '404') {
      res.status(404);
      res.end();
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(req.app.locals.config.index_page_content);
    }
    return;
  }
  let page = parseInt(req.query.p);
  if (!page || page <= 0) {
    page = 0;
  }
  let pageSize = 10;
  let start = page * pageSize;
  let pages = await getPagesByRange(start, pageSize);
  if (page !== 0 && pages.length === 0) {
    res.redirect('/');
  } else {
    pages = pages.map((item) => {
      item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
      return item;
    });
    res.render('index', { pages: pages, prev: `?p=${page - 1}`, next: `?p=${page + 1}` });
  }
}
async function getArchive(req, res, next) {
  let pages = await getPagesByRange(0, -1);
  pages = pages.map((item) => {
    item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
    item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
    return item;
  });
  res.render('archive', { pages: pages.reverse(),kind:'summary' });
}
async function getPageList(req, res, next) {
  let pageIndex = req.query.pageNumber || 1;
  if (!pageIndex || pageIndex <= 1) pageIndex = 1;
  let pageSize = req.query.pageSize || 10;
  if (!pageSize) pageSize = 10;
  let kind = req.query.kind;
  let tag = req.query.tag;
  let where = {};
  console.log('kind: ',kind);
  if(kind === 'tag') where = {pageStatus: { [Op.not]: PAGE_STATUS.RECALLED }, tag: { [Op.like]: `%${tag}%` }};
  else if(kind === 'month') {
    let year = tag.split('-')[0];
    let month = tag.split('-')[1];
    let startDate = new Date(year, parseInt(month) - 1, 1, 0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    where = {pageStatus: { [Op.not]: PAGE_STATUS.RECALLED }, createdAt: { [Op.between]: [startDate, endDate] }};
  }
  try {
    let datus = await Page.findAndCountAll({
      where: where,
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset: pageSize * (pageIndex - 1),
      raw: true
    });
    let pages = datus.rows.map( (item) =>  {
      item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
      return item;
    });
    res.json({ status: true, message: 'ok', pages,  total: datus.count, kind: kind});
  } catch (e) {
    res.json({ tatus: false,  message: e.message, pages: [], total: 0, kind: kind  });
  }
/*
  let pages = await getPagesByRange(0, -1);
  pages = pages.map((item) => {
    item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
    item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
    return item;
  });
  res.render('archive', { pages: pages.reverse() });
  */
}
async function getDonate(req, res, next) {
  const link = 'donate';
  let page = await Page.findOne({
    where: {
      [Op.and]: [{ link }],
      [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
    }
  });
  if (page === null) {
    return res.render('message', {
      title: '错误',
      message: `未找到链接为 ${link} 且公共可见的页面`
    });
  }
  // Update views
  page.increment('view').then();
  page = page.get({ plain: true });
  // Change the data format.
  page.createdAt = getDate('default', page.createdAt);
  page.updatedAt = getDate('default', page.updatedAt);

  page.view++;
  updateView(page.id);
  if (page.password) {
    page.converted_content = '<p>本篇文章被密码保护，需要输入密码才能查看，但是正在使用的主题不支持该功能！</p>';
  } else {
    page.converted_content = convertContent(page, false);
  }
  // Category
  let [category, tags] = parseTagStr(page.tag);
  page.tags = tags;
  if (category && category !== 'Others') {
    page.category = category;
    page.categoryList = await getPageListByTag(page.category);
  } else {
    page.categoryList = [];
  }

  res.locals.links = getLinks(page.id);
  res.render('donate', { page });
}

async function getAboutMe(req, res, next) {
  const link = 'notice';
  let page = await Page.findOne({
    where: {
      [Op.and]: [{ link }],
      [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
    }
  });
  if (page === null) {
    return res.render('message', {
      title: '错误',
      message: `未找到链接为 ${link} 且公共可见的页面`
    });
  }
  // Update views
  page.increment('view').then();
  page = page.get({ plain: true });
  // Change the data format.
  page.createdAt = getDate('default', page.createdAt);
  page.updatedAt = getDate('default', page.updatedAt);

  page.view++;
  updateView(page.id);
  if (page.password) {
    page.converted_content = '<p>本篇文章被密码保护，需要输入密码才能查看，但是正在使用的主题不支持该功能！</p>';
  } else {
    page.converted_content = convertContent(page, false);
  }
  // Category
  let [category, tags] = parseTagStr(page.tag);
  page.tags = tags;
  if (category && category !== 'Others') {
    page.category = category;
    page.categoryList = await getPageListByTag(page.category);
  } else {
    page.categoryList = [];
  }

  res.locals.links = getLinks(page.id);
  res.render('aboutme', { page });
}

async function getSitemap(req, res, next) {
  //res.header('Content-Type', 'application/xml');
  res.header('Content-Type', 'application/xml;charset=UTF-8');
  res.header('Content-Encoding', 'gzip');

  if (req.app.locals.sitemap) {
    res.send(req.app.locals.sitemap);
    return;
  }
  try {
    const hostname = 'https://' + req.app.locals.config.domain;

    const smStream = new SitemapStream({ hostname });
    const pipeline = smStream.pipe(createGzip());
    //const pipeline = smStream.pipe();

    let dropdowns = JSON.parse(req.app.locals.config.nav_links);
    var firstOne = dropdowns.shift();
    if (firstOne.value) {
      firstOne.value.forEach((item) => {
        smStream.write({ url: item.link, priority: 1, changefreq: 'monthly' });
      });
    }
    dropdowns.forEach((dropdown) => {
      if (dropdown.value) {
        dropdown.value.forEach((item) => {
          smStream.write({ url: item.link, priority: 1, changefreq: 'monthly' });
        });
      }
    });
    let pages = await getPagesByRange(0, -1);
    pages.forEach(page => {
      let url = `/page/` + page.link;
      smStream.write({ url: `/page/` + page.link, priority: 1, changefreq: 'daily' });
    });

    let formulas = await Formula.findAll({ where: { isSell: 1 } })
    let showFormulas = formulas.filter((item) => { return item.kind === '操作说明' || item.kind === '经验分享' });
    if (showFormulas && showFormulas.length > 0) {
      showFormulas.forEach(item => {
        let url = `/preview?id=${item.fs_id}`;
        smStream.write({ url: url, priority: 1, changefreq: 'daily' });
      });
    }
    //let data = await loadAllBlogs();
    let data = await getAllBlogsTitle();
    let blogs = data;
    if (blogs.length > 0) {
      let blogdata = blogs.filter((item) => { return item.isEnable === 1 && item['CSCategory.isEnable'] === 1 });
      console.log('blogdata.length:', blogdata.length);
      blogdata.forEach(item => {
        let url = `/chanshuo/article?id=${item.id}`;
        smStream.write({ url: url, priority: 1, changefreq: 'daily' });
      })
    }

    streamToPromise(pipeline).then(sm => (req.app.locals.sitemap = sm));
    smStream.end();
    pipeline.pipe(res).on('error', e => {
      throw e;
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
}

async function getMonthArchive(req, res, next) {
  const year = req.params.year;
  let month = req.params.month;
  const time = year + '-' + month;
  try {
    /*let startDate = new Date(year, parseInt(month) - 1, 1, 0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
  
    let pages = await Page.findAll({
      where: {
        pageStatus: { [Op.not]: PAGE_STATUS.RECALLED },
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      raw: true
    });
    pages = pages.map((item) => {
      item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
      return item;
    });*/
    res.render('list', { pages:[], title: time ,kind: 'month'});
    //res.render('archive', { pages, title: time ,kind: 'month'});
  } catch (e) {
    res.render('message', {
      title: '错误',
      message: e.message
    });
  }
}

async function getTagData(req, res, next) {
  const tag = req.query.tag;
  let pageIndex = req.query.pageNumber || 1;
  if (!pageIndex || pageIndex <= 1) pageIndex = 1;
  let pageSize = req.query.pageSize || 10;
  if (!pageSize) pageSize = 10;

  try {
    let datus = await Page.findAndCountAll({
      where: {
        pageStatus: { [Op.not]: PAGE_STATUS.RECALLED },
        tag: { [Op.like]: `%${tag}%` }
      },
      order: [['createdAt', 'ASC']],
      limit: pageSize,
      offset: pageSize * (pageIndex - 1),
      raw: true
    });
    let pages = datus.rows.map((item) => {
      item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
      return item;
    });
    res.json({ status: true, message: 'ok', pages, title: tag, total: datus.count });
  } catch (e) {
    res.json({ tatus: false, title: '错误', message: e.message, pages: [] });
  }
}

async function getTag(req, res, next) {
  const tag = req.params.tag;
  try {
    /*let pages = await Page.findAll({
      where: {
        pageStatus: { [Op.not]: PAGE_STATUS.RECALLED },
        tag: { [Op.like]: `%${tag}%` }
      },
      raw: true
    });
    pages = pages.map((item)=>{ 
      item.createdAt = dateFormat(item.createdAt,'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt,'yyyy-MM-dd HH:mm:ss');
      return item; 
    });*/
    let pages = [];
    res.render('list', { pages, title: tag, kind: 'tag' });
  } catch (e) {
    res.render('message', {
      title: '错误',
      message: e.message
    });
  }
}
function format(date){
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  month = month < 10 ? ('0' + month) : month;
  let day = date.getDate();
  day = day < 10 ? ('0' + day) : day;
  let hour = date.getHours();
  hour = hour < 10 ? ('0' + hour) : hour;
  let min = date.getMinutes();
  min = min < 10 ? ('0' + min) : min;
  let sec = date.getSeconds();
  sec = sec < 10 ? ('0' + sec) : sec;
  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

async function getPage(req, res, next) {
  const link = req.params.link;
  let page = await Page.findOne({
    where: {
      [Op.and]: [{ link }],
      [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
    }
  });
  if (page === null) {
    return res.render('message', {
      title: '错误',
      message: `未找到链接为 ${link} 且公共可见的页面`
    });
  }
  // Update views
  page.increment('view').then();
  page = page.get({ plain: true });
  // Change the data format.
  //page.createdAt = format(page.createdAt);
  //page.updatedAt = format(page.updatedAt);
  page.view++;
  updateView(page.id);
  if (page.password) {
    page.converted_content = '<p>本篇文章被密码保护，需要输入密码才能查看，但是正在使用的主题不支持该功能！</p>';
  } else {
    page.converted_content = convertContent(page, false);
  }
  // Category
  let [category, tags] = parseTagStr(page.tag);
  page.tags = tags;
  if (category && category !== 'Others') {
    page.category = category;
    page.categoryList = await getPageListByTag(page.category);
  } else {
    page.categoryList = [];
  }

  res.locals.links = getLinks(page.id);
  switch (page.type) {
    case PAGE_TYPES.ARTICLE:
      res.render('article', { page });
      break;
    case PAGE_TYPES.CODE:
      res.render('code', { page });
      break;
    case PAGE_TYPES.RAW:
      res.render('raw', { page });
      break;
    case PAGE_TYPES.DISCUSS:
      res.render('discuss', { page });
      break;
    case PAGE_TYPES.LINKS:
      let linkList;
      try {
        linkList = JSON.parse(page.converted_content);
      } catch (e) {
        console.error(e.message);
      }
      res.render('links', { page, linkList });
      break;
    case PAGE_TYPES.REDIRECT:
      res.redirect(page.converted_content);
      break;
    case PAGE_TYPES.TEXT:
      let type = 'text/plain';
      if (page.link.endsWith('.html')) {
        type = 'text/html';
      } else if (page.link.endsWith('.json')) {
        type = 'application/json';
      }
      res.set('Content-Type', type);
      res.send(page.converted_content);
      break;
    default:
      res.render('message', {
        title: '错误',
        message: `意料之外的页面类型：${page.type}`
      });
  }
}

async function getStaticFile(req, res, next) {
  let filePath = req.path;
  if (filePath) {
    res.set('Cache-control', `public, max-age=${config.cacheMaxAge}`);
    return res.sendFile(
      path.join(
        __dirname,
        `../themes/${req.app.locals.config.theme}/${filePath}`
      )
    );
  }
  res.sendStatus(404);
}


module.exports = {
  getIndex,
  getArchive,
  getSitemap,
  getMonthArchive,
  getTag,
  getPage,
  getStaticFile,
  getAboutMe,
  getDonate,
  getTagData,
  getPageList,
};

