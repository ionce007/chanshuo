const { DataTypes, Model } = require('sequelize');
const { Option, AccessToken } = require('../models');
const puppeteer = require('puppeteer');
const dotEnv = require('dotenv');
dotEnv.config();

/**
 微信视频号扫码登录后获取cookies 
  */
async function getWXVideoCookies(req, res, next) {
    let ret = {};
    try {
        const url = 'https://channels.weixin.qq.com/login.html';// "http://www.foryet.net/wxvloginqr.html";//
        const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--start-maximized'] });
        const page = await browser.newPage();
        await page.goto(url);
        console.log('url = ', url);
        const newPagePromise = new Promise((x) => { browser.once('targetchanged', (target) => { return x(target.page()); }) });//创建newPagePromise对象

        //loginBtn.click();
        const newPage = await newPagePromise;//声明一个newPage对象
        let cookies = await newPage.cookies();
        let newUrl = await newPage.url();//获取新页面的链接
        //const videoUrl = 'https://channels.weixin.qq.com/platform/post/list';
        let finder_username = await page.evaluate(() => { return localStorage.getItem('finder_username'); });
        //console.log('finder_username = ', finder_username);
        /*page.on('request', async (req) => {
            let nUrl = req.url();
            if (req.resourceType() === 'xhr' && nUrl.indexOf('/mmfinderassistant-bin/auth/auth_data') >= 0) { // 只监听Ajax请求
                console.log('auth_data request.headers = ', req.headers());
                headers = req.headers();
                //console.log('request.postData = ', request.postData());
                //console.log('请求URL:', request.url());
                //request.continue({}); // 继续请求
            } ///mmfinderassistant-bin/live/get_live_permission_apply_status
            if (req.resourceType() === 'xhr' && nUrl.indexOf('/mmfinderassistant-bin/live/get_live_permission_apply_status') >= 0) { 
                console.log('get_live_permission_apply_status request.headers = ', req.headers());
            }
        });*/
        /*page.on("response", async ( res ) => {
            let url = res.url();
            //console.log('url = ', url);
            if( url.indexOf('mmfinderassistant-bin/auth/auth_data') >=0 ) console.log(' res.json() = ', await res.json());
        })*/
        await page.goto(newUrl);
        console.log('newUrl = ', newUrl);
        //https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_data?_rid=67530663-e4bc433c
        //https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/auth/auth_110_report
        //const xhrRequest = await page.waitForRequest(request => request.url().indexOf('/cgi-bin/mmfinderassistant-bin/auth/auth_110_report') >= 0 && request.method() === 'POST');
        const userRes = await page.waitForResponse(async (res) => {
            if (res.url().indexOf('/mmfinderassistant-bin/auth/auth_data') >= 0 && res.status() === 201) { return res; }
        });
        let userInfo = await userRes.json();

        const statusRes = await page.waitForResponse(async (res) => {
            if (res.url().indexOf('/mmfinderassistant-bin/live/get_live_permission_apply_status') >= 0 && res.status() === 201) { return res; }
        });
        let headers = statusRes.request().headers();

        await newPage.close();
        //console.log('headers = ', headers);
        await browser.close();

        let data = { cookies: cookies, wxUser: userInfo.data.userAttr, finderUser: userInfo.data.finderUser, reqHeaders: headers }
        let uniqId = data.finderUser.uniqId;
        let nickname = data.wxUser.nickname;
        var tokenModel = await AccessToken.findOne({ where: { supplier: uniqId }, raw: true });
        const base64Str = Buffer.from(JSON.stringify(data)).toString('base64');
        let expires = Math.floor(data.cookies[0].expires);
        let updatedAt = new Date();
        if (tokenModel) {
            tokenModel.access_token = base64Str;
            tokenModel.refresh_token = 'wxvideo_login';
            tokenModel.expires_in = expires;
            tokenModel.scope = nickname;
            tokenModel.updatedAt = updatedAt
            await AccessToken.update(tokenModel, { where: { supplier: uniqId } })
        }
        else {
            tokenModel = {
                supplier: uniqId, access_token: base64Str, expires_in: expires, refresh_token: 'wxvideo_login',
                scope: nickname, remark: '微信视频号扫码登录的cookies及登录用户信息', createdAt: updatedAt, updatedAt: updatedAt
            };
            await AccessToken.create(tokenModel);
        }
        //console.log('data = ', data);
        const postBaseUrl = process.env.WX_VIDEO_POST_URL || 'http://localhost:9901/';
        const postUrl = `${postBaseUrl}/api/actions.aspx?action=wx_video_auth`;
        const postHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' };
        console.log('tokenModel = ', tokenModel);
        console.log('postUrl = ', postUrl);
        await fetch(postUrl, {
            method: 'POST',
            body: JSON.stringify(tokenModel),
            headers: postHeaders
        })
        .then((res) => res.json())
        .then((json) => { ret = { code: 1, msg: 'success', success: true }; console.log('json = ', json); })
        .catch(err => { ret = { code: -2, data: [], msg: err.message, success: false }; console.log('err = ', err); })
    }
    catch (ex) {
        ret = { code: -999, msg: ex.message, success: false }
        console.log('error = ', ex.message);
    }
    res.json(ret);
}
async function getWXVideoUsers(req, res, next){
    let ret = {};
    try{
        let pageSize = (!req.query.pageSize ? 20 : req.query.pageSize);
        let pageIndex = (!req.query.pageIndex ? 1 : req.query.pageIndex);
        var users = await AccessToken.findAll({ where: { refresh_token: 'wxvideo_login' }, raw: true });
        let total = users.length;
        let startIndex = (pageIndex - 1) * pageSize;
        let retUsers = users.slice(startIndex, startIndex + pageSize);
        retUsers.forEach(item => { item.data = Base64ToJson(item.access_token); });
        ret = { code: 1, data: retUsers, total: total, msg: 'success', success: true }
    }
    catch(ex){
        ret = { code: -999, data: [], total: 0, msg: ex.message, success: false }
        console.log('error = ', ex.message);
    }
    res.json(ret);
}
async function getWXShipinhaoAuth(uniqId) {
    let ret = {};
    try {
        var tokenModel = await AccessToken.findOne({ where: { supplier: uniqId }, raw: true });
        if (!tokenModel) return { code: -1, auth: {}, msg: '尚未获取该用户的授权！', success: false };
        let expires = tokenModel * 1000;
        if (new Date(expires) <= new Date()) return { code: -2, auth: {}, msg: '该用户的授权已过期！', success: false };
        const jsonData = Base64ToJson(tokenModel.access_token);
        if (!jsonData || Object.keys(jsonData).length === 0) return { code: -3, auth: {}, msg: '该用户的授权不合法！', success: false };
        let cookieStr = '';
        jsonData.cookies.forEach((item) => { cookieStr += `${item.name}=${item.value};`; })
        if (!cookieStr || cookieStr.length === 0) return { code: -4, auth: {}, msg: '该用户的授权不合法！', success: false };
        let finderUsername = jsonData.finderUser.finderUsername;
        let headers = jsonData.reqHeaders;
        const data = { cookies: cookieStr, finderUsername: finderUsername, uniqId: uniqId, headers: headers };
        ret = { code: 1, auth: data, msg: 'success', success: true };
    }
    catch (ex) {
        ret = { code: -999, auth: {}, msg: ex.message, success: false };
    }
    return ret;
}

