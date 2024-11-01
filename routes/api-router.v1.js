const express = require('express');
const router = express.Router();
const index = require('../controllers/index');
const page = require('../controllers/page');

const { userRequired, adminRequired, tokenAuth } = require('../middlewares/api-auth');
const { upload } = require('../middlewares/upload');
const { uploadDB } = require('../middlewares/uploaddb');
//const UploadBigFile  = require("../middlewares/uploadBigFile");

const accessToken = require('../controllers/accesstoken');
const formula = require('../controllers/formula');

const blogarticle = require('../controllers/blogarticle');

const user = require('../controllers/user');
const option = require('../controllers/option');
const file = require('../controllers/file');
const hotstock = require('../controllers/hotstock');
const wxhelper = require('../controllers/wxhelper');
const qywx = require('../controllers/qywx');
const qywxProvider = require('../controllers/qywxProvider');
const GN = require('../controllers/stockGN');

router.post('/page/search', userRequired, page.search);
router.post('/page', tokenAuth, userRequired, page.create);
router.post('/builder', userRequired, page.submitUrlToBaidu);
router.get('/page', userRequired, page.getAll);
router.get('/page_test', page.getAllTest);
router.get('/page/export/:id', userRequired, page.export_);
router.get('/page/render/:id', page.getRenderedPage);
router.get('/page/:id', userRequired, page.get);
router.put('/page', userRequired, page.update);
router.delete('/page/:id', userRequired, page.delete_);


router.get('/accesstoken/get', accessToken.getAccessToken);
router.post('/formula', userRequired, formula.getAllFormulas);
router.get('/formula', formula.getFormulaData);
router.post('/formula/search', userRequired, formula.search);
router.put('/formula', userRequired, formula.updaueFormula);
router.post('/formula/async', userRequired, formula.panSynchronize);
router.delete('/formula/:fs_id', userRequired, formula.deleteFormula);
router.get('/preview', formula.previewDoc);
router.get('/download', formula.downloadDoc);
router.post('/iwc_hotstock', hotstock.getWenCaiHotStock);
router.get('/dfcf_hotstock', hotstock.getEastMoneyHotStock);
router.get('/tgb_hotstock', hotstock.getTaogubaHotStock);

router.get('/gn/:code',GN.getStockGN);
router.post('/crawlerGN',GN.crawlerGN);
router.post('/component',GN.componentStock);
router.get('/gnpages',GN.getGNPages);
router.get('/gncomponents',GN.getComponents);
router.post('/crawlerComponent',GN.crawlerComponent);
router.get('/partial',GN.getPartial);
router.post('/crawlerAllConcept',GN.crawlerAllConcept);
router.post('/dailygn',GN.getDailyStockNewGN);
router.post('/conceptAlter',GN.conceptAlter);
//router.get('/components',GN.componentChange);

router.get('/bdpan_auth', adminRequired, accessToken.bdPanAuthPage);
router.get('/bdauth_code', adminRequired, accessToken.getBaiduAuthCode);

router.get('/blog/category', userRequired, blogarticle.getCategory);
router.get('/blog/catelist', userRequired, blogarticle.getCategoryList);
router.post('/blog', userRequired, blogarticle.Create);
router.get('/blog/list', blogarticle.blogArcticleList);
router.get('/blog/datelist', blogarticle.getMonthBlog);
router.get('/pagetag', index.getTagData);
router.get('/pagelist', index.getPageList);
router.get('/stream', index.readEventStream);

router.get('/blog/test', blogarticle.testCache);
router.put('/blog', userRequired, blogarticle.Update);
router.post('/blog/search', userRequired, blogarticle.search);
router.get('/blog/:id', userRequired, blogarticle.getArticle);
router.delete('/blog/:id', userRequired, blogarticle.deleteArticle);
router.post('/cate/search', userRequired, blogarticle.searchCategory);
router.post('/cate', userRequired, blogarticle.categoryCreate);
router.put('/cate', userRequired, blogarticle.categoryUpdate);
router.delete('/cate/:id', userRequired, blogarticle.deleteCategory);
router.get('/cate/:cid', userRequired, blogarticle.getCate);

router.post('/user/login', user.login);
router.get('/user/logout', user.logout);
router.get('/user/status', userRequired, user.status);
router.post('/user/refresh_token', userRequired, user.refreshToken);
router.put('/user', adminRequired, user.update);
router.get('/user', adminRequired, user.getAll);
router.get('/user/:id', adminRequired, user.get);
router.post('/user', adminRequired, user.create);
router.delete('/user/:id', adminRequired, user.delete_);

router.get('/option', adminRequired, option.getAll);
router.get('/option/backupdb', adminRequired, option.backupDatabase);
//router.post('/option/uploaddb', adminRequired, option.uploadDatabase);
router.post('/option/uploaddb', adminRequired, uploadDB.single('file'), option.uploadDatabase);
router.get('/option/shutdown', adminRequired, option.shutdown);
router.get('/option/:name', adminRequired, option.get);
router.put('/option', adminRequired, option.update);
router.post('/option/resetCache', adminRequired, option.resetCache);
router.get('/zhipuauth', option.zhipuAuth);
router.post('/refreshZhipuToken', option.refreshZhipuToken);

router.get('/file', adminRequired, file.getAll);
router.post('/file', adminRequired, upload.single('file'), file.upload);
router.get('/file/:id', adminRequired, file.get);
router.delete('/file/:id', adminRequired, file.delete_);
router.post('/file/search', adminRequired, file.search);

router.get('/wxmsg', wxhelper.wechatAuth);
router.get('/qywxmsg', wxhelper.qyWechatAuth);
router.get('/qywx_token', wxhelper.qywxGetAccessTokenApi);
router.get('/qywxcb', qywx.qywx_callback);
router.post('/qywxcb', qywx.qywx_callback);
router.get('/qywx_provider', qywxProvider.qywx_callback);
router.post('/qywx_provider', qywxProvider.qywx_callback);


/*
const uploadBigFile = new UploadBigFile();
router.get('/bigfile/verify', adminRequired, uploadBigFile.handleVerifyUpload);
router.post('/bigfile', adminRequired, uploadBigFile.handleFormData);
router.post('/bigfile/', adminRequired, uploadBigFile.handleFormData);
router.post('/bigfile/merge', adminRequired, uploadBigFile.handleMerge);
router.post('/bigfile/delete', adminRequired, uploadBigFile.deleteFiles);
*/
module.exports = router;
