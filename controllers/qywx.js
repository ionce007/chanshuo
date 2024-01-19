var WXBizMsgCrypt = require('wechat-crypto');
var xml2js = require('xml2js');
const dotEnv = require('dotenv');
const { dateFormat } = require('../common/util');
dotEnv.config();

var corpId = process.env.QYWX_CORPID;
//var token = process.env.QYWX_CS_TOKEN;
//var EncodingAESKey = process.env.QYWX_CS_EncodingAESKey;
var token = process.env.QYWX_CS_TOKEN;
var EncodingAESKey = process.env.QYWX_CS_EncodingAESKey;


async function qywx_callback(req, res, next) {
  //console.log('qywx_callback.000');
  var time = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss');
  console.log(`${time} enter qywx.qywx_callback:`, `req.method = ${req.method}, 发起URL = “${req.path}”`);

  var method = req.method;
  var sVerifyMsgSig = req.query.msg_signature;
  var sVerifyTimeStamp = req.query.timestamp;
  var sVerifyNonce = req.query.nonce;
  var sVerifyEchoStr = decodeURIComponent(req.query.echostr);
  var sEchoStr;
  //服务商使用解密库时候，应当注意，get请求传入的是corpid，post请求时候需传入suiteid，需要将此函数放置到对应的post请求下面执行
  var cryptor = new WXBizMsgCrypt(token, EncodingAESKey, corpId);
  /* GET home page. */
  if (method == 'GET') {
    var MsgSig = cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, sVerifyEchoStr);
    //console.log('qywx.qywx_callback.002', `MsgSig = ${MsgSig}, sVerifyMsgSig = ${sVerifyMsgSig}`);
    if (sVerifyMsgSig == MsgSig) {
      sEchoStr = cryptor.decrypt(sVerifyEchoStr).message;
      //console.log('qywx.qywx_callback.003', `ok`);
      res.send(sEchoStr);
    } else {
      res.send("-40001_invaild MsgSig")
    }
  }
  /* POST home page. */
  else if (method == 'POST') {
    load(req, function (err, buff) {
      var date = dateFormat(new Date(), 'yyyy-MM-dd HH:mm:ss.S');
      //console.log(`${date}`);
      try {
        if (err) {
          var loadErr = new Error('weChat load message error');
          loadErr.name = 'weChat';
          //console.log(`0001`);
          return;
        }
        var xml = buff.toString('utf-8');
        if (!xml) {
          //console.log(`0002`);
          var emptyErr = new Error('-40002_body is empty');
          emptyErr.name = 'weChat';
          return;
        }
        //console.log('XML:', xml);
        xml2js.parseString(xml, { trim: true }, function (err, result) {
          if (err) {
            //console.log(`0003`);
            var parseErr = new Error('-40008_parse xml error');
            parseErr.name = 'weChat';
            return;
          }
          //console.log('result.xml:', result.xml);
          
          var xml = formatMessage(result.xml);

          var encryptMessage = xml.Encrypt;
          if (sVerifyMsgSig != cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, encryptMessage)) {
            //console.log(`0005`);
            return;
          }
          var decrypted = cryptor.decrypt(encryptMessage);
          var messageWrapXml = decrypted.message;
          //console.log('messageWrapXml:', messageWrapXml);
          if (messageWrapXml === '') {
            res.status(401).end('-40005_Invalid corpId');
            return;
          }
          xml2js.parseString(messageWrapXml, { trim: true }, function (err, result) {
            if (err) {
              //console.log(`0007`);
              var parseErr = new Error('-40008_BadMessage:' + err.name);
              parseErr.name = 'weChat';
            }
            //console.log(`messageWrapXml.parseString：`,result.xml);
            var message = formatMessage(result.xml);
            //console.log(`messageWrapXml.message`,message);
            if(message.hasOwnProperty('InfoType')){
              const infoType = message.InfoType;
              //console.log('InfoType: ',infoType)
              switch(infoType){
                case 'create_auth':
                  res.send('success');
                  return;
                case 'suite_ticket':
                  res.send('success');
                  return;
              }
            }
            if(message.hasOwnProperty('MsgType')){
              var msgType = message.MsgType;
              var fromUsername = message.ToUserName;
              var toUsername = message.FromUserName;
              var msg_1 = JSON.parse(message)
              //console.log(`0008`, `msgType = ${msgType}, toUsername=${toUsername}, fromUsername=${fromUsername}, message=${msg_1}`);
              switch (msgType) {
                case 'text':
                  var sendContent = send(fromUsername, toUsername);
                  res.status(200).end(sendContent);
                  break;
                //其他逻辑根据业务需求进行处理
                case 'image':
                  break;
                case 'video':
                  break;
                case 'voice':
                  break;
                case 'location':
                  break;
                case 'link':
                  break;
                case 'event':
                  var event = message.Event;
                  console.log(event);
                  break;
              }
            }
          });
        });
      } catch (err) {
        console.log(`err = ${err.message}`);
        res.status(401).end('System Busy');
        return;
      }
    })
  }
}

