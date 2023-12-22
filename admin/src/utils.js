export const getDate = (dateStr) => {
  let format = 'yyyy-MM-dd hh:mm:ss';
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
    S: date.getMilliseconds(),
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
};
export const dateAdd = ( date, strInterval, number) => {
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
    default: return new Date(Date.parse(dtTmp) + (1000 * number));
  }
};
export const formatBytes = (a, b) => {
  if (0 === a) return "0 B";
  var c = 1024, d = b || 2, e = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], f = Math.floor(Math.log(a) / Math.log(c));
  return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f];
}

export const dateFormat = (date, format) => {
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