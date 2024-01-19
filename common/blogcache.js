const LRU = require('lru-cache');
const { CSArticle, CSCategory } = require('../models');
const config = require('../config');
const BLOG_CACHE_KEY = 'blogs';

const options = {
    max: config.maxCachePosts,
    allowStale: true,
    updateAgeOnGet: true,
    updateAgeOnHas: false,
};
const cache = new LRU(options);

async function getAllBlogs() {
    try {
        console.log('getAllBlogs starting......')
        let blogs = await CSArticle.findAndCountAll({
            //attributes: { exclude: ['content'] },
            include: CSCategory,
            order: [['issuedate', 'ASC'], ['updatedAt', 'DESC']], raw: true
        });
        return blogs;
    }
    catch (error) {
        console.log(`blogCache.getAllBlogs error：${error.message}`);
        return undefined;
    }
}
async function getAllBlogsTitle() {
    try {
        let blogs = await CSArticle.findAndCountAll({
            attributes: { exclude: ['content'] },
            include: CSCategory,
            order: [['issuedate', 'ASC'], ['updatedAt', 'DESC']], raw: true
        });
        return blogs;
    }
    catch (error) {
        console.log(`blogCache.getAllBlogsTitle error：${error.message}`);
        return undefined;
    }
}
async function updateBlogs() {
    try {
        let blogs = await getAllBlogs();
        var data = { total: blogs.count, blogs: blogs.rows };
        if (cache.has(BLOG_CACHE_KEY)) delete (BLOG_CACHE_KEY)
        cache.set(BLOG_CACHE_KEY, data);
        return data;
    }
    catch (error) {
        console.log('Failed to updateBlogs！error:' + error.message);
    }
}
async function updateBlogCache() {
    try {
        if (cache.has(BLOG_CACHE_KEY)) {
            cache.delete(BLOG_CACHE_KEY);
            console.log('Blog cache is deleted : ', !cache.has(BLOG_CACHE_KEY))
        }
        let blogs = await loadAllBlogs();
        return blogs;
    }
    catch (error) {
        console.log('Failed to load all blog articles！error:' + error.message);
        return undefined;
    }
}
async function loadAllBlogs() {
    try {
        if (cache.has(BLOG_CACHE_KEY)) {
            let blogs = cache.get(BLOG_CACHE_KEY);
            if (!blogs || blogs.length === 0) {
                console.log('get all blogs from database - starting!')
                blogs = await getAllBlogs();
                var data = { total: blogs.count, blogs: blogs.rows };
                cache.delete(BLOG_CACHE_KEY);
                cache.set(BLOG_CACHE_KEY, data);
                console.log('get all blogs from database - refresh!')
                return data;
            }
            else {  console.log('get all blogs from cache!');return blogs; }
        }
        else {
            let blogs = await getAllBlogs();
            var data = { total: blogs.count, blogs: blogs.rows };
            if (cache.has(BLOG_CACHE_KEY)) cache.delete(BLOG_CACHE_KEY);
            cache.set(BLOG_CACHE_KEY, data);
            console.log('get all blogs from database!')
            return data;
        }
    } catch (e) {
        console.log('Failed to load all blog articles！error:' + e.message);
        return undefined;
    }
}

module.exports = {
    loadAllBlogs,
    updateBlogCache,
    getAllBlogs,
    getAllBlogsTitle,
}