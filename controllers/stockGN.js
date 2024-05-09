const request = require('sync-request');
const { THSNewGN, THSgnComponent, THSgnChange} = require('../models');
const util = require('../common/util');
const Sequelize = require('sequelize');
const { Op } = require('sequelize');
const cheerio = require('cheerio');
const crypto = require('crypto');
//const { dateFormat } = require('./util');
const sequelize = require('../common/database');
const iconv = require('iconv-lite');
const { dateFormat } = require('../common/util');

const gnBaseUrl = 'https://q.10jqka.com.cn/gn/index/field/addtime/order/desc/page/【pageIndex】/ajax/1/';

async function showAllNewConcept(req, res, next) {
    var data = { code: 1, state: 'successed!', msg: 'ok', hexinV: 'hexinV' };

    res.render('concept', data);
}
async function conceptAlter(req, res, next){
    try{
        //var pageIndex = req.body.pageIndex;
        //if (!pageIndex) pageIndex = 0;
        var trade_dates = await getTradeDate('hexinV');
        if(trade_dates.code !== 1){
            var data = { code: -1, msg: '未获取到交易日期！', data: [], total: 0, tradeDates: {} };
            res.send(data);
            return;
        }
        var trade_date = req.body.date;
        var dates = trade_dates.data.date_list;
        //console.log('dates = ', dates);
        dates.sort((a,b)=>{ return new Date(b) - new Date(a)})
        if(!trade_date) trade_date = dates[0];
        else if(dates.indexOf(trade_date) < 0) {
            var data = { code: -1, msg: '交易日期不存在！', data: [], total: 0, tradeDates: dates ,date: trade_date };
            res.send(data);
            return;
        }
        var data = await crawlerConceptComponentChange(trade_date);
        var ret 
        if(data.code !== 1) ret = { code: -1, msg: '获取数据出错', data: [], tradeDates: dates,date: trade_date };
        else ret = { code: 1, msg: '获取数据成功', data: data, tradeDates: dates, date: trade_date };
        res.send(ret);
    }
    catch(e){
        console.log('conceptAlter error: ', e.message);
        var data = { code: -1, msg: e.message, data: [], tradeDates: [], date: '' };
        res.send(data);
    }
}
async function componentChange(req, res, next){
    try{
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': "*",
            'Access-Control-Allow-Headers': 'Content-Type,Content-Length,Authorization,Accept,X-Requested-With',
            'Access-Control-Allow-Methods': 'PUT,POST,GET,DELETE,OPTIONS'
        });
        //res.flushHeaders();
        //let hexinV = req.body.hexinV;
        var pageIndex = req.body.pageIndex;
        if (!pageIndex) pageIndex = 1;
        var trade_dates = await getTradeDate('hexinV');
        if(trade_dates.code !== 1){
            var data = { code: -1, state: 'failed!', msg: '未获取到交易日期！', data: [], total: 0, tradeDates: {} };
            res.send(data);
            return;
        }
        for await (var date of trade_dates.data.date_list) {
            //console.log(`date = ${date}`);
            //res.write('event: mymessage\n');
            setTimeout(function(){ 
                //crawlerConceptComponentChange(date); 
                
                //res.write('event: mymessage\n');
                //console.log(`date = ${date}`);
                var date1 = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
                //console.log(`data: The server time is: ${date1}`);
                res.write('event: message! \n');
                res.write('data: The server time is:' + date1 + '\n\n');
                //res.write('\n\n');
                //res.json({aa:11,bb:22});
            },5000);
        }
        var data ={aa:11,bb:22,cc:33};
        //res.send(data);
        res.on('close', () => {
            console.log('res.closed!');
        });
    }
    catch(e){
        console.log('componentChange error: ', e.message);
        var data = { code: -1, state: 'failed!', msg: e.message, data: [], total: 0, tradeDates: {} };
        res.send(data);
    }
}
async function crawlerConceptComponentChange(date){
    try{
        var ts = Date.parse(new Date(date));
        var url = 'https://dq.10jqka.com.cn/fuyao/concept_express/concept_trends/v1/list';
        var pageIndex = 1;
        var paras = {page_num: pageIndex, page_size: 1500, concept: "all", date: ts, tab_type: "all"}
        var reqBody = JSON.stringify(paras);
        var headers = {"accept": "application/json, text/plain, */*", "content-type": "application/json"};

        const options = { headers: headers, body: reqBody };
        var ret = request('POST', url, options);
        var body = ret.getBody("utf-8");

        var json = JSON.parse(body);
        return {code:1, msg:'successed', total:json.data.concept_trends.list_total, data:json.data.concept_trends.list };
    }
    catch(e){
        console.log('crawlerConceptComponentChange error: ', e.message);
        return {code:-1, msg:'faild', total:0, data:[] };
    }
}
async function getTradeDate(hexinV){
    var data;
    try{
        var url = 'https://dq.10jqka.com.cn/fuyao/concept_express/concept_trends/v1/calendar/all';
        var ret = request('GET', url);
        var body = ret.getBody("utf-8");
        var json = JSON.parse(body);
        data = { code: 1, state: 'successed!', msg: '获取全部交易日期成功！', data: json.data};
    }
    catch(e){
        console.log('getTradeDate error: ', e.message);
        data = { code: -1, state: 'failed!', msg: e.message, data: []};
    }
    return data;
}
async function getDailyStockNewGN(req, res, next) {
    try {
        let hexinV = req.body.hexinV;
        //console.log('hexinV = ', hexinV);
        var pageIndex = req.body.pageIndex;
        if (!pageIndex) pageIndex = 1;
        var url = 'https://search.10jqka.com.cn/customized/chart/get-robot-data';

        //var paras = 'block_list=&log_info={"input_type":"click}&page=1&perpage=50&query_area=&question=每日新增概念&rsh=619725316&secondary_intent=&source=Ths_iwencai_Xuangu&version=2.0&add_info={"urp":{"scene":1,"company":1,"business":1},"contentType":"json","searchInfo":true}';
        var paras = {
            "source": "Ths_iwencai_Xuangu",
            "version": "2.0",
            "query_area": "",
            "block_list": "",
            "add_info": '{"urp":{"scene":1,"company":1,"business":1},"contentType":"json","searchInfo":true}',
            "question": "每日新增概念",
            "perpage": 150,
            "page": 5,
            "secondary_intent": "",
            "log_info": '{"input_type":"click"}',
            "rsh": "619725316"
        }
        var bbb = JSON.stringify(paras);
        //console.log('bbb = ', bbb);
        var u = 'https://example.com';
        const aa = new URL('https://example.com');
        //console.log('222');
        for (const [key, value] of Object.entries(paras)) {
            aa.searchParams.append(key, value.toString());
        }
        //console.log('aa.href = ', aa.href);
        var bodyStr = aa.href.replace(`${u}/?`, '');
        var headers = {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "hexin-v": `${hexinV}`,
            "pragma": "no-cache",
            //"sec-ch-ua": "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            //"sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",

            'Hexin-V': `${hexinV}`,
            'referrer': 'https://search.10jqka.com.cn/unifiedwap/result?w=%E6%AF%8F%E6%97%A5%E6%96%B0%E5%A2%9E%E6%A6%82%E5%BF%B5&querytype=',
            'referrerPolicy': "strict-origin-when-cross-origin",
            //'body': paras,//'{"source":"Ths_iwencai_Xuangu","version":"2.0","query_area":"","block_list":"","add_info":"{\"urp\":{\"scene\":1,\"company\":1,\"business\":1},\"contentType\":\"json\",\"searchInfo\":true}\","question":"每日新增概念","perpage":50,"page":1,"secondary_intent":"","log_info":"{\"input_type\":\"click\"}\","rsh":"619725316"}',
            'mode': 'cors',
            'credentials': "include",
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; other_uid=Ths_iwencai_Xuangu_shccqxwdc7dsoajhyjxd7mg6fkgaitu3; ta_random_userid=9cyzs26e99; cid=e39ab79e7009fef22e6a204087928f091714272314; cid=e39ab79e7009fef22e6a204087928f091714272314; ComputerID=e39ab79e7009fef22e6a204087928f091714272314; WafStatus=0; PHPSESSID=5b9fa8062141a87772ae4f05eb825f80; wencai_pc_version=1; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714745066.1714753718.11; __utmt=1; __utmb=156575163.1.10.1714753718; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714753718; THSSESSID=935196d324c7d0aa24714e43cc; v=${hexinV}`
        }
        //console.log('headers = ', headers);
        //var paras = 'source=Ths_iwencai_Xuangu&version=2.0&query_area=&block_list=&add_info={"urp":{"scene":1,"company":1,"business":1},"contentType":"json","searchInfo":true}&question=每日新增概念&perpage=50&page=1&secondary_intent=&log_info={"input_type":"click"}&rsh=619725316}';// "{\"source\":\"Ths_iwencai_Xuangu\",\"version\":\"2.0\",\"query_area\":\"\",\"block_list\":\"\",\"add_info\":\"{\\\"urp\\\":{\\\"scene\\\":1,\\\"company\\\":1,\\\"business\\\":1},\\\"contentType\\\":\\\"json\\\",\\\"searchInfo\\\":true}\",\"question\":\"每日新增概念\",\"perpage\":50,\"page\":1,\"secondary_intent\":\"\",\"log_info\":\"{\\\"input_type\\\":\\\"click\\\"}\",\"rsh\":\"619725316\"}";
        //console.log('paras = ', paras);

        const options = { headers: headers, body: bbb };
        var ret = request('POST', url, options);
        var body = ret.getBody("utf-8");

        var json = JSON.parse(body);
        //console.log('json = ', json);
        //console.log('zzzzffff')
        //console.log('data.answer[0].txt[0].content.components[1].data.datas = ', json.data.answer[0].txt[0].content.components[1].data.datas);
        //var data = { code: 1, state: 'successed!', msg: tips, data: showData, totalPage: totalPage, currPage: pageIndex, nextPage: pageIndex + 1 };
        var data = { code: 1, state: 'successed!', data: json.data.answer[0].txt[0].content.components[1].data.datas }
        res.send(data);
    }
    catch (e) {
        console.log('showStockGN error: ', e.message);
        var data = { code: -1, state: 'failed!', msg: e.message, code: 'code', name: 'name', data: [] };
        res.send(data);
    }
}
async function crawlerAllConcept(req, res, next) {
    let hexinV = req.body.hexinV;
    //console.log('hexinV = ', hexinV);
    var pageIndex = req.body.pageIndex;
    if (!pageIndex) pageIndex = 1;
    var url = gnBaseUrl.replace('【pageIndex】', pageIndex);
    var headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
        'Host': 'q.10jqka.com.cn',
        'Sec-Ch-Ua-Platform': 'Windows',
        'Sec-Fetch-Dest': 'document',
        //'Hexin-V': `${hexinV}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714320094.1714400087.5; __utmt=1; __utmb=156575163.1.10.1714400087; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714400087; v=${hexinV}`
    }
    var paras = {};
    const options = { headers: headers, qs: paras };
    try {
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();
        if(body.indexOf('with status code 401')>=0){
            //console.log('body = ',body);
            var data = { code: 3, state: 'failed!', msg: '授权访问出错，请重新授权！', code: 'code', name: '', data: [], thsgn: [], tdxgn: [] };
            res.send('concept', data);
            return;
        }
        const $ = cheerio.load(body);

        const rows = $('tbody').find('tr');
        var totalPage = parseInt($('#m-page').find('.page_info').text().trim().split('/')[1]);
        if(pageIndex>totalPage){
            var data = { code: 2, state: 'successed!', msg: '已是最后页，没有数据了！', data: [], totalPage: totalPage, currPage: pageIndex };
            res.send(data);
            return;
        }
        var gnList = [];
        for await (var item of rows) {
            var cols = $(item).find('td');
            var addtime = $(cols[0]).text();
            var gnName = $(cols[1]).text();
            var componentUrl = $(cols[1]).find('a').attr('href');
            var remark = await crawlerConceptDefine(componentUrl, headers);
            var gnCodeArr = componentUrl.replaceAll('/', '【').split('【');
            var gnCode = gnCodeArr[gnCodeArr.length - 2];
            gnList.push({ addtime: addtime, gnCode: gnCode, gnName: gnName, remark: remark });
        }
        var data = { code: 1, state: 'successed!', msg: '获取概念时间表成功！', data: gnList, totalPage: totalPage, currPage: pageIndex };
        res.send(data);
    }
    catch (e) {
        console.log('showAllNewConcept error: ', e.message);
        var data = { code: -1, state: 'failed!', msg: e.message, code: 'code', name: '', data: [], thsgn: [], tdxgn: [] };
        res.send('concept', data);
    }
}

async function crawlerConceptDefine(url, headers) {
    try {
        var paras = {};
        const options = { headers: headers, qs: paras };
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();
        const $ = cheerio.load(body);
        const content = $('.board-aside').find('p');
        return content.text();
    }
    catch (e) {
        console.log('crawlerConceptDefine error: ', e.message);
        return '';
    }
}

async function showStockGN(req, res, next) {
    let code = req.params.code;
    try {
        if (!code || code.trim() === '' || code.trim().length !== 6 || isNaN(code)) {
            var data = { code: 0, state: 'successed!', msg: '股票代码错误！', data: [] };
            res.render('stockGN', data);
        }
        var stockGN = await THSgnComponent.findAll({ where: { stockCode: code }, raw: true });

        var ret = [];
        var name = (stockGN && stockGN.length ? stockGN[0].stockName : '');

        if (stockGN && stockGN.length > 0) {
            var gnCode = stockGN.map((item) => { return item.GNCode });
            var newGN = await THSNewGN.findAll({ raw: true });
            ret = newGN.filter((item) => { return gnCode.includes(item.GNCode); })
        }
        if (ret && ret.length > 0) ret.sort((a, b) => { return new Date(b.addtime) - new Date(a.addtime) })
        //console.log('ret = ', ret);
        var thsgn = [], tdxgn = [];
        thsgn = await getTHSStockGN(code);
        tdxgn = await getTDXStockGN(code);
        var data = { code: 1, state: 'successed!', msg: '数据获取成功！', code: code, name: name, data: ret, thsgn: thsgn, tdxgn: tdxgn };
        //console.log('data = ', data);
        res.render('stockGN', data);
    }
    catch (e) {
        console.log('showStockGN error: ', e.message);
        var data = { code: -1, state: 'failed!', msg: e.message, code: code, name: '', data: [], thsgn: [], tdxgn: [] };
        res.render('stockGN', data);
    }
}
async function showConceptChange(req, res, next){
    var data = { code: 1, state: 'successed!', msg: 'ok', hexinV: 'hexinV' };
    res.render('conceptChange', data);
}
async function getTHSStockGN(code) {
    try {
        var url = `https://basic.10jqka.com.cn/${code}/concept.html`
        const options = {};// { headers: headers, qs: paras };
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();
        const $ = cheerio.load(body);
        var rows = $('.gnContent').find('tbody').find('tr:not(.extend_content)');
        var restult = [];
        for await (var row of rows) {
            var cols = $(row).find('td');
            var gnName = $(cols[1]).text().trim().replace('\n', '');
            var clid = $($(cols[1])[0]).attr('clid');
            /*var ltg = $(cols[2]).text();
            var cause = $(cols[3]).text();*/
            var json = { gnName: gnName, clid: 'clid', ltg: 'ltg', cause: 'cause' }
            restult.push(json);
        }
        //console.log('ths ret = ', ret);
        return restult;
    }
    catch (e) {
        console.log('getTHSStockGN error: ', e.message);
        return [];
    }
}
async function getTDXStockGN(code) {
    try {
        var url = 'https://ften.htsc.com.cn:8089/ften/concept/conceptType'
        var headers = {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "sec-ch-ua": "\"Chromium\";v=\"124\", \"Google Chrome\";v=\"124\", \"Not-A.Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest",
            "cookie": "JSESSIONID=0C033E25D4B65CC46C8005412FB37E38; sensorsdata2015jssdkcross=%7B%22distinct_id%22%3A%2218ecdc172d6303-0fb6100bbea3fc-26001a51-1049088-18ecdc172d72ac%22%2C%22first_id%22%3A%22%22%2C%22props%22%3A%7B%7D%2C%22device_id%22%3A%2218ecdc172d6303-0fb6100bbea3fc-26001a51-1049088-18ecdc172d72ac%22%7D; route=499ab5612fe0e32903a50c826f9837a7; BIGipServerBFVsbbsm5mPZvhgRu+v7TA=!pho7VnSxZyJ/mdRTrPnPKSov3fDas7OLvPCiBUu8/dWh8iy8SOR1TzebVjCy6SJ3sZQBUXEYqeDy6Fw=; BIGipServergIwRqm+wpT3pNvlU36Jvmg=!6hUZkH6bGq6NjFNTrPnPKSov3fDas/lNdWVleExHhbLQRKUy/cad9Vu3t6XNnos3ofVbemzZXo3uzw==",
            "Referer": `https://ften.htsc.com.cn:8089/ften/abStock/conceptualSubject?tradingCode=${code}`,
            "Referrer-Policy": "strict-origin-when-cross-origin"
        };
        var body = `tradingCode=${code}`;
        const ret = request('POST', url, { headers: headers, body: body });
        var retJson = JSON.parse(ret.getBody('utf8'));
        if (retJson.msg === 'success' && parseInt(retJson.totalCount) > 0) {
            retJson.dataList.sort((a, b) => { return parseInt(b.conceptTypeCode) - parseInt(a.conceptTypeCode) });
            return retJson.dataList;
        }
        return [];
    }
    catch (e) {
        console.log('getTDXStockGN error: ', e.message);
        return [];
    }
}
async function crawlerAllNewGN(req, res, next) {
    let hexinV = req.body.hexinV;
    //console.log('hexinV = ', hexinV);
    var data = { code: 1, state: 'successed!', msg: 'ok', hexinV: hexinV };

    res.render('thsGN', data);
}
async function getComponents(req, res, next) {
    try {
        let allGN = await THSNewGN.findAll({ attributes: ['addtime', 'GNCode', 'GNName'], raw: true });
        const data = { code: 1, state: 'successed', msg: '获取数据成功！', data: allGN, total: allGN.llength };
        res.send(data);
    }
    catch (e) {
        console.log('getComponents = ', e.message);
        var data = { code: e.statusCode, state: 'error!', msg: e.message, data: [], total: 0 };
        res.send(data);
    }
}
async function getPartial(req, res, next) {
    try {
        let partial = await THSgnComponent.findAll({
            attributes: ['GNCode', [Sequelize.fn('COUNT', Sequelize.col('GNCode')), 'importCount']],// 计算每个概念的个股数量
            group: ['GNCode'],
            raw: true
        }
        );
        let allGN = await THSNewGN.findAll({ attributes: ['addtime', 'GNCode', 'GNName', 'componentCount'], raw: true });
        allGN.forEach(function (item) {
            var aa = partial.find((p) => { return p.GNCode === item.GNCode });
            item.importCount = (!aa ? 0 : parseInt(aa.importCount));
        });
        var ret = allGN.filter((item) => { return item.componentCount > item.importCount });
        var data = { code: 1, state: 'successed!', msg: '成功获取未导入的概念板块！', data: ret, total: ret.length };
        res.send(data);
    }
    catch (e) {
        console.log('getPartial = ', e.message);
        var data = { code: e.statusCode, state: 'error!', msg: e.message, data: [], total: 0 };
        res.send(data);
    }
}

async function crawlerComponent(req, res, next) {
    try {
        //console.log('crawlerComponent -> req.body = ', req.body);
        var pageIndex = req.body.pageIndex;
        if (!pageIndex) pageIndex = 1;
        var gnCode = req.body.gnCode;
        if (!gnCode || gnCode.trim() === '') {
            var data = { code: 0, state: 'error!', msg: '概念编码不存在', data: [], total: 0 };
            res.send(data);
            return;
        }

        var gnName = req.body.gnName;
        let hexinV = req.body.hexinV;
        var url = `https://q.10jqka.com.cn/gn/detail/field/199112/order/desc/page/${pageIndex}/ajax/1/code/${gnCode}`;

        var paras = {};
        var headers = {
            'Accept': 'text/html, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
            'Host': 'q.10jqka.com.cn',
            'Sec-Ch-Ua-Platform': 'Windows',
            'Sec-Fetch-Dest': 'empty',
            //'Referer': `https://q.10jqka.com.cn/gn/detail/code/${gnCode}/`,
            //'Hexin-V': `${hexinV}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714233469.1714320094.4; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714320094; v=${hexinV}`
        }
        const options = { headers: headers, qs: paras };
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();
        const $ = cheerio.load(body);
        const page_info = $('#m-page').find('.page_info')
        var totalPage = !page_info ? 1 : parseInt(page_info.text().split('/')[1]);
        //console.log('totalPage = ', totalPage);
        const rows = $('tbody').find('tr');
        var showList = [];
        var componentList = [];
        for await (var row of rows) {
            var cols = $(row).find('td');
            var stockCode = $(cols[1]).text();
            var stockName = $(cols[2]).text();
            showList.push({ stockCode: stockCode, stockName: stockName });
            var uuid = crypto.randomUUID();
            var id = `${gnCode}_${stockCode}`;
            var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
            //componentList.push({ id: uuid, stockCode: stockCode, stockName: stockName, cid: cid, GNCode: gnCode, createdAt: date, updatedAt: date })
            componentList.push({ id: id, stockCode: stockCode, stockName: stockName, GNCode: gnCode, createdAt: date, updatedAt: date })
        }

        if (componentList && componentList.length > 0) {
            //console.log('componentListSave = ', componentList);
            THSgnComponent.bulkCreate(componentList,
                {
                    fields: ['id', 'stockCode', 'stockName', 'GNCode', 'createdAt', 'updatedAt'],
                    updateOnDuplicate: ['stockCode', 'stockName', 'GNCode', 'updatedAt'],
                    //ignoreDuplicates: true
                }
            );
        }
        var data = { code: 1, state: 'successed', msg: '采集成功！', data: showList, totalPage: totalPage };
        res.send(data);
    }
    catch (e) {
        console.log('crawlerComponent = ', e.message);
        var data = { code: e.statusCode, state: 'error', msg: e.message, data: [], total: 0 };
        res.send(data);
    }
}
async function componentStock(req, res, next) {
    try {
        let hexinV = req.body.hexinV;
        //console.log('componentStock.hexinV = ', hexinV);
        var pageIndex = req.body.pageIndex;
        var gnCode = req.body.gnCode;
        var gnName = req.body.gnName;
        if (!pageIndex) pageIndex = 1;
        var url = `https://q.10jqka.com.cn/gn/detail/field/199112/order/desc/page/${pageIndex}/ajax/1/code/${gnCode}`;
        //console.log('componentStock.url = ', url);
        var paras = {};
        var headers = {
            'Accept': 'text/html, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
            'Host': 'q.10jqka.com.cn',
            'Sec-Ch-Ua-Platform': 'Windows',
            'Sec-Fetch-Dest': 'empty',
            //'Referer': `https://q.10jqka.com.cn/gn/detail/code/${gnCode}/`,
            //'Hexin-V': `${hexinV}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714233469.1714320094.4; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714320094; v=${hexinV}`
        }
        const options = { headers: headers, qs: paras };
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();
        //console.log('body = ', body);
        const $ = cheerio.load(body);
        const page_info = $('#m-page').find('.page_info')
        var totalPage = !page_info ? 1 : parseInt(page_info.text().split('/')[1]);
        //console.log('totalPage = ', totalPage);
        const rows = $('tbody').find('tr');
        var list = [];
        for await (var row of rows) {
            var cols = $(row).find('td');
            var stockCode = $(cols[1]).text();
            var stockName = $(cols[2]).text();
            list.push({ stockCode: stockCode, stockName: stockName });
        }
        //console.log('list = ', list);
        var tips = `采集新增概念“${gnName}”的成份股第 ${pageIndex} 页已完成 / 共 ${totalPage}页 ......`
        console.log(tips);
        var data = { code: 1, state: 'successed!', msg: tips, data: list, totalPage: totalPage, currPage: pageIndex, nextPage: pageIndex + 1 };
        res.send(data);
    }
    catch (e) {
        console.log('componentStock', e.message);
        res.send(e.toString());
    }
}

async function getStockGN(req, res, next) {
    let origin = parseInt(req.query.code);
    var data = { code: 1, state: 'successed!', msg: 'ok', origin: origin };

    res.send(data);
}
async function getGNPages(req, res, next) {
    try {
        let hexinV = req.query.hexinV;
        var url = gnBaseUrl.replace('【pageIndex】', 1);
        var headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
            'Host': 'q.10jqka.com.cn',
            'Sec-Ch-Ua-Platform': 'Windows',
            'Sec-Fetch-Dest': 'document',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714320094.1714400087.5; __utmt=1; __utmb=156575163.1.10.1714400087; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714400087; v=${hexinV}`
        }
        var paras = {};
        const options = { headers: headers, qs: paras };
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();

        var gnList = [];
        const $ = cheerio.load(body);
        var totalPage = parseInt($('#m-page').find('.page_info').text().trim().split('/')[1]);
        var data = { code: 1, state: 'successed', msg: '获取数据成功！', totalPage: totalPage };
        res.send(data);
    }
    catch (e) {
        console.log('getGNPages', e.message);
        var data = { code: e.statusCode, state: 'error!', msg: e.message, totalPage: 0 };
        res.send(data);
    }
}
async function crawlerGN(req, res, next) {

    let hexinV = req.body.hexinV;
    //console.log('hexinV = ', hexinV);
    var pageIndex = req.body.pageIndex;
    if (!pageIndex) pageIndex = 1;
    var url = gnBaseUrl.replace('【pageIndex】', pageIndex);
    var headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
        'Host': 'q.10jqka.com.cn',
        'Sec-Ch-Ua-Platform': 'Windows',
        'Sec-Fetch-Dest': 'document',
        //'Hexin-V': `${hexinV}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714320094.1714400087.5; __utmt=1; __utmb=156575163.1.10.1714400087; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714400087; v=${hexinV}`
    }
    var paras = {};
    const options = { headers: headers, qs: paras };
    try {
        var ret = request('GET', url, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();

        var gnList = [];
        var showData = [];
        const $ = cheerio.load(body);
        const rows = $('tbody').find('tr');
        var totalPage = parseInt($('#m-page').find('.page_info').text().trim().split('/')[1]);
        for await (var item of rows) {
            var cols = $(item).find('td');
            var addtime = $(cols[0]).text();
            var gnName = $(cols[1]).text();
            var componentUrl = $(cols[1]).find('a').attr('href');
            var gnCodeArr = componentUrl.replaceAll('/', '【').split('【');
            var gnCode = gnCodeArr[gnCodeArr.length - 2];
            var eventDesc = $(cols[2]).text();
            var eventUrl = $(cols[2]).find('a').attr('href');
            var leadingStock = $(cols[3]).text().replace('\n', '');
            var stockCount = parseInt($(cols[4]).text());
            //leadingStock = leadingStock.trim() === '--' ? '' : leadingStock.trim();
            //console.log(`addtime = ${addtime}, gnName = ${gnName}, componentUrl = ${componentUrl}, gnCode =${gnCode},eventDesc = ${eventDesc}, eventUrl = ${eventUrl}, leadingStock = ${leadingStock}`);
            var date = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss.S');
            var uuid = crypto.randomUUID();
            //gnList.push({ cid: uuid, addtime: addtime, GNCode: gnCode, GNName: gnName, eventDesc: eventDesc, eventUrl: eventUrl, leadingStock: leadingStock, componentUrl: componentUrl, componentCount: stockCount, createdAt: date, updatedAt: date });
            gnList.push({
                addtime: addtime, GNCode: gnCode, GNName: gnName, eventDesc: eventDesc, eventUrl: eventUrl,
                leadingStock: leadingStock, componentUrl: componentUrl, componentCount: stockCount, createdAt: date, updatedAt: date
            });
            showData.push({ addtime: addtime, gnName: gnName, gnCode: gnCode, componentUrl: componentUrl, eventDesc: eventDesc, eventUrl: eventUrl, leadingStock: leadingStock, stockCount: stockCount });
            //var componentStock = getComponentStock(gnCode, hexinV);
        }
        var tips = `新增概念第 ${pageIndex} 页已采集，共 ${totalPage} 页 ......`
        //console.log(tips);
        var data = { code: 1, state: 'successed!', msg: tips, data: showData, totalPage: totalPage, currPage: pageIndex, nextPage: pageIndex + 1 };
        //console.log('gnList = ', gnList);
        if (gnList.length > 0) {
            //console.log('gnListSave = ', gnList);
            THSNewGN.bulkCreate(gnList,
                {
                    //fields:['addtime', 'GNCode', 'GNName', 'eventDesc', 'eventUrl', 'leadingStock', 'componentUrl', 'componentCount','createdAt', 'updatedAt'],
                    updateOnDuplicate: ['addtime', 'GNName', 'eventDesc', 'eventUrl', 'leadingStock', 'componentUrl', 'componentCount', 'updatedAt'],
                    //ignoreDuplicates: true
                }
            );
        }
        res.send(data);
    }
    catch (e) {
        console.log('crawlerGN', e.statusCode);
        var data = { code: e.statusCode, state: 'error!', msg: e.message, data: [], totalPage: 41, currPage: pageIndex, nextPage: pageIndex + 1 };
        res.send(data);
    }
}

async function getComponentStock(gnCode, hexinV, pageIndex = 1) {
    try {
        var list = [];
        var pageUrl = `https://q.10jqka.com.cn/gn/detail/field/199112/order/desc/page/${pageIndex}/ajax/1/code/${gnCode}`;
        var paras = {};
        var headers = {
            'Accept': 'text/html, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6',
            'Host': 'q.10jqka.com.cn',
            'Sec-Ch-Ua-Platform': 'Windows',
            'Sec-Fetch-Dest': 'empty',
            //'Referer': `https://q.10jqka.com.cn/gn/detail/code/${gnCode}/`,
            //'Hexin-V': `${hexinV}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Cookie': `Hm_lvt_78c58f01938e4d85eaf619eae71b4ed1=1712800014; Hm_lvt_722143063e4892925903024537075d0d=1713097679; Hm_lvt_929f8b362150b1f77b477230541dbbc2=1713097682; __utmc=156575163; __utmz=156575163.1714195960.1.1.utmcsr=baidu|utmccn=(organic)|utmcmd=organic; spversion=20130314; searchGuide=sg; historystock=603319%7C*%7C000007%7C*%7C000783%7C*%7C000001; hxmPid=adm_wapzxdingbubanner_376838; cid=e39ab79e7009fef22e6a204087928f091714272314; u_ukey=A10702B8689642C6BE607730E11E6E4A; u_uver=1.0.0; u_dpass=5vKHsXgPKNEF%2FGgU%2Fyc2PI9xdaIm5oj3Pxea5KWHpzS%2FnJXkhg50u1m3o1na0nkk%2FsBAGfA5tlbuzYBqqcUNFA%3D%3D; u_did=C73F56B77B3A4C9BA1B1991B93EB382E; u_ttype=WEB; user=MDpteF82MTk3MjUzMTY6Ok5vbmU6NTAwOjYyOTcyNTMxNjo3LDExMTExMTExMTExLDQwOzQ0LDExLDQwOzYsMSw0MDs1LDEsNDA7MSwxMDEsNDA7MiwxLDQwOzMsMSw0MDs1LDEsNDA7OCwwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMSw0MDsxMDIsMSw0MDoxNjo6OjYxOTcyNTMxNjoxNzE0MjcyNzI2Ojo6MTY0MzQ2MzcyMDo2MDQ4MDA6MDoxNDllMDg5MjZlZjgzMDY4N2ZhNGU1MjkzNjE4NTYwMGY6ZGVmYXVsdF80OjA%3D; userid=619725316; u_name=mx_619725316; escapename=mx_619725316; ticket=dae3a18051a2e1c5af89c1ac3e8086bc; user_status=0; utk=41777c73190285070a491897e9c55e4b; Hm_lpvt_722143063e4892925903024537075d0d=1714274008; Hm_lpvt_929f8b362150b1f77b477230541dbbc2=1714274009; __utma=156575163.1404407149.1714195960.1714233469.1714320094.4; Hm_lpvt_78c58f01938e4d85eaf619eae71b4ed1=1714320094; v=${hexinV}`
        }
        const options = { headers: headers, qs: paras };
        var ret = request('GET', pageUrl, options);
        var body = ret.getBody();
        body = iconv.decode(body, 'gb2312').toString();

        const $ = cheerio.load(body);
        const page_info = $('#m-page').find('.page_info')
        var pageCount = !page_info ? 1 : parseInt(page_info.text().split('/')[1]);
        const rows = $('#maincont').find('table').find('tbody').find('tr');
        for await (var row of rows) {
            var cols = $(row).find('td');
            var stockCode = $(cols[1]).text();
            var stockName = $(cols[2]).text();
            list.push({ stockCode: stockCode, stockName: stockName });
        }
        //console.log('list = ', list);
        return list;
    }
    catch (e) {
        console.log(e.toString());
        return [];
    }
}

module.exports = {
    getStockGN,
    crawlerGN,
    showStockGN,
    crawlerAllNewGN,
    componentStock,
    getGNPages,
    getComponents,
    crawlerComponent,
    getPartial,
    getDailyStockNewGN,
    crawlerAllConcept,
    showAllNewConcept,
    componentChange,
    showConceptChange,
    conceptAlter
}