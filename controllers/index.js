const { updateView, getLinks, convertContent, getPageListByTag, getPagesByRange } = require('../common/cache');
//const { loadAllBlogs } = require('../common/blogcache');
const { getAllBlogsTitle } = require('../common/blogcache');
const { getDate, dateFormat, formatDateTime } = require('../common/util');
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
  res.render('archive', { pages: pages.reverse(), kind: 'summary' });
}
async function getPageList(req, res, next) {
  let pageIndex = req.query.pageNumber || 1;
  if (!pageIndex || pageIndex <= 1) pageIndex = 1;
  let pageSize = req.query.pageSize || 10;
  if (!pageSize) pageSize = 10;
  let kind = req.query.kind;
  let tag = req.query.tag;
  let where = {};
  console.log('kind: ', kind);
  if (kind === 'tag') where = { pageStatus: { [Op.not]: PAGE_STATUS.RECALLED }, tag: { [Op.like]: `%${tag}%` } };
  else if (kind === 'month') {
    let year = tag.split('-')[0];
    let month = tag.split('-')[1];
    let startDate = new Date(year, parseInt(month) - 1, 1, 0, 0, 0, 0);
    let endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    where = { pageStatus: { [Op.not]: PAGE_STATUS.RECALLED }, createdAt: { [Op.between]: [startDate, endDate] } };
  }
  try {
    let datus = await Page.findAndCountAll({
      where: where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: pageSize * (pageIndex - 1),
      raw: true
    });
    let pages = datus.rows.map((item) => {
      item.createdAt = dateFormat(item.createdAt, 'yyyy-MM-dd HH:mm:ss');
      item.updatedAt = dateFormat(item.updatedAt, 'yyyy-MM-dd HH:mm:ss');
      return item;
    });
    res.json({ status: true, message: 'ok', pages, total: datus.count, kind: kind });
  } catch (e) {
    res.json({ tatus: false, message: e.message, pages: [], total: 0, kind: kind });
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
    res.render('list', { pages: [], title: time, kind: 'month' });
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
function format(date) {
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

function parseMultiJson(jsonStr) {
  const jsonArr = [];
  let startIndex = 0;
  let endIndex = 0;
  
  while (startIndex < jsonStr.length) {
    // 找到一个 JSON 对象的开始位置
    startIndex = jsonStr.indexOf('{', startIndex);
    if (startIndex === -1) {
      break;
    }
    
    // 找到一个 JSON 对象的结束位置
    let openBrackets = 1;
    endIndex = startIndex + 1;
    while (openBrackets > 0 && endIndex < jsonStr.length) {
      if (jsonStr[endIndex] === '{') {
        openBrackets++;
      } else if (jsonStr[endIndex] === '}') {
        openBrackets--;
      }
      endIndex++;
    }
    
    // 将该 JSON 对象解析为一个对象，并添加到数组中
    const json = jsonStr.substring(startIndex, endIndex);
    jsonArr.push(JSON.parse(json));
    
    // 更新下一个 JSON 对象的开始位置
    startIndex = endIndex;
  }
  
  return jsonArr;
}

async function readEventStream(req, res, next) {
  let payload = {
    "assistant_id": "65fc148a7ad0f796ff91dca5",
    "conversation_id": "",
    "meta_data": {
        "mention_conversation_id": "",
        "is_test": false,
        "input_question_type": "xxxx",
        "channel": "",
        "draft_id": "",
        "quote_log_id": "",
        "platform": "pc"
    },
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "广州今天的天气怎么样？"
                }
            ]
        }
    ]
  }
  fetch(`https://chatglm.cn/chatglm/backend-api/assistant/stream`, {
    method: 'POST',
    hearders : {
      'Accept': 'text/event-stream',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language:': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
      'App-name': 'chatglm',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTE2MTEzNzVkOWQ0N2M3OGE2MDk2YWI4MjZkMWJkNiIsImV4cCI6MTcyNzQ4NjI2OSwibmJmIjoxNzI3Mzk5ODY5LCJpYXQiOjE3MjczOTk4NjksImp0aSI6IjUwNDUxYTAzZDYwOTQ5ZjVhZDQ5N2FkOTUxY2E1ODIzIiwidWlkIjoiNjY3NjJhNDE0NjQ3MjAyMGNiMzQzYjkwIiwidHlwZSI6ImFjY2VzcyJ9.hn38oShtYwaNp5Ei4wjtc09UVVS1FEgKTGA26ZbN49U',
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
      'Cookie': 'sensorsdata2015jssdkchannel=%7B%22prop%22%3A%7B%22_sa_channel_landing_url%22%3A%22%22%7D%7D; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2266762a4146472020cb343b90%22%2C%22first_id%22%3A%221903d924e873ff-0f9161f9add3c1-26001c51-1049088-1903d924e8887a%22%2C%22props%22%3A%7B%22%24latest_traffic_source_type%22%3A%22%E7%9B%B4%E6%8E%A5%E6%B5%81%E9%87%8F%22%2C%22%24latest_search_keyword%22%3A%22%E6%9C%AA%E5%8F%96%E5%88%B0%E5%80%BC_%E7%9B%B4%E6%8E%A5%E6%89%93%E5%BC%80%22%2C%22%24latest_referrer%22%3A%22%22%2C%22_latest_wx_ad_click_id%22%3A%22%22%2C%22_latest_wx_ad_hash_key%22%3A%22%22%2C%22_latest_wx_ad_callbacks%22%3A%22%22%7D%2C%22identities%22%3A%22eyIkaWRlbnRpdHlfY29va2llX2lkIjoiMTkwM2Q5MjRlODczZmYtMGY5MTYxZjlhZGQzYzEtMjYwMDFjNTEtMTA0OTA4OC0xOTAzZDkyNGU4ODg3YSIsIiRpZGVudGl0eV9sb2dpbl9pZCI6IjY2NzYyYTQxNDY0NzIwMjBjYjM0M2I5MCJ9%22%2C%22history_login_id%22%3A%7B%22name%22%3A%22%24identity_login_id%22%2C%22value%22%3A%2266762a4146472020cb343b90%22%7D%2C%22%24device_id%22%3A%221903d924e873ff-0f9161f9add3c1-26001c51-1049088-1903d924e8887a%22%7D; chatglm_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTE2MTEzNzVkOWQ0N2M3OGE2MDk2YWI4MjZkMWJkNiIsImV4cCI6MTcyNzQ4NjI2OSwibmJmIjoxNzI3Mzk5ODY5LCJpYXQiOjE3MjczOTk4NjksImp0aSI6IjUwNDUxYTAzZDYwOTQ5ZjVhZDQ5N2FkOTUxY2E1ODIzIiwidWlkIjoiNjY3NjJhNDE0NjQ3MjAyMGNiMzQzYjkwIiwidHlwZSI6ImFjY2VzcyJ9.hn38oShtYwaNp5Ei4wjtc09UVVS1FEgKTGA26ZbN49U; chatglm_token_expires=2024-09-27%2011:18:56; chatglm_refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZTE2MTEzNzVkOWQ0N2M3OGE2MDk2YWI4MjZkMWJkNiIsImV4cCI6MTc0Mjk1MTg2OSwibmJmIjoxNzI3Mzk5ODY5LCJpYXQiOjE3MjczOTk4NjksImp0aSI6ImI4Zjg5OGNjYzAyNjQ1NWRhZmM2M2M1NzhmYzJmZTFiIiwidWlkIjoiNjY3NjJhNDE0NjQ3MjAyMGNiMzQzYjkwIiwidHlwZSI6InJlZnJlc2gifQ.1-b3lrD2uZA9Oo7XFRHZ_h-n5UE4a2i5bgys_CofkJs; chatglm_user_id=66762a4146472020cb343b90',
      'Host': 'chatglm.cn',
      'Origin': 'https://chatglm.cn',
      ///'Sec-Ch-Ua': `"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"`,
      //'Sec-Ch-Ua-Mobile': '?0',
      //'Sec-Ch-Ua-Platform': '"Windows"',
      //'Eec-Fetch-Dest:': 'empty',
      //'Sec-Fetch-Mode': 'cors',
      //'Sec-Fetch-Site': 'same-origin',
      //'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'X-App-Platform': 'pc',
      'X-App-Version': '0.0.1',
      'X-Device-Id': '6327127c7530453083d4000140de0ed9',
      'X-Lang': 'zh',
      'X-Request-Id': '9b4501e346ee4213963de810fe802ddc'
    },
    //mode: 'cors',
    credentials: 'include',
    body: JSON.stringify(payload),
  })
    .then((response) => {
      console.log('response = ',response);
      const decoder = new TextDecoder('utf-8');
      let buffer = []
      // 获取可读流
      const reader = response.body.getReader();
      // 读取数据
      function read() {
        return reader.read().then(({ done, value }) => {
          console.log('value = ', value);
          if (done) {
            // 这里就能拿到完成的 buffer
            console.log('Stream 已经读取完毕', buffer);
            // 如果需要使用到完整的数据，可在这里使用，useData是你要使用数据来干嘛的函数
            //useData(buffer)
            return buffer;
          }
          // 读取每段流的数据块
          const chunk = decoder.decode(value, { stream: false });
          // 由于数据块中可能包含多段数据，需要额外拆分成单段数据，具体因单段数据结构而异，这里不演示
          // 例如正常是：'{a: 1}' 结构，我们使用 JSON.parse 就能转换成对象结构。
          // 结果返回了 '{a: 1}{a: 2}' 两段拼接在一起的数据，这种需要自行处理为：[{a: 1}, {a: 2}]
          const list = parseMultiJson(chunk); // 封装一个自定义函数parseMultiJson去处理.
          // 如果需要每获取一段数据，就使用到一段数据，那就在这里使用，useData是你要使用这段数据来干嘛的函数
          //useData(list)
          // 把处理好后的数据合并到 buffer中
          buffer = buffer.concat(chunk);
          // 继续读取
          return read();
        });
      }
      // 开始读取
      return read()
    })
    .catch((error) => {
      console.error('Error:', error);
    })
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
  readEventStream,
};

