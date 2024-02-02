const { convertContent, deleteCacheEntry } = require('../common/cache');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const request = require('sync-request');
const { Page, Option } = require('../models');
const Stream = require('stream');
const { loadNoticeContent } = require('../common/config');
const { updateCache, loadAllPages } = require('../common/cache');
const { getDate } = require('../common/util');
const { PAGE_STATUS, PAGE_TYPES } = require('../common/constant');
const config = require('../config');

async function search(req, res) {
  const type = Number(req.body.type);
  let types = [];
  if (type === undefined || type === -1) {
    types = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  } else {
    types.push(type);
  }

  let keyword = req.body.keyword;
  keyword = keyword ? keyword.trim() : '';

  let pages = [];
  let message = 'ok';
  let status = true;
  try {
    pages = await Page.findAll({
      where: {
        type: types,
        [Op.or]: [
          {
            title: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            description: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            tag: {
              [Op.like]: `%${keyword}%`
            }
          },
          {
            link: {
              [Op.like]: `%${keyword}%`
            }
          }
        ]
      },
      order: [sequelize.literal('"updatedAt" DESC')]
    });
  } catch (e) {
    status = false;
    message = e.message;
    console.error(e);
  }

  res.json({ status, message, pages });
}

async function create(req, res) {
  req.app.locals.sitemap = undefined;
  let type = req.body.type;
  let link = req.body.link;
  let pageStatus = req.body.pageStatus;
  let commentStatus = req.body.commentStatus;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;
  let userId = req.session.user.id;
  let view = 0;
  let upVote = 0;
  let downVote = 0;

  if (req.session.authWithToken) {
    let oldContent = content;
    content = `---\ntitle: ${title}\ndescription: ${description}\ntags: \n`;
    let tags = req.body.tags;
    for (let i = 0; i < tags.length; i++) {
      content += `- ${tags[i]}\n`;
    }
    content += `---\n\n${oldContent}`;
    tag = tags.join(';');
    if (pageStatus === undefined) {
      pageStatus = PAGE_STATUS.PUBLISHED;
    }
    if (commentStatus === undefined) {
      commentStatus = 1;
    }
    if (type === undefined) {
      type = PAGE_TYPES.ARTICLE;
    }
    if (link === undefined) {
      link = title;
    }
  }

  let page;
  let message = 'ok';
  let status = false;
  let id;
  try {
    page = await Page.create({
      type,
      link,
      pageStatus,
      commentStatus,
      title,
      content,
      tag,
      description,
      password,
      view,
      upVote,
      downVote,
      UserId: userId
    });
    if (page) {
      page = page.get({ plain: true });
      // WTF, the date attributes here are object.
      page.createdAt = getDate('default', page.createdAt.toUTCString());
      page.updatedAt = getDate('default', page.updatedAt.toUTCString());
      await SEO2Baidu(page);
      id = page.id;
      status = true;
      updateCache(page, true, true);
      await loadAllPages();
    }
  } catch (e) {
    console.error(e);
    message = e.message;
  }
  if (link.toString() === 'notice') {
    loadNoticeContent(req.app).then();
  }
  res.json({ status, message, id });
}
async function SEO2Baidu(page){
  try {
    var option = await Option.findOne({ where: { key: 'domain' }, raw: true });
    var domain = (!option ? 'cms.foryet.com' : option.value);
    var postData = `https://${domain}/page/${page.link}`
    headers = {
      host: 'data.zz.baidu.com',
      'User-Agent': 'curl/7.12.1',
      'Content-Type': 'text/plain',
    };
    const url = `http://data.zz.baidu.com/urls?site=https://${domain}&token=${config.BDZZ_TOKEN}`;
    const ret = request('POST', url, { headers: headers, body: postData });
    return JSON.parse(ret);
  }
  catch (error) {
    return {status: false, msg: error.message };
  }
}
async function submitUrlToBaidu(req, res, next) {
  try {
    var option = Option.findOne({ where: { key: 'domain' }, raw: true });
    var domain = (!option ? 'cms.foryet.com' : option.value);
    var postData = req.body.urls;
    var postBody = decodeURIComponent(postData);
    headers = {
      host: 'data.zz.baidu.com',
      'User-Agent': 'curl/7.12.1',
      'Content-Type': 'text/plain',
    };
    const url = `http://data.zz.baidu.com/urls?site=https://${domain}&token=${config.BDZZ_TOKEN}`;
    const ret = request('POST', url, { headers: headers, body: postBody });
    console.log('submitUrlToBaidu -> ret', ret);
    res.json(ret);
  }
  catch (error) {
    res.json({status: false, msg: error.message });
  }
}
async function getAll(req, res) {
  let pages;
  let status = true;
  let message = 'ok';
  try {
    pages = await Page.findAll({
      attributes: [
        'id',
        'type',
        'link',
        'pageStatus',
        'commentStatus',
        'title',
        'tag',
        'password',
        'view',
        'upVote',
        'downVote',
        'createdAt',
        'updatedAt',
        'UserId'
      ],
      order: [['updatedAt', 'DESC']]
    });
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
  }
  res.json({ status, message, pages });
}