async function getWxVideoList(req, res, next) {
    let ret = {}
    try {
        let uniqId = req.query.uniqId; //'sphWsD5t6YVOycF';// 
        if (!uniqId || uniqId.length === 0) { ret = { code: -1, data: [], msg: '不正确的用户Id', success: false };res.json(ret); return;}
        let data = await getWXShipinhaoAuth(uniqId);
        if (data.code !== 1) return { code: -2, data: [], msg: data.msg, success: false }
        let cookies = data.auth.cookies;
        let finderUsername = data.auth.finderUsername;
        let headers = data.auth.headers;
        headers.cookie = cookies;
        /*const headers = {
            "Host": "channels.weixin.qq.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain",
            "sec-ch-ua": `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
            "Content-Type": "application/json",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://channels.weixin.qq.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://channels.weixin.qq.com/platform/post/list",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "finger-print-device-id": "d083cbb244a6b647f36a119bd68dcd2a",
            "x-wechat-uin": "2004917399",
            "Cookie": cookieStr
        }*/
        let pageSize = (!req.query.pageSize ? 20 : req.query.pageSize);
        let currPage = (!req.query.currPage ? 1 : req.query.currPage);
        let userpageType = (!req.query.userpageType ? 11 : req.query.userpageType);
        let body = {
            "pageSize": pageSize,
            "currentPage": currPage,
            "userpageType": userpageType,//视频查询时为11，图文查询时为10
            "timestamp": (new Date().getTime()) + '',
            "_log_finder_uin": "",
            "_log_finder_id": finderUsername,
            "rawKeyBuff": null,
            "pluginSessionId": null,
            "scene": 7,
            "reqScene": 7
        }
        const url = `https://channels.weixin.qq.com/cgi-bin/mmfinderassistant-bin/post/post_list?_rid=${generateRid()}`;
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = { code: 1, data: json.data.list, total: json.data.totalCount, msg: 'success', success: true };  })
            .catch(err => { ret = { code: -2, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    res.json(ret);
}
//v2_060000231003b20faec8c7e4881bc3d3cc0cef3db0779b3fea900c131517c8e714188a0e0162@finder
async function getLoginWxVideoUserInfo(cookies) {
    try {
        let cookieStr = '';
        cookies.forEach((item) => { cookieStr += `${item.name}=${item.value};`; })
        let webCookies = `RK=nD4gV81HFb; ptcz=7e52cb993a87631104883af7710d6cf79556a96e391e55c16c225fd2f83e25a9; pgv_pvi=9844152320; tvfe_boss_uuid=0014fec39dbada80; pgv_pvid=1340644492; fqm_pvqid=97c19b90-7c65-48d1-a657-fe784594c23c; qq_domain_video_guid_verify=54992a18c647b220; _qimei_uuid42=17c1f13121b100789f90524d39f0170beb01a06d86; _qimei_fingerprint=51048f199c68c2cf24a6d792dd51acf3; _qimei_q36=; _qimei_h38=5cd253cd9f90524d39f0170b0200000c617c1f; o_cookie=441619806; logTrackKey=8509328d834d4baa91b8bb0ffc373e9a; _clck=3093523713|1|fmq|0; promotewebsessionid=BgAAnYEQBUMZKgy%2Bfu1xPHWlDEBWCTQlcBNoPw1RVHuBBfK3VFlztLAtqF2rnxsWQ7i3v%2F5ZWB8maXhcwXp3FQpZR4%2BjFfhS86nw;${cookieStr}`
        const headers = {
            "Host": "channels.weixin.qq.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
            "Content-Type": "application/json",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://channels.weixin.qq.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://channels.weixin.qq.com/platform/post/list",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "finger-print-device-id": "d083cbb244a6b647f36a119bd68dcd2a",
            "x-wechat-uin": "2004917399",
            "Cookie": cookieStr // "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
            //"cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; acw_tc=0a00076417307698525125973e5037a2a8a2e1a10f6e4085365c700591820d; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=70bcd5ef-1123-4935-984b-ce76da5ecb28"
        }
    }
    catch (ex) {

    }
}
/**
 * 微信视频号API访问时需要的查询参数_rid
 */
async function generateRid() {
    const e = Math.floor(Date.now() / 1e3);
    const t = e.toString(16);
    const i = [...Array(8)].map(() => Math.floor(16 * Math.random()).toString(16)).join("");
    return `${t}-${i}`;
}
/**
 * 
关键词查询
 */
async function queryKeyword(req, res, next) {
    let ret = {};

    let body = undefined;
    let requestType = req.body.requestType;
    if (requestType === 'search') {
        let strKeyword = req.body.keywords;
        if (!strKeyword || strKeyword.trim().length === 0) {
            ret = { code: -2, data: [], msg: '没有关键词！', success: false }
        }
        else {
            let keywords = strKeyword.replaceAll('，', ',').split(',').filter(item => item.trim() !== '');
            body = {
                "requestType": requestType,
                "trackId": await genTrackId(),
                "priceUplift": 0,
                "keywordContainsFilter": "",
                "keywordNotContainsFilter": "",
                "recommendReasonFilter": [],
                "filterPurchasedWord": 0,
                "keywordSearchList": keywords,
                "highEffectRec": 0
            };
        }
    }
    else if (req.body.requestType === 'industry') {
        let taxonomyId = req.body.taxonomyId;
        if (!taxonomyId || taxonomyId.trim().length === 0) {
            ret = { code: -3, data: [], msg: '没有行业类别！', success: false }
        }
        else {
            body = {
                "requestType": "industry",
                "trackId": await genTrackId(),
                "priceUplift": 0,
                "keywordContainsFilter": "",
                "keywordNotContainsFilter": "",
                "recommendReasonFilter": [],
                "filterPurchasedWord": 0,
                "fakeUnitId": 0,
                "taxonomyId": taxonomyId
            }
        }
    }
    if (body === undefined) {
        res.json(ret);
        return;
    }

    try {
        const url = 'https://ad.xiaohongshu.com/api/leona/rtb/tool/keyword/common/recommend';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr // "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
            //"cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; acw_tc=0a00076417307698525125973e5037a2a8a2e1a10f6e4085365c700591820d; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=70bcd5ef-1123-4935-984b-ce76da5ecb28"
        }

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    res.json(ret);
}
async function KeywordTop3(req, res, next) {
    let ret = {};
    let strKeyword = req.body.keywords;
    if (!strKeyword || strKeyword.trim().length === 0) {
        ret = { code: -2, data: [], msg: '没有关键词', success: false }
    }
    else {
        let keywords = strKeyword.replaceAll('，', ',').split(',').filter(item => item.trim() !== '');
        try {
            const url = 'https://ad.xiaohongshu.com/api/leona/spotlight_data/chartview/4028';
            const cookieStr = await getCookies();
            const headers = {
                "Host": "ad.xiaohongshu.com",
                "Connection": "keep-alive",
                "sec-ch-ua-platform": "Windows",
                "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
                "Content-Type": "application/json;charset=UTF-8",
                "sec-ch-ua-mobile": "?0",
                "Origin": "https://ad.xiaohongshu.com",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
                "Cookie": cookieStr // "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
                //"cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; acw_tc=0a00076417307698525125973e5037a2a8a2e1a10f6e4085365c700591820d; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=70bcd5ef-1123-4935-984b-ce76da5ecb28"
            }
            const body = {
                "taxonomyCodes": ["c3c0751054b8400cac509e056f524889"],
                "timeRange": "90",
                "startTime": "2024-08-25",
                "endTime": "2024-11-22",
                "keywords": keywords,//["长久","伟哥"],
                "comparisonType": "industryAvg",
                "dimensionIndex": "adsImpNum"
            }

            await fetch(url, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: headers,
            }
            ).then((res) => res.json())
                .then((json) => { ret = json; })
                .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
        }
        catch (ex) {
            ret = { code: -999, data: [], msg: ex.message, success: false }
        }
    }
    res.json(ret);
}
async function HotNote(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/leona/excellent/note/hot/index';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const body = { placement: 2, firstCategory: "", marketingTarget: 4, noteType: 1, order: 0 };

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}
async function Taxonomy(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/leona/rtb/tool/keyword/industry/taxonomy';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }

        await fetch(url, { method: 'GET', headers: headers, })
            .then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}
async function KeywordsInsight(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/idea/edith/traffic/chartview/4026';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr  //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const curDate = new Date();
        const start = formatDate(new Date(curDate.getTime() - (2 * 24 * 60 * 60 * 1000)));
        const end = formatDate(new Date(curDate.getTime() - (91 * 24 * 60 * 60 * 1000)));
        const body = { taxonomyCodes: ["738220ab512245298c81b38f6a04b5f9"], startTime: start, endTime: end, dimensionIndex: "searchNumWord", selectedCodes: ["全部"], trafficSearchWordList: [], filterBrandWord: 1 };
        //const body = {taxonomyCodes:["All"],startTime:"2024-10-30",endTime:"2024-11-05",dimensionIndex:"searchNumWord",selectedCodes:["全部"],trafficSearchWordList:[],filterBrandWord:1};

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}
/**
 * 单个关键词图表分析
 */
async function KeywordChart(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/idea/edith/traffic/chartview/15010';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr
            //"Cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const curDate = new Date();
        const start = formatDate(new Date(curDate.getTime() - (2 * 24 * 60 * 60 * 1000)));
        const end = formatDate(new Date(curDate.getTime() - (91 * 24 * 60 * 60 * 1000)));
        const body = {
            "startTime": start,
            "endTime": end,
            "trafficSearchWordList": "褪黑素"
        }

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}
/*
 关键词分析整体数据 
 */
async function KeywordChart_Whole(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/idea/edith/traffic/chartview/15011';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr  //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const curDate = new Date();
        const start = formatDate(new Date(curDate.getTime() - (2 * 24 * 60 * 60 * 1000)));
        const end = formatDate(new Date(curDate.getTime() - (91 * 24 * 60 * 60 * 1000)));
        const body = {
            "startTime": start,
            "endTime": end,
            "trafficSearchWordList": ["鱼油", "益生菌", "褪黑素", "叶黄素"]
        }

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}

function genTraceId() {
    let traceId = "";
    for (let t = 0; t < 16; t++) traceId += "abcdef0123456789".charAt(Math.floor(16 * Math.random()));
    return traceId;
}
async function genTrackId() {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/leona/external/api/trackId/generate';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr  //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }

        await fetch(url, { method: 'POST', headers: headers, })
            .then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false }
    }
    if (ret.code === 0 && ret.data && ret.data.length >= 8) {
        let track = ret.data.substring(8);
        return `${track.substring(0, 8)}-${track.substring(8, 12)}-${track.substring(12, 16)}-${track.substring(16, 20)}-${track.substring(20)}`;
    }
    else return 'c3ae67a5-5b39-42df-99ff-2cec60186a63';
}
function formatDate(date) {
    const year = timer.getFullYear()
    const month = timer.getMonth() + 1 // 由于月份从0开始，因此需加1
    const day = timer.getDate()
    const hour = timer.getHours()
    const minute = timer.getMinutes()
    const second = timer.getSeconds()
    return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}
