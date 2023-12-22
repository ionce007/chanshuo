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

module.exports = {
    getAccessToken,
    bdPanAuthPage,
    getBaiduAuthCode,
};