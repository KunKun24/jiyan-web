(function () {
    var title = document.getElementById('pageTitle');
    var crumb = document.getElementById('pageCrumb');
    if (!title || !crumb) return;

    var groups = {
        '仪表盘': '概览',
        '应用实例': '业务', '子用户管理': '业务', '卡密管理': '业务',
        '云更新管理': '业务', '分类管理': '业务', '商品管理': '业务', '操作留痕': '业务',
        '账号设置': '设置', '本站信息': '设置',
        '对接文档': '文档'
    };

    function sync() {
        var name = (title.textContent || '').trim();
        crumb.textContent = '控制台 / ' + (groups[name] || '概览');
    }

    if (window.MutationObserver) {
        new MutationObserver(sync).observe(title, { childList: true, characterData: true, subtree: true });
    }
    sync();
})();