function pad(timeEl, total = 2, str = '0') {
    return timeEl.toString().padStart(total, str)
}
async function getXHSADCookies() {
    let ret = "";
    try {
        const url = 'https://ad.xiaohongshu.com/';
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto(url);
        const elm = await page.$('div.css-404bxh');
        const loginBtn = await page.$('button.beer-login-btn');
        await elm.click();

        const xhsAcc = process.env.XHS_AD_ACCOUNT || 'K3DY2022gz-TFJ@2925.com';
        const xhsPwd = process.env.XHS_AD_PASSWORD || 'TFJ1234@';

        await page.$eval("input[name='email']", (el, value) => {
            el.value = value; // 设置input的value
            el.dispatchEvent(new Event('input', { bubbles: true })); // 触发input事件
        }, xhsAcc);

        await page.$eval("input[name='password']", (el, value) => {
            el.value = value; // 设置input的value
            el.dispatchEvent(new Event('input', { bubbles: true })); // 触发input事件
        }, xhsPwd);

        const newPagePromise = new Promise((x) => { browser.once('targetchanged', (target) => { return x(target.page()); }) });//创建newPagePromise对象

        loginBtn.click();
        const newPage = await newPagePromise;//声明一个newPage对象
        let cookies = await newPage.cookies();
        //let newUrl = await newPage.url();//获取新页面的链接
        await newPage.close();
        //console.log('newUrl = ', newUrl);
        await browser.close();
        ret = cookies;
    }
    catch (ex) {
        ret = ""
    }
    return ret;
}
async function XHSAdAuth(req, res, next) {
    let ret = {}
    try {
        var fromWeb = false;
        var option = await Option.findOne({ where: { key: 'xhs_ad_auth' }, raw: true });

        if (!option) fromWeb = true;
        else if (!option.value) fromWeb = true;
        else {
            const jsonAuth = Base64ToJson(option.value);
            const accessToken = jsonAuth.find(item => item.name === 'access-token-ad.xiaohongshu.com');
            if (!accessToken) fromWeb = true;
            else if (accessToken.expires * 1000 <= new Date()) fromWeb = true;
        }
        if (fromWeb) {
            const cookies = await getXHSADCookies();
            if (cookies) {
                const base64Str = Buffer.from(JSON.stringify(cookies)).toString('base64');
                let newOption = { key: 'xhs_ad_auth', value: base64Str };
                if (option) await Option.update({ value: base64Str }, { where: { key: 'xhs_ad_auth' } });
                else await Option.create(newOption);
            }
            option = await Option.findOne({ where: { key: 'xhs_ad_auth' }, raw: true });
        }
        ret = { code: 0, data: option.value, msg: 'success', success: false }
    }
    catch (ex) {
        ret = { code: -999, data: null, msg: ex.message, success: false }
    }
    res.json(ret);
}
function Base64ToJson(base64Str) {
    const buffer = Buffer.from(base64Str, 'base64');
    const retStr = buffer.toString('utf8');
    const retJson = JSON.parse(retStr);
    return retJson;
}
async function getCookies() {
    try {
        var fromWeb = false;
        var option = await Option.findOne({ where: { key: 'xhs_ad_auth' }, raw: true });

        if (!option) fromWeb = true;
        else if (!option.value) fromWeb = true;
        else {
            const jsonAuth = Base64ToJson(option.value)
            const accessToken = jsonAuth.find(item => item.name === 'access-token-ad.xiaohongshu.com');
            if (!accessToken) fromWeb = true;
            else if (accessToken.expires * 1000 <= new Date()) fromWeb = true;
        }
        if (fromWeb) {
            const cookies = await getXHSADCookies();
            if (cookies) {
                const base64Str = Buffer.from(JSON.stringify(cookies)).toString('base64');
                let newOption = { key: 'xhs_ad_auth', value: base64Str };
                if (option) await Option.update({ value: base64Str }, { where: { key: 'xhs_ad_auth' } });
                else await Option.create(newOption);
            }
            option = await Option.findOne({ where: { key: 'xhs_ad_auth' }, raw: true });
        }
        const arrCookies = Base64ToJson(option.value)
        var ret = "";
        arrCookies.forEach(item => { ret += `${item.name}=${item.value};` });
        return ret;
    }
    catch (ex) {
        console.log('getXHSADCookies error: ', ex.message);
        return "";
    }
}
/*
获取内容广场的查询条件数据
*/
async function ContentQueryFilter(req, res, next) {
    let ret = {};
    try {
        const url = 'https://edith.xiaohongshu.com/api/pgy/content_square/attribute/item/list?platform=2';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }

        await fetch(url, {
            method: 'GET',
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false };
    }
    res.json(ret);
}
/*
内容广场
*/
async function getContentSquare(req, res, next) {
    let ret = {};
    try {
        const url = 'https://edith.xiaohongshu.com/api/pgy/content_square/search_note_v2';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        let searchWord = (!req.body.searchWord ? "" : req.body.searchWord);
        let bizType = (!req.body.bizType ? '2' : req.body.bizType);
        let orderBy = (!req.body.orderBy ? 'premium_good_read_rate' : req.body.orderBy);
        const body = {
            bizType: bizType,
            nd: "30",
            orderBy: orderBy,
            searchWord: searchWord,
            pageSize: 100,
            pageNum: 1,
        }
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false };
    }
    res.json(ret);
}
/**
 * 热门标题词一级行业
 */