/*
 * 接收数据块
 */
function load(stream, callback) {
  var buffers = [];
  stream.on('data', function (trunk) {
    buffers.push(trunk)
  });
  stream.on('end', function () {
    callback(null, Buffer.concat(buffers));
  });
  stream.once('error', callback);
}
/*!
 * 将xml2js解析出来的对象转换成直接可访问的对象
 */
function formatMessage(result) {
  try{
    let message = {};
    if (typeof result === 'object') {
      for (var key in result) {
        //console.log('formatMessage:', key, result[key]);
        if (!Array.isArray(result[key]) || result[key].length === 0) {
          //console.log('result[key].length === 0:', key);
          continue;
        }
        if (result[key].length === 1) {
          let val = result[key][0];
          //console.log('result[key].length === 1:', key, result[key][0]);
          if (typeof val === 'object') {
            //console.log("typeof val === 'object':", key);
            message[key] = formatMessage(val);
          } else {
            //console.log("message[key] = (val || '').trim():", val);
            message[key] = (val || '').trim();
          }
        } else {
          message[key] = [];
          result[key].forEach(function (item) {
            //console.log("result[key].forEach(function (item):", key, item);
            message[key].push(formatMessage(item));
          });
        }
      }
    }
    return message;
  }
  catch(e){
    console.log('错误：',e.message);
  }
}

/*!
 * 将回复消息封装成xml格式，其他类型，请按照业务需求重写该函数，或重新构造一个函数来进行业务支持
 */
function reply(fromUsername, toUsername) {
  var info = {};
  info.msgType = type;
  info.createTime = new Date().getTime();
  info.toUsername = toUsername;
  info.fromUsername = fromUsername;
  var body = '<xml>' +
    '<ToUserName><![CDATA[' + info.fromUsername + ']]></ToUserName>' +
    '<FromUserName><![CDATA[' + info.toUsername + ']]></FromUserName>' +
    '<CreateTime>' + info.createTime + '</CreateTime>' +
    '<MsgType><![CDATA[text]]></MsgType>' +
    '<Content><![CDATA[你好，同学！]]></Content>' +
    '</xml>';
  return body;
}
/*
 * 回复消息 将消息打包成xml并加密返回给用户
 * */
function send(fromUsername, toUsername) {

  var xml = reply(fromUsername, toUsername);
  var cryptor = new WXBizMsgCrypt(token, EncodingAESKey, corpId);
  var encrypt = cryptor.encrypt(xml);
  var nonce = parseInt((Math.random() * 100000000000), 10);
  var timestamp = new Date().getTime();
  var signature = cryptor.getSignature(timestamp, nonce, encrypt);
  var wrapTpl = '<xml>' +
    '<Encrypt><![CDATA[' + encrypt + ']]></Encrypt>' +
    ' <MsgSignature><![CDATA[' + signature + ']]></MsgSignature>' +
    '<TimeStamp>' + timestamp + '</TimeStamp>' +
    '<Nonce><![CDATA[' + nonce + ']]></Nonce>' +
    '</xml>';
  return wrapTpl;
}
module.exports = {
  qywx_callback,
}
