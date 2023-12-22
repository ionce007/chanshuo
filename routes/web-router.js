const express = require('express');
const router = express.Router();

const index = require('../controllers/index');
const formula = require('../controllers/formula');
const hotstock = require('../controllers/hotstock');
const blog = require('../controllers/blogarticle');

router.get('/', index.getIndex);
router.get('/archive', index.getArchive);
router.get('/about', index.getAboutMe);
router.get('/donate', index.getDonate);
router.get('/archive/:year/:month', index.getMonthArchive);
router.get('/formula', formula.getFormula);
router.get('/preview', formula.showPreviewPage);
router.get('/hotstock', hotstock.showHotStock);

router.get('/chanshuo', blog.showChanShuo);
router.post('/chanshuo/list', blog.blogList);
router.post('/chanshuo/article', blog.blogArticle);
//router.get('/chanshuo/list', blog.getBlogList);
router.get('/chanshuo/article', blog.getBlogArticle);

router.get('/sitemap.xml', index.getSitemap);
router.get('/tag/:tag', index.getTag);
router.get('/page/:link', index.getPage);
router.get(/static\/.*/, index.getStaticFile);

module.exports = router;