async function getFirstCategory(req, res, next) {
    let ret = {};
    try {
        const url = 'https://ad.xiaohongshu.com/api/leona/excellent/note/hot/first_category/3';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        await fetch(url, {
            method: 'GET',
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false };
    }
    res.json(ret);
}
/**
 * 热门标题词二级行业
 */
async function getSecondCategory(req, res, next) {
    let ret = {};
    try {
        let firstCategory = req.body.firstCategory;
        const url = 'https://ad.xiaohongshu.com/api/leona/excellent/note/hot/second_category';
        const cookieStr = await getCookies();
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": genTraceId(),//"76b9c3ced9e2c22c",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "sec-ch-ua": `"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"`,
            "Content-Type": "application/json;charset=UTF-8",
            "sec-ch-ua-mobile": "?0",
            "Origin": "https://ad.xiaohongshu.com",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty",
            "Referer": "https://ad.xiaohongshu.com/aurora/ad/good_ideas?uba_pre=18.aurora_home..1730701575672&uba_ppre=18.aurora_login..1730691243881&uba_index=9",
            "Accept-Encoding": "gzip, deflate, br, zstd",
            "Accept-Language": "en-US,en-GB-oxendict;q=0.9,en;q=0.8,zh;q=0.7,zh-CN;q=0.6",
            "Cookie": cookieStr //"abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const body = {
            "firstCategory": firstCategory,
            "type": "3"
        }
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: headers,
        }
        ).then((res) => res.json())
            .then((json) => { ret = json; })
            .catch(err => { ret = { code: -1, data: [], msg: err.message, success: false }; })
    }
    catch (ex) {
        ret = { code: -999, data: [], msg: ex.message, success: false };
    }
    res.json(ret);
}
module.exports = {
    getWXVideoCookies,
    getWXVideoUsers,
    getWxVideoList,
    HotNote,
    queryKeyword,
    Taxonomy,
    KeywordsInsight,
    KeywordChart,
    KeywordChart_Whole,
    XHSAdAuth,
    KeywordTop3,
    ContentQueryFilter,
    getContentSquare,
    getFirstCategory,
    getSecondCategory
};