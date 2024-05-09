// 定义百分比
var per = 0
//var timer;
// setInterval 每隔一段时间调用
/*timer = setInterval(function () {
    $('.bar').css('width', per + '%');
    per += 1;
    //    if(per>100) per=0;
    if (per > 100) {
        $('.pageLoading').addClass('complete');

        setTimeout(function () {
            $('.monsterText').html('<h2>We Are Monster</h2>')
        }, 3000)
        clearInterval(timer);
    }
}, 30)*/
initLoading = function () {
    var html = "";
    html += "    <div class='pageLoading'>";
    html += "        <div class='monster'>";
    html += "            <div class='eye'>";
    html += "                <div class='eyeBall'></div>";
    html += "            </div>";
    html += "            <div class='mouth'></div>";
    html += "        </div>";
    html += "        <div class='loading'>";
    html += "            <div class='bar'></div>";
    html += "        </div>";
    html += "    </div>";
    $('body').append(html);
}
loading = function () {
    initLoading();
    return setInterval(function () {
        $('.bar').css('width', per + '%');
        per += 1;
        if (per > 100) per = 0;
    },30);
}
closeLoading = function (timer) {
    $('.pageLoading').addClass('complete');
    $('.pageLoading').remove();
    clearInterval(timer);
}