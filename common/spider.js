const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const {  CSCategory , CSArticle } = require('../models');
const request = require('sync-request');
const cheerio  = require('cheerio');
const crypto = require('crypto');
const { dateFormat } = require('./util');
const sequelize = require('./database');

const host = 'http://192.168.1.7:8009';

async function spiderBlog(){
    try{
        var ret = request('GET', host);
        var body = ret.getBody('utf8');
        const $ = cheerio.load(body);
        var dropdown = $('nav').find('.navbar__inner').find('.navbar__items').find('div.dropdown').find('ul.dropdown__menu').find('li').find('a');
        const aTags = $('a.dropdown__link');
        var index = 1;
        for await (const a of aTags){
            var title = $(a).text();
            const href = $(a).attr('href');
            var uuid = crypto.randomUUID();
            var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
            var parent = $(a).parent().parent().prev().text();
            const cate = { id: uuid, title: title, parent: parent, isEnable: 1, iorder: index ,href: href, createdAt: date, updatedAt: date };
            await saveCategoryAndSpiderArticle(cate);
            index++;
        }
        //const cat = await CSCategory.bulkCreate(category);
    }catch(e){
        console.log(e.message);
    }
}
async function saveCategoryAndSpiderArticle(cat){
    try{
        CSCategory.create(cat, {raw:true}).then(async (ret) => {
            var d = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${d}  爬取并保存博文类别“${ret.dataValues.title}”成功......`);
            await spiderArticleList(ret.dataValues);
        }).catch((error) => {
            console.log(error.message);
        });
    }catch(e){
        console.log('saveCategoryAndSpiderArticle', e.message);
    }
}
async function spiderArticleList(cate){
    try{
        const cid = cate.cid;
        const catUrl = host + cate.href;
        var ret = request('GET', catUrl);
        var body = ret.getBody('utf8');
        const $ = cheerio.load(body);
        const ellist = $('.menu').find('ul.theme-doc-sidebar-menu').find('li').find('a');
        const list = ellist.map( (i, el) =>  {  return { href:$(el).attr('href'),title:$(el).text() } });
        await spiderArticleAndSave(list, cate);
    }catch(e){
        console.log('spiderArticleList', e.message);
    }
}
async function spiderArticleAndSave(list, cate){
    try{
        let articleList = [];
        var d = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${d}  Start：准备爬取“${cate.title}”下博文共 ${list.length} 篇......`);
        for await (const a of list){
            const artUrl = host + a.href;
            var ret = request('GET', artUrl);
            var body = ret.getBody('utf8');
            const $ = cheerio.load(body);
            const title = $('.theme-doc-markdown').find('h1').text().trim();
            
            const issueTime = a.title.substring(a.title.lastIndexOf('(')+1, a.title.lastIndexOf(')'));//  $('.theme-doc-markdown').find('blockquote').find('p');
            const issue = formatIssueDateTime(issueTime);
            const content = $('article').html();
            const id = crypto.randomUUID();
            var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
            let article = {id:id, title:title,  content:content, cid:cate.cid, issuedate:issue, isEnable:1, href:a.href, updatedAt:date, createdAt:date };
            articleList.push(article);
            d = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${d}  第 ${articleList.length} 篇 / 共 ${list.length} 篇，获取“${cate.title}”下博文“${title}”......`);
        }
        CSArticle.bulkCreate(articleList)
        d = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${d}  End：爬取“${cate.title}”下博文共 ${articleList.length} 篇`);
    }
    catch(e){
        console.log('spiderArticleAndSave', e.message);
    }
}
function formatIssueDateTime(date){
    if(isNaN(date) && !isNaN(Date.parse(date))){
        return dateFormat((new Date(Date.parse(date))),'yyyy-MM-dd HH:mm.ss');
    }
    else return '';
}
async function updateIssueDate(){
    const list = await CSArticle.findAll({where:{ issuedate: '' }, raw:true });
    var count = 1;
    for await (var art of list){
        const url = host + art.href;
        var ret = request('GET', url);
        var body = ret.getBody('utf8');
        const $ = cheerio.load(body);
        const title = $('.menu__link--active').text().trim();
        const date = title.substring(title.lastIndexOf('(')+1,title.lastIndexOf(')'));
        var issue = formatIssueDateTime(date);
        await CSArticle.update({issuedate:issue},{ where:{id:art.id} });
        console.log(`修改第 ${count++} 条: “${art.title}”` );
    }
}
async function spiderOthers(){
    var href = host + '/others/yinfujing';
    var simu_cid = crypto.randomUUID();
    var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
    var cate = {cid:simu_cid, title:'其他博文', parent:'', isEnable:1, iorder:17, href:href, created:date, updatedAt:date};
    await CSCategory.create(cate);
    console.log('创建新类别：“${cate.title}” ......')

    var d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  Start：准备爬取“${cate.title}”下博文......`);
     var ret = request('GET', href);
    var body = ret.getBody('utf8');
    var $ = cheerio.load(body);
    var items = $('ul.menu__list').find('li.theme-doc-sidebar-item-link-level-1').find('a');
    var artList = [];
    console.log(`${d}  Start：开始爬取“${cate.title}”下博文共 ${items.length} 篇......`);
    var count = 1;
    for await (var a of items){
        var title = $(a).text();
        var href = $(a).attr('href');
        var art = await getArticle(title, href, simu_cid);
        artList.push(art);
        console.log(`获取第 ${count++} 篇: “${art.title}” ......` );
    }
    CSArticle.bulkCreate(artList);
    d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  End：爬取“${cate.title}”下博文共 ${artList.length} 篇`);


    simu_cid = crypto.randomUUID();
    date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
    cate = {cid:simu_cid, title:'重返兜率天：禅定坐禅实践概论', parent:'其他博文', isEnable:1, iorder:18, href:href, created:date, updatedAt:date};
    await CSCategory.create(cate);
    console.log('创建新类别：“${cate.title}” ......')

    d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  Start：准备爬取“${cate.title}”下博文......`);
    href = host + '/others/yinfujing';
    ret = request('GET', href);
    body = ret.getBody('utf8');
    $ = cheerio.load(body);
    items = $('ul.menu__list').find('li.theme-doc-sidebar-item-link-level-2').find('a');
    artList = [];
    console.log(`${d}  Start：开始爬取“${cate.title}”下博文共 ${items.length} 篇......`);
    var count = 1;
    for await (var a of items){
        var title = $(a).text();
        var href = $(a).attr('href');
        var art = await getArticle(title, href, simu_cid);
        artList.push(art);
        console.log(`获取第 ${count++} 篇: “${art.title}” ......` );
    }
    CSArticle.bulkCreate(artList);
    d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  End：爬取“${cate.title}”下博文共 ${artList.length} 篇`);
}
async function spiderSimuJianghu(){
    var href = host + '/identity/simujianghu';
    const simu_cid = crypto.randomUUID();
    var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
    var cate = {cid:simu_cid, title:'緾师其人：私募江湖', parent:'', isEnable:1, iorder:16, href:href, created:date, updatedAt:date};
    await CSCategory.create(cate);
    console.log('创建新类别：“${cate.title}” ......')

    var d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  Start：准备爬取“${cate.title}”下博文......`);
    var ret = request('GET', href);
    var body = ret.getBody('utf8');
    const $ = cheerio.load(body);
    const items = $('ul.menu__list').find('li.menu__list-item').find('a');
    var artList = [];
    console.log(`${d}  Start：开始爬取“${cate.title}”下博文共 ${items.length} 篇......`);
    var count = 1;
    for await (var a of items){
        var title = $(a).text();
        var href = $(a).attr('href');
        var art = await getArticle(title, href, simu_cid);
        artList.push(art);
        console.log(`获取第 ${count++} 篇: “${art.title}” ......` );
    }
    CSArticle.bulkCreate(artList);
    d = dateFormat((new Date()),'HH:mm:ss')
    console.log(`${d}  End：爬取“${cate.title}”下博文共 ${artList.length} 篇`);
}
async function getArticle(title, href, cid){
    var ret = request('GET', host + href);
    var body = ret.getBody('utf8');
    const $ = cheerio.load(body);
    const content = $('article').html();
    const id = crypto.randomUUID();
    var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
    let article = {id:id, title:title, content:content, cid:cid, issuedate:'', isEnable:1, href:href, updatedAt:date, createdAt:date };
    return article;
}
async function imgToDataURL(imgUrl){

}
async function updateImage2Base64(){
    const MIME_TYPES = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
    };
    try{
        let articles = await CSArticle.findAll({where:{ isEnable:{ [Op.eq]: 1 }, content:{ [Op.like]: `%<img %`} }})
        var fs = require('fs');
        for await(var item of articles){
            var time = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${time}: 获取“${item.title}”图片......`);
            let content = item.content;
            const $ = cheerio.load(item.content);
            var imgs = $('img');
            for await(var img of imgs ){
                var imgDom = $(img);
                var imgUrl = $(imgDom).attr('src');
                var url = host + imgUrl;
                var mineType = imgUrl.substring(imgUrl.lastIndexOf('.') + 1 );
                var type = MIME_TYPES[mineType]
                
                var ret = request('GET', url);
                //console.log('ret = ',ret)
                var base64Str = ret.body.toString('base64');

                var dataUri = `data:${type};base64,${base64Str}`;
                content = content.replace(imgUrl, dataUri);
            }
            time = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${time}: 完成“${item.title}”格式转换，更新数据库......`);
            CSArticle.update({ content:content }, { where: { id: item.id } });
            console.log(`${time}: “${item.title}”图片格式转换成功......`);
        }
        /*time = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${time}: 进行批量数据更新......`);
        let updateArt = articles.map( (item) => { return {id:item.id, content:item.content} });
        CSArticle.bulkCreate(updateArt);
        time = dateFormat((new Date()),'HH:mm:ss')*/
        console.log(`${time}: 数据更新完成......`);
    }
    catch(e){
        var time = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${time}: spider.updateImage2Base64`,e.message);
    }
}
async function restoreImageUrl(){
    try{
        var time = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${time}: 获取所有包含图片的博文......`);
        let articles = await CSArticle.findAll({where:{ isEnable:{ [Op.eq]: 1 }, content:{ [Op.like]: `%<img %`} }})
        for await(var item of articles){
            time = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${time}: 获取“${item.title}”网址......`);
            let article_url = item.href;
            let url = host + article_url;
            var ret = request('GET', url);
            var body = ret.getBody('utf8');
            const $ = cheerio.load(body);
            const content = $('article').html();
            
            time = dateFormat((new Date()),'HH:mm:ss')
            console.log(`${time}: 完成“${item.title}”格式转换，更新数据库......`);
            CSArticle.update({ content:content }, { where: { id: item.id } });
            console.log(`${time}: “${item.title}”图片格式转换成功......`);
        }
        console.log(`${time}: 数据更新完成......`);
    }
    catch(e){
        var time = dateFormat((new Date()),'HH:mm:ss')
        console.log(`${time}: spider.updateImage2Base64`,e.message);
    }
}
(async () => {
    /*
    await sequelize.sync();
    await spiderBlog();
    await spiderSimuJianghu();
    await spiderOthers();
    */
    //await updateIssueDate();
    //updateImage2Base64();
    restoreImageUrl();

})();
  
