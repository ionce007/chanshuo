const sequelize = require('sequelize');
const { Op } = require('sequelize');
const crypto = require('crypto');
const blogcache = require('../common/blogcache');
const { CSArticle, CSCategory } = require('../models');

async function getCategory(req, res, next) {
    var json = {};
    const cid = req.query.cid;
    if (!cid || cid.trim() === '') {
        json = { code: -2, status: 'failed', msg: '参数错误！', data: null };
        res.send(json); return;
    }
    try {
        const category = await CSCategory.findOne({ where: { cid: cid }, raw: true });
        if (!category) json = { code: -3, status: 'failed', msg: '数据不存在', data: null };
        else json = { code: 1, status: 'successed', msg: 'ok', data: category };
        res.send(json);
    }
    catch (e) {
        json = { code: -1, status: 'failed', msg: e.message, data: null };
        res.send(json);
    }
}
async function getCategoryList(req, res, next) {
    var json = {};
    try {
        const list = await CSCategory.findAll({ order: [['iorder', 'ASC']], raw: true });
        if (!list) json = { code: -3, status: 'failed', msg: '数据不存在', data: null };
        else json = { code: 1, status: 'successed', msg: 'ok', total: list.length, data: list };
        res.send(json);
    }
    catch (e) {
        json = { code: -1, status: 'failed', msg: e.message, data: null };
        res.send(json);
    }
}
async function search(req, res, next) {
    
    var type = req.body.type;
    if (type === undefined || type === '全部') type = '';

    let keyword = req.body.keyword;
    keyword = keyword ? keyword.trim() : '';
    let pageIndex = req.body.pageIndex || 1;
    let pageSize = req.body.pageSize || 10;
    let articles = [];
    let message = 'ok';
    let status = true;
    let total = 0;
    try {
        let all = await blogcache.loadAllBlogs();
        let blogs = all.blogs;
        if (type.length > 0) blogs = blogs.filter((item) => {return item.cid === type});
        if (keyword.length > 0) blogs = blogs.filter((item) => { return item.title.indexOf(keyword)>=0 || item.content.indexOf(keyword)>=0 });
        total = all.total;
        pageIndex = Number(pageIndex);
        pageSize = Number(pageSize);
        articles = [];
        let startIndex = (pageIndex - 1) * pageSize;
        articles = blogs.slice(startIndex, startIndex + pageSize);
    } catch (e) {
        status = false;
        message = e.message;
        console.error(e);
    }
    res.json({ status, message, total, articles });

    /*
        let articles =[];
        let message = 'ok';
        let status = true;
        let total = 0;
        try {
            const data = await blogcache.loadAllBlogs();
            var blogs = data.blogs;
            var type = req.body.type;
            if (type === undefined || type === '全部') type = '';
    
            if (type.length > 0) blogs = blogs.filter((item) => { return item.cid === type });
    
            let keyword = req.body.keyword;
            keyword = keyword ? keyword.trim() : '';
            if (keyword.length > 0) blogs = blogs.filter((item) => { return item.title.indexOf(keyword) >= 0 || item.content.indexOf(keyword) >= 0; })
            total = blogs.length;
            let pageIndex = req.body.pageIndex || 1;
            let pageSize = req.body.pageSize || 10;
            let startIndex = (pageIndex - 1) * pageSize;
            articles = blogs.slice(startIndex, startIndex + pageSize);
        }
        catch (e) {
            status = false;
            message = e.message;
            console.error(e);
        }
        res.json({ status, message, total, articles });
    */


        
/*    var type = req.body.type;
    if (type === undefined || type === '全部') type = '';

    let keyword = req.body.keyword;
    keyword = keyword ? keyword.trim() : '';
    let pageIndex = req.body.pageIndex || 1;
    let pageSize = req.body.pageSize || 10;
    let articles = [];
    let message = 'ok';
    let status = true;
    let total = 0;
    let where = {};
    if (keyword.length > 0) where = { [Op.or]: [{ title: { [Op.like]: `%${keyword}%` } }, { content: { [Op.like]: `%${keyword}%` } }] }
    if (type.length > 0) {
        where = { [Op.and]: [{ cid: { [Op.eq]: type } }, { [Op.or]: [{ title: { [Op.like]: `%${keyword}%` } }, { content: { [Op.like]: `%${keyword}%` } }] }] }
    }
    try {
        let all = await CSArticle.findAll({ where: where, attributes: { exclude: ['content'] }, include: CSCategory, order: [sequelize.literal('"issuedate" DESC')] });
        total = all.length;
        let startIndex = (pageIndex - 1) * pageSize;
        articles = all.slice(startIndex, startIndex + pageSize);
    } catch (e) {
        status = false;
        message = e.message;
        console.error(e);
    }
    res.json({ status, message, total, articles });*/
}
async function getArticle(req, res, next) {
    const id = req.params.id;
    let article;
    let status = false;
    let message = 'ok';
    try {
        article = await CSArticle.findOne({ where: { id: id }, raw: true });
        status = article !== null;
    } catch (e) {
        message = e.message;
    }
    res.json({ status, message, article });
}
async function testCache(req, res, next) {
    try {
        const blogs = await blogcache.loadAllBlogs();
        res.json({ status: true, msg: 'success', data: blogs });
    }
    catch (error) {
        res.json({ status: false, msg: 'failed', data: null });
    }
}
async function Create(req, res, next) {
    const id = crypto.randomUUID();
    let title = req.body.title;
    let content = req.body.content;
    let cid = req.body.cid;
    let issuedate = req.body.issuedate;
    const isEnable = req.body.isEnable;
    let href = req.body.href;
    let link = req.body.link;

    if (!title.trim() || !content.trim() || !cid.trim()) {
        return res.json({ status: false, message: '无效的参数' });
    }
    let message = 'ok';
    let article = undefined;
    try {
        article = await CSArticle.create({ id, title, content, cid, issuedate, isEnable, href, link });
    } catch (e) {
        message = e.message;
    }
    await blogcache.updateBlogCache();
    res.json({ status: article !== undefined, message });
}
async function Update(req, res, next) {
    const id = req.body.id;
    let title = req.body.title;
    let content = req.body.content;
    let cid = req.body.cid;
    let issuedate = req.body.issuedate;
    const isEnable = req.body.isEnable;
    let href = req.body.href;
    let link = req.body.link;

    if (!title.trim() || !content.trim() || !cid.trim()) {
        return res.json({ status: false, message: '无效的参数' });
    }
    let message = 'ok';
    let newArticle = { title, content, cid, issuedate, isEnable, href, link };
    let status = false;
    try {
        let article = await CSArticle.findOne({ where: { id: id } });
        if (article) {
            await CSArticle.update(newArticle, { where: { id: id } });
        }
        status = article !== null;
        //await blogcache.updateBlogCache();
    } catch (e) {
        message = e.message;
        console.error(e);
    }
    res.json({ status, message });
}
async function deleteArticle(req, res, next) {
    const id = req.params.id;
    let status = false;
    let message = 'ok';
    try {
        let rows = await CSArticle.destroy({ where: { id } });
        status = rows === 1;
    } catch (e) {
        message = e.message;
    }
    res.json({ status, message });
}
async function searchCategory(req, res, next) {

    let keyword = req.body.keyword;
    keyword = keyword ? keyword.trim() : '';
    let pageIndex = req.body.pageIndex || 1;
    let pageSize = req.body.pageSize || 10;
    let categories = [];
    let message = 'ok';
    let status = true;
    let total = 0;
    let where = {};
    if (keyword.length > 0) where = { title: { [Op.like]: `%${keyword}%` } }

    try {
        let all = await CSCategory.findAll({ where: where, order: [sequelize.literal('"iorder" ASC')] });
        total = all.length;
        let startIndex = (pageIndex - 1) * pageSize;
        categories = all.slice(startIndex, startIndex + pageSize);
    } catch (e) {
        status = false;
        message = e.message;
        console.error(e);
    }
    res.json({ status, message, total, categories });
}
async function categoryCreate(req, res, next) {
    const cid = crypto.randomUUID();
    let title = req.body.title;
    let parent = req.body.parent;
    let isEnable = req.body.isEnable;
    let iorder = req.body.iorder;
    let href = req.body.href;
    let link = req.body.link;

    if (!title.trim() || !cid.trim()) {
        return res.json({ status: false, message: '无效的参数' });
    }
    let message = 'ok';
    let cate = undefined;
    try {
        cate = await CSCategory.create({ cid, title, parent, isEnable, iorder, href, link });
        //console.log('categoryCreate', cate)
    } catch (e) {
        message = e.message;
        console.log('categoryCreate', e.message)
    }
    res.json({ status: cate !== undefined, message });
}
async function categoryUpdate(req, res, next) {
    let cid = req.body.cid;
    let title = req.body.title;
    let parent = req.body.content;
    let isEnable = req.body.isEnable;
    let iorder = req.body.iorder;
    let href = req.body.href;
    let link = req.body.link;

    if (!title.trim() || !cid.trim()) {
        return res.json({ status: false, message: '无效的参数' });
    }
    let message = 'ok';
    let newCate = { title, parent, isEnable, iorder, href, link };
    let status = false;
    try {
        let cate = await CSCategory.findOne({ where: { cid: cid } });
        if (cate) {
            await CSCategory.update(newCate, { where: { cid: cid } });
        }
        status = cate !== null;
    } catch (e) {
        message = e.message;
        console.error(e);
    }
    res.json({ status, message });
}
async function deleteCategory(req, res, next) {
    const id = req.params.id;
    let status = false;
    let message = 'ok';
    try {
        let rows = await CSCategory.destroy({ where: { cid: id } });
        status = rows === 1;
    } catch (e) {
        message = e.message;
    }
    res.json({ status, message });
}
async function getCate(req, res, next) {
    const id = req.params.cid;

    let category;
    let status = false;
    let message = 'ok';
    try {
        category = await CSCategory.findOne({ where: { cid: id }, raw: true });
        //console.log('getCate', category);
        status = category !== null;
    } catch (e) {
        message = e.message;
    }
    res.json({ status, message, category });
}
async function getArticleCategories() {
    let data = [];
    try {
        //CSCategory.hasMany(CSArticle, {foreignKey: 'cid'});
        //CSArticle.belongsTo(CSCategory, {foreignKey: 'cid'});
        //let parents = await CSCategory.findAll({ group: 'parent', order: [['iorder', 'ASC']], raw: true });
        let parents = await CSCategory.findAll({ group: 'parent', attributes: ['parent'], raw: true });
        let categories = await CSCategory.findAll({ where: { isEnable: 1 }, raw: true, order: [['iorder', 'ASC']] });
        for (var item of parents) {
            let label = item.parent;
            const cates = categories.filter((cat) => { return cat.parent === label });
            const value = { label: label, categories: cates };
            data.push(value);
        }
    }
    catch (e) {
        data = [];
        console.log(e.message);
    }
    return data;
}
async function showChanShuo(req, res, next) {
    let json = { status: true, msg: 'ok', author: {}, data: null }
    try {

        let author = await CSArticle.findAll({ where: { link: 'author' }, raw: true });
        json.author = author ? author[0] : {};
        let data = await getArticleCategories();
        json.data = data;
    }
    catch (e) {
        json.status = false;
        json.msg = e.message;
    }
    res.render('chanshuo', json);
}
async function blogList(req, res, next) {

    let cid = req.body.cID;
    let pageIndex1 = req.body.pageIndex || 1;
    let pageIndex = Number(pageIndex1);
    if (!pageIndex || pageIndex <= 1) pageIndex = 1;
    let pageSize1 = req.body.pageSize || 15;
    let pageSize = Number(pageSize1);
    if (!pageSize) pageSize = 15;
    let json = { status: true, msg: 'ok', cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    if (!cid) {
        let json = { status: false, msg: '参数错误！', cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
        res.render('blogList', json);
        return;
    }
    try {
        let catData = await getArticleCategories()
        json.cid = cid;
        json.catData = catData;
        let data = await blogcache.loadAllBlogs();
        let blogs = data.blogs.filter((item) => { /*console.log('item: ',item);*/ return item.cid === cid && item.isEnable === true });
        //let data = await blogcache.getAllBlogsTitle();
        //let blogs = data.rows.filter((item) => { return item.cid === cid && item.isEnable === 1 });
        pageIndex = Number(pageIndex);
        pageSize = Number(pageSize);
        let startIndex = (pageIndex - 1) * pageSize;
        const artData = blogs.slice(startIndex, startIndex + pageSize);
        json.artData = artData;
        json.total = blogs.length;
        json.curPage = pageIndex;
        json.pageSize = pageSize;
    }
    catch (e) {
        console.log('error:',e.message);
        let json = { status: false, msg: e.message, cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    }
    res.render('blogList', json);

/*
    let cid = req.body.cID;
    let pageIndex = req.body.pageIndex || 1;
    if (!pageIndex || pageIndex <= 1) pageIndex = 1;
    let pageSize = req.body.pageSize || 15;
    if (!pageSize) pageSize = 15;
    let json = { status: true, msg: 'ok', cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    if (!cid) {
        let json = { status: false, msg: '参数错误！', cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
        res.render('blogList', json);
        return;
    }
    try {
        let catData = await getArticleCategories()
        json.cid = cid;
        json.catData = catData;
        let artData = await CSArticle.findAndCountAll({
            where: { 'isEnable': 1, 'cid': cid },
            attributes: ['id', 'title', 'issuedate'],
            order: [['issuedate', 'ASC']],
            limit: pageSize,
            offset: pageSize * (pageIndex - 1),
            raw: true,
        })
        json.artData = artData.rows;
        json.total = artData.count;
        json.curPage = pageIndex;
        json.pageSize = pageSize;
    }
    catch (e) {
        let json = { status: false, msg: e.message, cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    }
    res.render('blogList', json);
    */
}
async function getBlogList(req, res, next) {
    let cid = req.query.id;
    let pageIndex = req.query.pageIndex || 1;
    if (!pageIndex || pageIndex <= 1) pageIndex = 1;
    let pageSize = req.query.pageSize || 15;
    if (!pageSize) pageSize = 15;
    let json = { status: true, msg: 'ok', cid: req.query.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    if (!cid) {
        let json = { status: false, msg: '参数错误！', cid: req.query.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
        res.render('blogList', json);
        return;
    }
    try {
        let catData = await getArticleCategories()
        json.cid = cid;
        json.catData = catData;
        let artData = await CSArticle.findAndCountAll({
            where: { 'isEnable': 1, 'cid': cid },
            attributes: ['id', 'title', 'issuedate'],
            order: [['issuedate', 'ASC']],
            limit: pageSize,
            offset: pageSize * (pageIndex - 1),
            raw: true,
        })
        json.artData = artData.rows;
        json.total = artData.count;
        json.curPage = pageIndex;
        json.pageSize = pageSize;
    }
    catch (e) {
        let json = { status: false, msg: e.message, cid: req.body.cID, catData: [], total: 0, artData: [], curPage: pageIndex, pageSize: pageSize }
    }
    res.render('blogList', json);
}
async function blogArticle(req, res, next) {
    let cid = req.body.cID;
    let id = req.body.artID;
    let json = { status: true, msg: 'ok', cid: cid, article: {}, data: null }
    try {

        let article = await CSArticle.findOne({ where: { id: id }, raw: true });
        json.article = article ? article : {};
        let data = await getArticleCategories();
        json.data = data;
    }
    catch (e) {
        json.status = false;
        json.msg = e.message;
    }
    res.render('blogShow', json);
}
async function getBlogArticle(req, res, next) {
    let cid = '';
    let id = req.query.id;
    //console.log('req.query.id：', req.query.id);
    let json = { status: true, msg: 'ok', cid: cid, article: {}, data: null }
    try {

        let article = await CSArticle.findOne({ where: { id: id }, raw: true });
        json.article = article ? article : {};
        json.cid = article.cid;
        let data = await getArticleCategories();
        json.data = data;
    }
    catch (e) {
        json.status = false;
        json.msg = e.message;
    }
    res.render('blogShow', json);
}
module.exports = {
    getCategory,
    getCategoryList,
    search,
    getArticle,
    Create,
    Update,
    deleteArticle,
    searchCategory,
    categoryCreate,
    categoryUpdate,
    deleteCategory,
    getCate,
    showChanShuo,
    blogList,
    blogArticle,
    getBlogArticle,
    getBlogList,
    testCache,
}