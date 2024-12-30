const { DataTypes, Model } = require('sequelize');
const request = require('sync-request');
const crypto = require('crypto')
const { AccessToken } = require('../models');
//const { dateFormat } = require('../common/util');
const dotEnv  = require('dotenv');
dotEnv.config();

async function getAccessToken(req, res, next) {
    let ret = {};
    try {
        token = await AccessToken.findOne({where: { supplier: 'bdpan'  }}, { raw: true });
        ret = {status:true, msg:"get access token successed!", data: token };
    } catch (e) {
        ret = {status:true, msg:e.message, data: null };
    }
    res.json(ret);
}

async function bdPanAuthPage(req, res, next){
    var json = {};
    try{
        var code = 'code'
        var client_id = process.env.PAN_APIKEY
        var appKey = process.env.PAN_APIKEY;
        var secretKey = process.env.PAN_SECRETKEY;
        var redirect_uri = process.env.PAN_REDIRECT_URI;
        var scope = 'basic,netdisk';
        var device_id = process.env.PAN_APPID;
        var display = process.env.PAN_AUTH_DISPLAY;
        const codeUrl = `https://openapi.baidu.com/oauth/2.0/authorize?response_type=${code}&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&device_id=${device_id}&state=bdauth_code&display=${display}&force_login=1`;
        var header = {};  //  {'Host':'d.pcs.baidu.com'};
        var body = request("GET", codeUrl, header);
        json = {code: 1, status: 'successed', msg: 'ok',url: body.url};
        res.send(json);
    }
    catch(e){
        json = {code: -1, status: 'failed', msg: e.message,url: ''};
        res.send(json);
    }
}

async function getBaiduAuthCode(req, res, next){
    try{
        var code = req.query.code;
        var client_id = process.env.PAN_APIKEY;
        var client_secret = process.env.PAN_SECRETKEY;
        var redirect_uri =  process.env.PAN_REDIRECT_URI;
        var reqUrl = `https://openapi.baidu.com/oauth/2.0/token?grant_type=authorization_code&code=${code}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${redirect_uri}`;
        var header = {'User-Agent': 'pan.baidu.com'};  
        var ret = request("GET", reqUrl, header);
        var retJson = JSON.parse(ret.getBody('utf8'));
        var token = await AccessToken.findOne({where: { supplier: 'bdpan'  }}, { raw: true });
        var date = (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');// dateFormat( new Date(),'yyyy-MM-dd HH:mm:ss.S');
          
        if(!token){
            var newToken = {supplier:'bdpan',access_token:retJson.access_token,expires_in:retJson.expires_in,refresh_token:retJson.refresh_token,
                scope:retJson.scope,remark:'百度网盘Access Token',createdAt:date,updatedAt:date};
            await AccessToken.create(newToken);
        }
        else{
            accToken = await AccessToken.update(
                {access_token: retJson.access_token, refresh_token: retJson.refresh_token, expires_in: retJson.expires_in, updatedAt: date },
                { where: {supplier:'bdpan'} }
            );
        }
        res.redirect('/admin/#/accesstoken');
    }catch(e){
        console.log('获取授权失败！error:' + e.message);
        res.redirect('/accesstoken');
    }
}
async function xhsKeyword(req, res,next){
    let ret = {};
    try{
        const url = 'https://ad.xiaohongshu.com/api/leona/rtb/tool/keyword/common/recommend';
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": "76b9c3ced9e2c22c",
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
            "Cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
            //"cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; acw_tc=0a00076417307698525125973e5037a2a8a2e1a10f6e4085365c700591820d; websectiga=984412fef754c018e472127b8effd174be8a5d51061c991aadd200c69a2801d6; sec_poison_id=70bcd5ef-1123-4935-984b-ce76da5ecb28"
        }
        const body = {
            "requestType": "search",
            "trackId": "c3ae67a5-5b39-42df-99ff-2cec60186a63",
            "priceUplift": 0,
            "keywordContainsFilter": "",
            "keywordNotContainsFilter": "",
            "recommendReasonFilter": [],
            "filterPurchasedWord": 0,
            "keywordSearchList": ["冬装"],
            "highEffectRec": 0
        };

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers:headers,
        }
        ).then((res) => res.json())
        .then((json) => { ret = json; })
        .catch(err => {ret = {code:-1, data:[], msg:err.message, success: false};})
    }
    catch(ex){
        ret = {code:-1, data:[], msg:ex.message, success: false}
    }
    res.json(ret);
}
async function xhsHotNote(req, res, next){
    let ret = {};
    try{
        const url = 'https://ad.xiaohongshu.com/api/leona/excellent/note/hot/index';
        const headers = {
            "Host": "ad.xiaohongshu.com",
            "Connection": "keep-alive",
            "sec-ch-ua-platform": "Windows",
            "x-b3-traceid": "76b9c3ced9e2c22c",
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
            "Cookie": "abRequestId=c51bc519-a11e-5a3b-820c-1c1579fd5ba2; a1=1925dbf9797sxziwbbr5t2lhqifq1k0mh0y72aruv50000142933; webId=66377f2513ead606368645c50e97206a; gid=yjJ2fDi0J4xKyjJ2fDijW80FjWMCu3EDDF29v7hJ1xA3iW28AyT86J888y4Jjqq84S0SSj2K; web_session=04006979b79e033b547cb23034354b4c549131; customerClientId=519496491737058; x-user-id-ad-market.xiaohongshu.com=653a03a81100000000000009; x-user-id-pgy.xiaohongshu.com=653a03a81100000000000009; access-token-ad-market.xiaohongshu.com=customer.ad_market.AT-68c517432684842783109582vrzeomefb0djr5e8; xsecappid=aurora-shell; x-user-id-ad.xiaohongshu.com=653a03a81100000000000009; customer-sso-sid=68c517433262288368510013c93b36ee0e794840; ares.beaker.session.id=1730691243269046867729; access-token-ad.xiaohongshu.com=customer.leona.AT-68c517433262288251297847swqjmatnwgz8fchj; websectiga=29098a4cf41f76ee3f8db19051aaa60c0fc7c5e305572fec762da32d457d76ae; sec_poison_id=68b0d491-1d8a-49c0-91b6-864594b0f9f7; acw_tc=0a00070517307303148504214e5aaacd9951b3524eba0ce0a7702ed04222c5"
        }
        const body = {placement:2,firstCategory:"",marketingTarget:4,noteType:1,order:0};

        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers:headers,
        }
        ).then((res) => res.json())
        .then((json) => { ret = json; })
        .catch(err => {ret = {code:-1, data:[], msg:err.message, success: false};})
    }
    catch(ex){
        ret = {code:-1, data:[], msg:ex.message, success: false}
    }
    //console.log('ret = ',ret); 
    res.json(ret);
}
module.exports = {
    getAccessToken,
    bdPanAuthPage,
    getBaiduAuthCode,
    xhsHotNote,
    xhsKeyword,
};