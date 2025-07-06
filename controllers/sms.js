const { Op } = require('sequelize');
const { SMS } = require('../models');
const sequelize = require('sequelize');
const { v4: uuidv4 } = require('uuid');

async function showSMSPage(req, res, next){
    let phone = req.params.phone;
    try{
        var data = { code: 0, state: 'successed', msg: '获取数据成功！', phone: phone };
        res.render('sms', data);
    }
    catch(e){
        console.log('showSMSPage error: ', e.message);
        var data = { code: -1, state: 'failed', msg: e.message, phone: phone};
        res.render('sms', data);
    }
}
async function sendSMS(req, res, next){
    const phone = req.body.phone;
    if (!phone.trim()) {
        return res.json({ status: false, message: '没有输入手机号 或 验证码！' });
    }
    const isMobile = /^1[3-9]\d{9}$/.test(phone);
    if (!isMobile) {
        return res.json({ status: false, message: '输入的手机号不正确！' });
    }

    let sms = await SMS.findOne({ where: { [Op.and]: [{ phone }] } });
    console.log('sms = ', sms);
    let message = 'successed'
    const date = (new Date()).getTime();
    try {
        const createdAt = date;
        const updatedAt = date;
        const sendTime = date;
        if (sms) {
            let newSms = { sendTime, updatedAt }
            await sms.update(newSms, { where: { phone: phone } });
        }
        else sms = await SMS.create({ phone, sendTime, createdAt, updatedAt });
    }
    catch (e) {
        message = e.message

    }
    res.json({ status: sms !== undefined, message });
}
async function inputVerifyCode(req, res, next){
    const phone = req.body.phone;
    const verifyCode = req.body.verifyCode;
    if(!phone.trim() || !verifyCode.trim()){
        return res.json({status: false, message: '没有输入手机号 或 验证码！'});
    }
    const isMobile = /^1[3-9]\d{9}$/.test(phone);
    if(!isMobile){
        return res.json({ status: false, message: '输入的手机号不正确！' });
    }
    const isVerifyCode = /^\s*\d{6}\s*$/.test(verifyCode);
    if (!isVerifyCode) {
        return res.json({ status: false, message: '输入验证码不正确！' });
    }
    let sms = await SMS.findOne({ where: { [Op.and]: [{ phone }] } });
    let message = '验证码已输入!'
    state = false;
    try{
        const date = (new Date()).getTime();
        if(sms){
            const updatedAt = date;
            let newSms = {  verifyCode, updatedAt }
            console.log('sms = update');
            await sms.update(newSms, { where: { phone: phone } });
            state = true;
        }
        else {
            const createdAt = date;
            const updatedAt = date;
            console.log('sms = create');
            sms = await SMS.create({ phone, verifyCode, createdAt, updatedAt });
            state = true;
        }
    }
    catch(e){
        message = e.message
    }
    res.json({ status: state, message });
}

async function login(req, res, next){
    const phone = req.body.phone;
    const password = req.body.password;
    console.log('password = ', password)
    if (!phone.trim() || !password.trim()) {
        return res.json({ status: false, message: '没有输入手机号 或 密码！' });
    }
    const isMobile = /^1[3-9]\d{9}$/.test(phone);
    if (!isMobile) {
        return res.json({ status: false, message: '输入的手机号不正确！' });
    }
    let sms = await SMS.findOne({ where: { [Op.and]: [{ phone }] }, raw: true });
    const enPwd = password.trim();
    let message = '验证码已输入!'
    state = false;
    try {
        const date = (new Date()).getTime();
        if (sms) {
            if (sms.password === enPwd) { state = true; message = '登录成功！'; }
            else { state = false; message = '密码错误！';  }
        }
        else { state = false; message = '用户不存在';  }
    }
    catch (e) {
        console.log('err = ', e.message);
        message = e.message
    }
    res.json({ success: state, msg: message, data: sms });
}
async function getSMS(req, res, next){
    const phone = req.query.phone || req.params.phone;
    let message = 'successed'
    verifyCode = '';
    state = false;
    let createdAt = ''
    try{
        let sms = await SMS.findOne({ where: { [Op.and]: [{ phone }] } });
        if (sms) { 
            verifyCode = sms.verifyCode;
            state = true; 
            const milliseconds = String(sms.createdAt.getMilliseconds()).padStart(4, '0');
            createdAt = sms.createdAt.toDateString('yyyy-MM-dd HH:mm:ss') + `.${milliseconds}` }
        else { message = `未取到手机 ${phone} 的验证码`; verifyCode = "" };
    }
    catch(e){
        message = e.message
    }
    res.json({ status: state, verifyCode, message, createdAt });
}
module.exports = {
    showSMSPage,
    inputVerifyCode,
    getSMS,
    sendSMS,
    login,
};