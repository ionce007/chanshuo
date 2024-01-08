const { lexer, parser } = require('marked');
const fs = require('fs');
const crypto = require('crypto');

function titleToLink(title) {
  return title.trim().replace(/\s/g, '-');
}

function getDate(format, dateStr) {
  if (format === undefined || format === 'default')
    format = 'yyyy-MM-dd hh:mm:ss';
  let date;
  if (dateStr) {
    date = new Date(dateStr);
  } else {
    date = new Date();
  }
  const o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    S: date.getMilliseconds()
  };

  if (/(y+)/.test(format)) {
    format = format.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    );
  }

  for (let k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      );
    }
  }
  return format;
}

function md2html(markdown) {
  return parser(lexer(markdown));
}

function parseTagStr(tag) {
  let tags = tag.split(';');
  let category = undefined;
  if (tags.length !== 0) {
    category = tags.shift();
  }
  return [category, tags];
}

async function fileExists(path) {
  return !!(await fs.promises.stat(path).catch(e => false));
}

const saltLength = 16;

function hashPasswordWithSalt(password) {
  const salt = crypto.randomBytes(Math.ceil(saltLength / 2)).toString('hex').slice(0, saltLength);
  const hash = crypto.createHmac('sha512', salt);
  hash.update(password);
  const hashedPassword = hash.digest('hex');
  return salt + hashedPassword;
}

function checkPassword(plainTextPassword, hashedPasswordWithSalt) {
  const salt = hashedPasswordWithSalt.substring(0, saltLength);
  const realHashedPassword = hashedPasswordWithSalt.substring(saltLength);
  const hash = crypto.createHmac('sha512', salt);
  hash.update(plainTextPassword);
  const hashedPassword = hash.digest('hex');
  return hashedPassword === realHashedPassword;
}

function DateAdd ( date, strInterval, number) {
  //y年 q季度 m月 d日 w周 h小时 n分钟 s秒 ms毫秒
  var dtTmp = date; //this;
  switch (strInterval) {
  case 's': return new Date(Date.parse(dtTmp) + (1000 * number));
  case 'n': return new Date(Date.parse(dtTmp) + (60000 * number));
  case 'h': return new Date(Date.parse(dtTmp) + (3600000 * number));
  case 'd': return new Date(Date.parse(dtTmp) + (86400000 * number));
  case 'w': return new Date(Date.parse(dtTmp) + ((86400000 * 7) * number));
  case 'q': return new Date(dtTmp.getFullYear(), (dtTmp.getMonth()) + number * 3, dtTmp.getDate(), dtTmp.getHours(), dtTmp.getMinutes(), dtTmp.getSeconds());
  case 'm': return new Date(dtTmp.getFullYear(), (dtTmp.getMonth()) + number, dtTmp.getDate(), dtTmp.getHours(), dtTmp.getMinutes(), dtTmp.getSeconds());
  case 'y': return new Date((dtTmp.getFullYear() + number), dtTmp.getMonth(), dtTmp.getDate(), dtTmp.getHours(), dtTmp.getMinutes(), dtTmp.getSeconds());
  }
};

function dateFormat(date, format) {
  if(typeof(date) !== 'object') date = new Date(date)
  const o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, // 小时
    'H+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    S: date.getMilliseconds(), // 毫秒
    a: date.getHours() < 12 ? '上午' : '下午', // 上午/下午
    A: date.getHours() < 12 ? 'AM' : 'PM', // AM/PM
  };
  if (/(y+)/.test(format)) {
    format = format.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
  }
  for (let k in o) {
    if (new RegExp('(' + k + ')').test(format)) {
      format = format.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      );
    }
  }
  return format;
}

function getRequestParams(paramsStr){
  const paramsArr=paramsStr.split('&');
  const query = {};
  paramsArr.forEach(item=>{
    const param=item.split("=");
    query[param[0]]=param[1];
  });
  return query;
}
function calcJsonFieldSum(jsonData, fieldKey) {
  const sum = jsonData.reduce((accumulator, item) => {
    const value = item[fieldKey];
    return accumulator + parseFloat(value);
  }, 0);

  return sum;
}
function Toast(msg, duration){  
  duration = isNaN(duration)?3000:duration;  
  var m = document.createElement('div');  
  m.innerHTML = msg;  
  m.style.cssText="font-size: .32rem;color: rgb(255, 255, 255);background-color: rgba(0, 0, 0, 0.6);padding: 10px 15px;margin: 0 0 0 -60px;border-radius: 4px;position: fixed;    top: 50%;left: 50%;width: 130px;text-align: center;";
  document.body.appendChild(m);  
  setTimeout(function() {  
      var d = 0.5;
      m.style.opacity = '0';  
      setTimeout(function() { document.body.removeChild(m) }, d * 1000);  
  }, duration);  
}  

module.exports = {
  titleToLink,
  parseTagStr,
  getDate,
  md2html,
  fileExists,
  hashPasswordWithSalt,
  checkPassword,
  DateAdd,
  dateFormat,
  getRequestParams,
  calcJsonFieldSum,
  Toast,
};