async function getAllTest(req, res) {
  let pages;
  let status = true;
  let message = 'ok';
  let total = 0;
  let pageSize = req.query.pageSize || 3;
  pageSize = Number(pageSize);
  let pageIndex = req.query.pageNumber || 1;
  pageIndex = Number(pageIndex);
  try {
    let datus = await Page.findAndCountAll({
      attributes: [
        'id',
        'type',
        'link',
        'pageStatus',
        'commentStatus',
        'title',
        'tag',
        'password',
        'view',
        'upVote',
        'downVote',
        'createdAt',
        'updatedAt',
        'UserId'
      ],
      order: [['updatedAt', 'DESC']],
      limit: pageSize,
      offset: pageSize * (pageIndex - 1)
    });
    console.log('datus: ', datus);
    pages = datus.rows;
    total = datus.count;
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
  }
  res.json({ status, message, total, pages });
}

async function export_(req, res, next) {
  const id = req.params.id;
  try {
    let page = await Page.findOne({ where: { id } });
    if (page) {
      const filename = page.link + '.md';
      res.setHeader(
        'Content-disposition',
        'attachment; filename*=UTF-8\'\'' + encodeURIComponent(filename)
      );
      res.setHeader('Content-type', 'text/md');
      const fileStream = new Stream.Readable({
        read(size) {
          return true;
        }
      });
      fileStream.pipe(res);
      fileStream.push(page.content);
      res.end();
      return;
    }
  } catch (e) {
    console.error(e);
  }
  next();
}

async function get(req, res) {
  const id = req.params.id;
  let status = true;
  let message = 'ok';
  let page;

  try {
    page = await Page.findOne({
      where: { id }
    });
  } catch (e) {
    console.error(e);
    message = e.message;
    status = false;
  }
  res.json({ status, message, page });
}

async function getRenderedPage(req, res) {
  const id = req.params.id;
  let password = req.query.password;
  let status = false;
  let message = '';
  let content = '';
  if (!password) {
    password = '';
  }
  try {
    let page = await Page.findOne({
      where: {
        id, password,
        [Op.not]: [{ pageStatus: PAGE_STATUS.RECALLED }]
      }
    });
    if (page) {
      content = convertContent(page, false);
      status = true;
    } else {
      message = '文章不存在或被撤回，或密码错误';
    }
  } catch (e) {
    console.error(e);
    message = e.message;
  }
  res.json({ status, message, content });
}

async function update(req, res, next) {
  req.app.locals.sitemap = undefined;
  let id = req.body.id;
  let type = req.body.type;
  let link = req.body.link;
  let pageStatus = req.body.pageStatus;
  let commentStatus = req.body.commentStatus;
  let title = req.body.title;
  let content = req.body.content;
  let tag = req.body.tag;
  let description = req.body.description;
  let password = req.body.password;
  let updatedAt = new Date();

  let newPage = {
    type,
    link,
    pageStatus,
    commentStatus,
    title,
    content,
    tag,
    description,
    password,
    updatedAt
  };

  let message = 'ok';
  let status = false;
  let updateConvertedContent = false;
  try {
    let page = await Page.findOne({ where: { id } });
    if (page) {
      let oldContent = page.get().content;
      await page.update(newPage);
      page = page.get({ plain: true });
      page.createdAt = getDate('default', page.createdAt.toUTCString());
      page.updatedAt = getDate('default', page.updatedAt.toUTCString());
      updateConvertedContent = oldContent !== newPage.content;
      status = true;
      loadAllPages();
      updateCache(page, false, updateConvertedContent);
    }
  } catch (e) {
    console.error(e);
    message = e.message;
  }

  // If we update the page notice, we should update sth to make it on index page.
  if (link.toString() === 'notice') {
    loadNoticeContent(req.app).then();
  }
  res.json({ status, message });
}

async function delete_(req, res, next) {
  req.app.locals.sitemap = undefined;
  const id = req.params.id;

  let status = false;
  let message = 'ok';
  try {
    let rows = await Page.destroy({ where: { id } });
    status = rows === 1;
  } catch (e) {
    message = e.message;
  }
  deleteCacheEntry(id);
  await loadAllPages();

  res.json({ status, message });
}

module.exports = {
  search,
  create,
  getAll,
  export_,
  get,
  getRenderedPage,
  update,
  delete_,
  submitUrlToBaidu,
  getAllTest,
};
