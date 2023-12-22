const request = require('sync-request');
const crypto = require('crypto')
const {  AccessToken } = require('../models');
const {  DateAdd } = require('../common/util');
const dotEnv  = require('dotenv');
dotEnv.config();

function encrypt_md5(str){
    return crypto.createHash('md5').update(str).digest('hex');
}
function encrypt_sh1(str){
    return crypto.createHash('sha1').update(str).digest('hex')
}
async function wechatAuth(req, res, next){
    console.log('wechatAuth','req.method');
    console.log('req.method',req.method);
    let {signature = '', timestamp = '', nonce = '', echostr = ''} = req.query
    let token = process.env.WX_TOKEN
    // 验证token
    let str = [token, timestamp, nonce].sort().join('')
    let sha1 = encrypt_sh1(str)
    if (sha1 !== signature) {
        req.body = 'token验证失败'
        res.send('token验证失败')
    } else {
        req.body = echostr
        res.send(echostr)
    }
}
async function qyWechatAuth(req, res, next){
    console.log(req);
    let {msg_signature = '', timestamp = '', nonce = '', echostr = ''} = req.query
    console.log(`msg_signature = '${msg_signature}', timestamp = '${timestamp}', nonce = '${nonce}', echostr = '${echostr}'`)
    let token = process.env.QYWX_CS_TOKEN
    // 验证token
    let str = [token, timestamp, nonce].sort().join('')
    console.log(`str = ${str}`);
    let sha1 = encrypt_sh1(str)
    if (sha1 !== msg_signature) {
        console.log(`sha1 = ${sha1}, signature = ${msg_signature}`);
        req.body = 'token验证失败'
        res.send('token验证失败')
    } else {
        req.body = echostr
        res.send(echostr)
    }
}

async function qywxGetAccessTokenApi(req, res, next){
    try{
        var token = await AccessToken.findOne({where: { supplier: 'qywx_cs'  }}, { raw: true });
        console.log('wxhelper.qywxGetAccessToken.001',token);
        var isExpire = false;
        var notExistToken = false;
        var access_token = '';
        if(!token) notExistToken = true;
        else{
            var expireTime = DateAdd( token.updatedAt,'s',token.expires_in);
            if(Date.parse(expireTime) <= Date.parse(new Date())) isExpire = true;
            else access_token = token.access_token;
        }
        if(notExistToken || isExpire){
            const corpid = process.env.QYWX_CORPID;
            const secret = process.env.QYWX_CS_SECRET;
            console.log(`corpid=${corpid}，secret=${secret}`);
            var reqUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${secret}`
            var ret = request('GET', reqUrl);
            var json = JSON.parse(ret.getBody('utf8'))
            access_token = json.access_token;
            if(notExistToken) addNewWechat_CS_Token(json);
            else if(isExpire) updateWechat_CS_Token(json);
        }
        res.json({ state:true, msg:'ok', access_token:access_token});
    }
    catch(e){
        res.json({ state:false, msg:e.message, access_token:''});
    }
}

async function updateWechat_CS_Token(json){
    try{
        if(!token) return { state:false, msg:'no token!' };
        var oldToken = AccessToken.findOne({where: { supplier: 'qywx_cs'  }}, { raw: true });
        if(!oldToken) return { state:false, msg:'not exist token!' };
        let date =  (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
        var accToken = await AccessToken.update(
            {access_token: token.access_token, expires_in: token.expires_in, updatedAt: date },
            { where: {supplier:'qywx_cs'} }
        );
        return { state:true, msg:'update token successed!' };
    }
    catch(e){
        return { state:false, msg:e.message };
    }
}

async function addNewWechat_CS_Token(token){
    try{
        if(!token) return { state:false, msg:'no token!' };
        let date =  (new Date()).toDateString('yyyy-MM-dd HH:mm:ss.SSS');
        accToken = await AccessToken.create({
          supplier:'qywx_cs', access_token:token.access_token, expires_in:token.expires_in,
          refresh_token:'', scope:'', remark: '企业微信客服应用Access Token',
          updatedAt: date, createddAt: date
        });
        return { state:true, msg:'add new token successed!' };
    }
    catch(e){
        return { state:false, msg:e.message };
    }
}

async function qywxGetAccessToken(){
    try{
        var token = await AccessToken.findOne({where: { supplier: 'qywx_cs'  }}, { raw: true });
        var isExpire = false;
        var notExistToken = false;
        var access_token = '';
        if(!token) notExistToken = true;
        else{
            var expireTime = DateAdd( token.updatedAt,'s',token.expires_in);
            if(Date.parse(expireTime) <= Date.parse(new Date())) isExpire = true;
            else access_token = token.access_token;
        }
        if(notExistToken || isExpire){
            const corpid = process.env.QYWX_CORPID;
            const secret = process.env.QYWX_CS_SECRET;
            console.log(`corpid=${corpid}，secret=${secret}`);
            var reqUrl = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${corpid}&corpsecret=${secret}`
            var ret = request('GET', reqUrl);
            var json = JSON.parse(ret.getBody('utf8'))
            access_token = json.access_token;
            if(notExistToken) addNewWechat_CS_Token(json);
            else if(isExpire) updateWechat_CS_Token(json);
        }
        return { state:true, msg:'ok', access_token:access_token};
    }
    catch(e){
        return { state:false, msg:e.message, access_token:''};
    }
}

async function qywxReceiveMsg(req, res, next){
    try{

    }
    catch(e){
        res.json({ state:false, msg:e.message, access_token:''});
    }
}

module.exports = {
    wechatAuth,
    qyWechatAuth,
    qywxGetAccessTokenApi,
    qywxReceiveMsg,
};