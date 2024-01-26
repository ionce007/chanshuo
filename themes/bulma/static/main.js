function generateTOC() {
  const titles = getTitles();
  insertTOC(titles);
}

function getTitles() {
  const article = document.getElementById('article');
  const nodes = ['H2'];
  let titles = [];
  let count = 0;
  article.childNodes.forEach(function(e, i) {
    if (nodes.includes(e.nodeName)) {
      const id = 'h' + count++;
      e.setAttribute('id', id);
      titles.push({ id: id, text: e.innerHTML, level: Number(e.nodeName.substring(1, 2)), nodeName: e.nodeName });
    }
  });
  return titles;
}

function insertTOC(titles) {
  const toc = document.getElementById('toc');
  for (let i = 0; i < titles.length; i++) {
    let title = titles[i];
    let template = `<li><a href='#${title.id}'>${title.text}</a></li>`;
    toc.insertAdjacentHTML('beforeend', template);
  }
  if (titles.length === 0) {
    let tocContainer = document.getElementById('toc-container');
    if (tocContainer) {
      tocContainer.style.display = 'none';
    }
  }
}

async function submitArticlePassword(postId, passwordInputId, labelId, anchorId) {
  let password = document.getElementById(passwordInputId).value;
  if (!password) return;
  let res = await fetch(`/api/page/render/${postId}?password=${password}`);
  let data = await res.json();
  if (data.status) {
    document.getElementById(anchorId).style.display = 'none';
    document.getElementById(anchorId).insertAdjacentHTML('beforebegin', data.content);
    generateTOC();
  } else {
    document.getElementById(labelId).innerText = "密码错误，请重试！";
    document.getElementById(passwordInputId).value = '';
  }
}


Date.prototype.format = function(format) {
  var date = this;
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

function formatBytes(a, b)  {
  if (0 == a) return "0 B";
  var c = 1024, d = b || 2, e = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], f = Math.floor(Math.log(a) / Math.log(c));
  return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f];
}