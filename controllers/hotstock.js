const request = require('sync-request');
const { HotStock } = require('../models');
const util = require('../common/util');

async function showHotStock(req, res, next) {
    let origin = parseInt(req.query.origin);
    var data = { code: 1, state: 'successed!', msg: 'ok', origin: origin };

    res.render('hotstock', data);
}
const converToUrl = requestParams => {
    let params = [];
    Object.entries(requestParams).forEach(([key, value]) => {
        let param = key + '=' + value;
        params.push(param);
    });
    return params.join('&');
}

//网页：https://www.iwencai.com/unifiedwap/result?w=%E4%BA%BA%E6%B0%94%E8%82%A1&querytype=
function getWenCaiHotStock(req, res, next) {
    var json = {};
    try {
        var Hexin_V = req.body.hexinV;
        var preUrl = 'https://www.iwencai.com/unifiedwap/unified-wap/v2/result/get-robot-data'
        var cookie = `other_uid=Ths_iwencai_Xuangu_j6ih0cykcwojzz33wnw4av5oj4wgf7j8; ta_random_userid=jzvfsd1zbl; cid=c3b6bddb0793d1d48dc9ac6aa09322a31697297805; wencai_pc_version=0; cid=c3b6bddb0793d1d48dc9ac6aa09322a31697297805; ComputerID=c3b6bddb0793d1d48dc9ac6aa09322a31697297805; WafStatus=0; PHPSESSID=6bb219ff6dc4647cd5bb9f3935701758; v=${Hexin_V}`
        var headers = {
            'content-type': 'application/x-www-form-urlencoded',
            'cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        };
        var para = {
            add_info: `{ "urp": { "scene": 1, "company": 1, "business": 1 }, "contentType": "json", "searchInfo": true }`,
            block_list: "",
            log_info: `{ "input_type": "click" }`,
            page: 1,
            perpage: 50,
            query_area: "",
            question: "人气股",
            rsh: "Ths_iwencai_Xuangu_nwdz0lwbzdpddf9rwofppxpkzvbab3hd",
            secondary_intent: "stock",
            source: "Ths_iwencai_Xuangu",
            version: "2.0"
        }
        var postBody = converToUrl(para);

        //var postBody = 'question=人气股&source=ths_mobile_iwencai&user_id=0&user_name=0&version=2.0&add_info={"urp":{"scene":3,"company":1,"business":1,"is_lowcode":1},"contentType":"json"}&log_info={"input_type":"click"}&rsh=Ths_iwencai_Xuangu_j6ih0cykcwojzz33wnw4av5oj4wgf7j8'
        const preRet = request('POST', preUrl, { headers: headers, body: postBody });
        var preBody = JSON.parse(preRet.getBody('utf8'));
        //var logid = preBody.data.logid;
        //var userid = preBody.data.user_id;
        var datus = preBody.data.answer[0].txt[0].content.components[0].data.datas;
        var columns = preBody.data.answer[0].txt[0].content.components[0].data.columns;
        json = { code: 1, status: 'ok', msg: '成功获取问财网的人气股！', data: { datus: datus, columns: columns} };

        /*var meta = preBody.data.answer[0].txt[0].content.components[0].data.meta
        var token = meta.extra.token;
        var sessionid = meta.sessionid;
        var condition = meta.extra.condition;

        //var postData = `query=人气股&source=ths_mobile_iwencai&urp_sort_index=&urp_sort_way=desc&condition=[{"opProperty":"","ci":true,"source":"text2sql","ciChunk":"人气股","score":0.0,"createBy":"preCache","chunkedResult":"人气股","opName":"and","uiText":"个股热度排名小于等于50并且个股热度从大到小排名","sonSize":3,"opPropertyMap":{},"logid":"${logid}","order":0},{"dateText":"","indexName":"个股热度排名","indexProperties":["<=50","nodate+1","交易日期+${tradeDate}"],"ci":true,"dateUnit":"日","type":"index","indexPropertiesMap":{"<=":"50","交易日期":"${tradeDate}","nodate":"1"},"parentOpName":"and","reportType":"NATURAL_DAILY","ciChunk":"人气股","createBy":"preCache","dateType":"+区间","isExtend":false,"uiText":"个股热度排名小于等于50","valueType":"_整型数值","domain":"abs_股票领域","sonSize":0,"parentOpOrder":0,"order":1},{"parentOpName":"and","ciChunk":"人气股","createBy":"preCache","opName":"sort","opProperty":"从大到小排名","ci":true,"uiText":"个股热度从大到小排名","sonSize":1,"opPropertyMap":{"从大到小排名":""},"parentOpOrder":0,"order":2},{"dateText":"","indexName":"个股热度","indexProperties":["nodate+1","交易日期+${tradeDate}"],"dateUnit":"日","type":"index","indexPropertiesMap":{"交易日期":"${tradeDate}","nodate":"1"},"parentOpName":"sort","reportType":"NATURAL_DAILY","createBy":"preCache","dateType":"+区间","isExtend":false,"valueType":"_浮点型数值","domain":"abs_股票领域","sonSize":0,"parentOpOrder":2,"order":3}]&codelist=&is_cache=1&perpage=50&logid=${logid}&page=1&ret=json_all&sessionid=6bb219ff6dc4647cd5bb9f3935701758&throughFirst[add_info][finance][parser_type]=text2sql&iwc_token=0ac9665717008376419132854&urp_use_sort=1&user_id=${userid}&uuids[0]=18369&query_type=stock&comp_id=6852058&business_cat=soniu&uuid=18369&limit_type=code`
        var postData = `query=人气股&source=ths_mobile_iwencai&urp_sort_index=&urp_sort_way=desc&condition=${condition}&codelist=&is_cache=1&perpage=50&logid=${logid}&page=1&ret=json_all&sessionid=${sessionid}&throughFirst[add_info][finance][parser_type]=text2sql&iwc_token=${token}&urp_use_sort=1&user_id=${userid}&uuids[0]=18369&query_type=stock&comp_id=6852058&business_cat=soniu&uuid=18369&limit_type=code`
        postBody = decodeURIComponent(postData);
        cookie = `other_uid=Ths_iwencai_Xuangu_nwdz0lwbzdpddf9rwofppxpkzvbab3hd; ta_random_userid=r2oq089qy0; cid=40aaf0f874115e4a17b8b734f4f1d4381713097711; PHPSESSID=7233b8df1e31295e5968f6177d478298; cid=40aaf0f874115e4a17b8b734f4f1d4381713097711; ComputerID=40aaf0f874115e4a17b8b734f4f1d4381713097711; WafStatus=0; v=AwSDL9x0PrzXCYpwgeLF3pxx1YnzHSiD6kG8yx6lkE-SSao3Ri34FzpRjFFt`;
        headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'cookie': cookie, 'Hexin-V': Hexin_V };
        const iwcUrl = 'https://www.iwencai.com/gateway/urp/v7/landing/getDataList';
        const ret = request('POST', iwcUrl, { headers: headers, body: postBody }, postBody);
        //console.log('ret.body = ', ret.getBody('utf8'));

        const body = JSON.parse(ret.getBody('utf8'));
        json = { code: 1, status: 'ok', msg: '成功获取问财网的人气股！', data: body };*/

    } catch (e) {
        json = { code: -1, status: 'failed', msg: e.message, data: null };
    }
    res.send(json);
}

function getEastMoneyHotStock(req, res, next) {
    var json = {};
    try {
        var date = util.dateFormat((new Date()), 'yyyy_MM_dd_hh_mm_ss');
        var page = 1;
        let headers = {};
        let arrRet = [];
        const emUrl = `http://gbcdn.dfcfw.com/rank/popularityList.js?type=0&sort=0&page=${page}&v=${date}`;
        const ret = request('GET', emUrl);
        var retJson = ret.getBody('utf8');
        var json = { page: page, data: retJson };
        res.send(retJson);
        return;
        json = { code: 1, status: 'ok', msg: 'ok', data: arrRet };
    } catch (e) {
        json = { code: -1, status: 'failed', msg: e.message, data: null };
    }
    res.send(json);
}

//网页：https://www.taoguba.com.cn/new/nrnt/toPopularityBoard
function getTaogubaHotStock(req, res, next) {
    try {
        var tgbUrl = 'https://www.taoguba.com.cn/new/nrnt/getNoticeStock?type=H';
        const cookie = 'acw_tc=0b63bb6a17408348772603141e0980f57c1762c22b3bf3af3804d1d3eff12e; JSESSIONID=MDIwNDc1NGYtYWE3My00ZWFkLWFmY2YtMDRiYjA5ZTExNDc5; gdp_user_id=gioenc-841gd7de%2Cadda%2C52bb%2Cc778%2C4368a6508029; 893eedf422617c96_gdp_session_id=fc74dfd4-4381-478d-af0b-6c1bf0e830cd; 893eedf422617c96_gdp_gio_id=gioenc-1; 893eedf422617c96_gdp_cs1=gioenc-1; Hm_lvt_cc6a63a887a7d811c92b7cc41c441837=1740835014; Hm_lpvt_cc6a63a887a7d811c92b7cc41c441837=1740835014; HMACCOUNT=9D808D07E1E10947; tfstk=gyrE3nfP4MIFcDqFZAmy7vLAE9mKqDfj-uGSE82odXcHAHOu7-FAe4fLF5zzG-hnP4wSE5yY6bhIVv6r48PeVp_oA0uuMD08RbGIa0y8gO1fciwLp0ncGssb5NcXs0hlV0bsjZNSTq1fciwh-vn7IsZCsphjOYmoKvckSOkjHUmkq3XZsYkvrBVoqOWZUY-nEe0HjGDxn0cuZ2XaIfHrZJEucwH--TleHiwNBP0EiJcw0REiKKhfDf-oslHE8u2n_vkUbvuEgVd6xcZ318qQvVQM70e_u7zui1TItrk4_qaFgHP49YViIW6WyAzzEonK8KtbQ4lUSk0wE32ZbX07zW5eJX4Q_qHiSLSxCSGgpk4NeC23GXonIVsc3R0u5k3YA1xEmreIAzVc1eG3uYjrXQHGK6Z88QYr-AHZGOWar_WL8F3tedYJy2HtQj6H1UL--AHZGOWwyU3B7AlfKC1..; 893eedf422617c96_gdp_sequence_ids=%7B%22globalKey%22%3A6%2C%22VISIT%22%3A3%2C%22PAGE%22%3A4%7D; 893eedf422617c96_gdp_session_id_fc74dfd4-4381-478d-af0b-6c1bf0e830cd=true';
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
        let headers = {
            'Accept': 'application/json, text/javascript, */*; q=0.01', 'x-requested-with': 'XMLHttpRequest', 'cookie': cookie, 'host': 'www.tgb.cn' };
        const ret = request('GET', tgbUrl, { headers: headers });
        var retJson = JSON.parse(ret.getBody('utf8'))
        var arrCode = retJson.dto.map(item => { return item.fullCode });
        var strCodes = eval(arrCode);
        console.log('strCodes = ', strCodes);
        var enCodes = encodeURIComponent(JSON.stringify(strCodes));
        console.log('enCodes = ', enCodes);
        var tgbUrl1 = `https://hq.taoguba.com.cn/tgb/realHQList/?stockCodeList=${enCodes}`;
        var ret1 = request('GET', tgbUrl1, { headers: headers });
        var retJson1 = JSON.parse(ret1.getBody('utf8'))
        json = { code: 1, status: 'ok', msg: 'ok', data: { stocks: retJson.dto, quote: retJson1.dto } };
    } catch (e) {
        console.log('e.message = ', e.message);
        json = { code: -1, status: 'failed', msg: e.message, data: null };
    }
    res.send(json);
}
/*
const originKey = "wijrKSCUiQuGbrwsgyEMyIx7Uogmfe85";
const originIV = "ho6KJIIz9WV7nozZl5fVnG7MtDUcSUB1";

function encrypt(text){
    var key = crypto.enc.Utf8.parse(originKey);
    var iv = crypto.enc.Utf8.parse(originIV);
    var encrypted = crypto.AES.encrypt(text, key, {
        iv: iv,
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7
    });
    // 转换为字符串
    encrypted = encrypted.toString();
    return encrypted
}

function decrypt(encryptedStr){
    var key = crypto.enc.Utf8.parse(originKey);
    var iv = crypto.enc.Utf8.parse(originIV);
    var decrypted = crypto.AES.decrypt(encryptedStr, key, {
        iv: iv,
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7
    });
    decrypted = crypto.enc.Utf8.stringify(decrypted);
    return decrypted;
}
*/

module.exports = {
    showHotStock,
    getWenCaiHotStock,
    getEastMoneyHotStock,
    //getWenCaiParams,
    getTaogubaHotStock,
}