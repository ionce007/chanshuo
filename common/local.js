class localUtils{
    constructor(){}

    formatBytes(a, b)  {
        if (0 == a) return "0 B";
        var c = 1024, d = b || 2, e = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"], f = Math.floor(Math.log(a) / Math.log(c));
        return parseFloat((a / Math.pow(c, f)).toFixed(d)) + " " + e[f];
    }
    DateAdd ( date, strInterval, number) {
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
    Toast(msg, duration) {  
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
}

module.exports = localUtils;