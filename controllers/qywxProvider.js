var WXBizMsgCrypt = require('wechat-crypto');
var xml2js = require('xml2js');
const dotEnv = require('dotenv');
const { dateFormat } = require('../common/util');
dotEnv.config();

/*const corpId = process.env.QYWX_PROVIDER_CORPID;
const token = process.env.QYWX_PROVIDER_TOKEN;
const EncodingAESKey = process.env.QYWX_PROVIDER_EncodingAESKey;
const secret = process.env.QYWX_PROVIDER_SECRET;
const suiteId = process.env.QYWX_PROVIDER_ZNKF_SuiteID;
*/

const QYWX_OPTIONS_PROVIDER_APP = {
  corpId: 'ww23811fcbc79d3081',
  providerId: 'ww23811fcbc79d3081',
  token: 'TJNHBfOPmqprb5i4X',
  EncodingAESKey: 'XIq87eYsykpmaGwDTfN2xIVxsbhRtQWIjBOgm34XFJw',
  secret: 'Oke8LZxsAvtndz1v7pfLm3fudxlvOeaIn67iYOX5yaQ',
  suiteId: 'wwd383272c4cabb3dc',
}
const QYWX_OPTIONS_PROVIDER_COMM = {
  corpId: 'ww23811fcbc79d3081',
  providerId: 'ww23811fcbc79d3081',
  token: 'QrHseC',
  EncodingAESKey: 'iBxM4kNx2vlUfiQm4ii696FP3kRdRWkvHniYikNzwtO',
  secret: 'BXqAsqXT1niYNX320uYh48v3nqa7Ebx33hpkd2f1rDte7FI3WzLpKoCKfxjYXmFT',
}
const token = QYWX_OPTIONS_PROVIDER_APP.token;
const EncodingAESKey = QYWX_OPTIONS_PROVIDER_APP.EncodingAESKey;
const corpId = QYWX_OPTIONS_PROVIDER_APP.corpId;
const secret = QYWX_OPTIONS_PROVIDER_APP.secret;

const suiteId = QYWX_OPTIONS_PROVIDER_APP.suiteId;


async function qywx_callback(req, res, next) {

  time = dateFormat((new Date()), 'yyyy-MM-dd HH:mm:ss');
  console.log(`${time} enter qywxProvider.qywx_callback:`, `req.method = ${req.method}, 发起URL = “${req.path}”`);

  var method = req.method;
  //console.log(`${time}: req.method = ${method}`);
  var sVerifyMsgSig = req.query.msg_signature;
  var sVerifyTimeStamp = req.query.timestamp;
  var sVerifyNonce = req.query.nonce;
  var sVerifyEchoStr = req.query.echostr;//decodeURIComponent(req.query.echostr);
  //console.log('decodeURIComponent(req.query.echostr):',decodeURIComponent(req.query.echostr))
  //console.log('req.query.echostr:',req.query.echostr);
  var sEchoStr;
  var time = '';
  //服务商使用解密库时候，应当注意，get请求传入的是corpid，post请求时候需传入suiteid，需要将此函数放置到对应的post请求下面执行
  //var cryptor = new WXBizMsgCrypt(token, EncodingAESKey, corpId);
  /* GET home page. */
  if (method == 'GET') {
    time = dateFormat((new Date()), 'HH:mm:ss');
    var cryptor = new WXBizMsgCrypt(token, EncodingAESKey, corpId);
    //console.log('cryptor:',cryptor);
    var MsgSig = cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, sVerifyEchoStr);
    //console.log(`${time} cryptor.getSignature result:`, `MsgSig = ${MsgSig}, sVerifyMsgSig = ${sVerifyMsgSig}`);
    if (sVerifyMsgSig == MsgSig) {
      time = dateFormat((new Date()), 'HH:mm:ss');
      sEchoStr = cryptor.decrypt(sVerifyEchoStr).message;
      //console.log(`${time} cryptor.decrypt result:`, sEchoStr);
      res.send(sEchoStr);
    } else {
      time = dateFormat((new Date()), 'HH:mm:ss');
      //console.log(`${time} cryptor.getSignature failed:`, `-40001_invaild MsgSig`);
      res.send("-40001_invaild MsgSig")
    }
  }
  /* POST home page. */
  else if (method == 'POST') {
    time = dateFormat((new Date()), 'HH:mm:ss');
    //console.log(`${time} POST:`, `ok`);
    var cryptor = new WXBizMsgCrypt(token, EncodingAESKey, suiteId);

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
          //console.log(`0004，result：`,result);
          //console.log('result.xml:', result.xml);

          var xml = formatMessage(result.xml);

          var encryptMessage = xml.Encrypt;
          //var encryptMessage = result.xml.Encrypt[0];
          //console.log('encryptMessage:', encryptMessage);
          //console.log('sVerifyMsgSig:', sVerifyMsgSig);
          if (sVerifyMsgSig != cryptor.getSignature(sVerifyTimeStamp, sVerifyNonce, encryptMessage)) {
            //console.log(`0005`);
            return;
          }
          var decrypted = cryptor.decrypt(encryptMessage);
          //console.log('decrypted:', decrypted);
          var messageWrapXml = decrypted.message;
          //console.log('messageWrapXml:', messageWrapXml);
          if (messageWrapXml === '') {
            //console.log(`0006`);
            res.status(401).end('-40005_Invalid corpId');
            return;
          }
          xml2js.parseString(messageWrapXml, { trim: true }, function (err, result) {
            if (err) {
              //console.log(`0007`);
              var parseErr = new Error('-40008_BadMessage:' + err.name);
              parseErr.name = 'weChat';
            }
            console.log(`messageWrapXml.parseString：`, result.xml);
            var message = formatMessage(result.xml);
            //console.log(`messageWrapXml.message`, message);
            if (!message.hasOwnProperty('MsgType')) {
              console.log(`message.key`, `message中不包含 MsgType`);
              res.status(200).end('success');
              return;
            }
            var msgType = message.MsgType;
            var fromUsername = message.ToUserName;
            var toUsername = message.FromUserName;
            //var msg_1 = JSON.parse(message)
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
  try {
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
  catch (e) {
    console.log('错误：', e.message);
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
