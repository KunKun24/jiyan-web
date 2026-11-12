/* ===================================================================
   极验云 · 全站公告弹窗（覆盖层，不改动用户端任何原始文件）
   数据来源：/api/console/api.php?action=pub_announcement
   =================================================================== */
(function () {
  'use strict';

  var API = '/api/console/api.php';
  var LS_PREFIX = 'jy_ann_seen_';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function esc(s) {
    var m = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&' + m[c] + ';'; });
  }

  function injectStyle() {
    if (document.getElementById('jyAnnStyle')) return;
    var st = document.createElement('style');
    st.id = 'jyAnnStyle';
    st.textContent = [
      '.jy-ann-mask{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:20px;',
      'background:rgba(15,23,42,.34);opacity:0;transition:opacity .22s ease;}',
      '.jy-ann-mask.jy-blur{backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);background:rgba(15,23,42,.26);}',
      '.jy-ann-mask.jy-show{opacity:1;}',
      '.jy-ann-box{width:100%;max-width:520px;max-height:82vh;display:flex;flex-direction:column;',
      'background:rgba(255,255,255,.97);border-radius:18px;overflow:hidden;',
      'box-shadow:0 24px 70px rgba(15,23,42,.32);transform:translateY(14px) scale(.98);transition:transform .24s cubic-bezier(.22,.61,.36,1);}',
      '.jy-ann-box.jy-in{transform:none;}',
      '.jy-ann-cover{width:100%;max-height:210px;object-fit:cover;display:block;background:#eef2f7;}',
      '.jy-ann-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 22px 10px;}',
      '.jy-ann-title{font-size:17px;font-weight:700;color:#0f172a;line-height:1.45;}',
      '.jy-ann-close{flex:0 0 auto;width:30px;height:30px;border:none;border-radius:9px;background:#f1f5f9;color:#64748b;',
      'cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .16s;}',
      '.jy-ann-close:hover{background:#e2e8f0;color:#1e293b;}',
      '.jy-ann-body{padding:0 22px 6px;overflow-y:auto;color:#334155;font-size:14px;line-height:1.78;}',
      '.jy-ann-body img{max-width:100%;height:auto;border-radius:10px;margin:8px 0;display:block;}',
      '.jy-ann-body p{margin:0 0 10px;}',
      '.jy-ann-body a{color:#1e90ff;}',
      '.jy-ann-foot{padding:14px 22px 18px;display:flex;justify-content:flex-end;}',
      '.jy-ann-ok{border:none;border-radius:11px;padding:10px 26px;font-size:14px;font-weight:600;color:#fff;cursor:pointer;',
      'background:#1e90ff;box-shadow:0 8px 20px rgba(30,144,255,.28);transition:all .18s;}',
      '.jy-ann-ok:hover{background:#1878db;}',
      '@media (max-width:845px){',
      '.jy-ann-box{max-height:86vh;border-radius:16px;}',
      '.jy-ann-title{font-size:16px;}',
      '.jy-ann-body{font-size:13.5px;}',
      '.jy-ann-head{padding:15px 16px 8px;}',
      '.jy-ann-body{padding:0 16px 4px;}',
      '.jy-ann-foot{padding:12px 16px 16px;}',
      '.jy-ann-ok{width:100%;}',
      '}'
    ].join('');
    document.head.appendChild(st);
  }

  function markSeen(id) {
    try { localStorage.setItem(LS_PREFIX + id, '1'); } catch (e) {}
    try {
      fetch(API + '?action=pub_ann_read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: id })
      });
    } catch (e) {}
  }

  function show(ann) {
    if (document.getElementById('jyAnnMask')) return;

    injectStyle();

    var mask = document.createElement('div');
    mask.id = 'jyAnnMask';
    mask.className = 'jy-ann-mask' + (Number(ann.blur_bg) === 1 ? ' jy-blur' : '');

    var html = '<div class="jy-ann-box">';
    if (ann.cover_url) {
      html += '<img class="jy-ann-cover" src="' + esc(ann.cover_url) + '" alt="">';
    }
    html += '<div class="jy-ann-head">' +
      '<div class="jy-ann-title">' + esc(ann.title) + '</div>' +
      '<button class="jy-ann-close" aria-label="关闭">&times;</button>' +
      '</div>' +
      '<div class="jy-ann-body">' + (ann.content || '') + '</div>' +
      '<div class="jy-ann-foot"><button class="jy-ann-ok">我知道了</button></div>' +
      '</div>';

    mask.innerHTML = html;
    document.body.appendChild(mask);

    requestAnimationFrame(function () {
      mask.classList.add('jy-show');
      var box = mask.querySelector('.jy-ann-box');
      if (box) box.classList.add('jy-in');
    });

    function close() {
      mask.classList.remove('jy-show');
      var box = mask.querySelector('.jy-ann-box');
      if (box) box.classList.remove('jy-in');
      setTimeout(function () {
        if (mask.parentNode) mask.parentNode.removeChild(mask);
      }, 240);
      if (Number(ann.show_once) === 1) markSeen(ann.id);
    }

    mask.querySelector('.jy-ann-close').onclick = close;
    mask.querySelector('.jy-ann-ok').onclick = close;
    mask.addEventListener('click', function (e) {
      if (e.target === mask) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    }, { once: true });
  }

  function boot() {
    // 只在登录页与后台页触发，避免两个页面重复弹窗
    // 注意：后台入口中文文件名在 URL 中会被百分号编码，需要先解码再判断
    var path = location.pathname;
    try { path = decodeURIComponent(path); } catch (e) {}
    if (!/(Login\.php|后台\.php|后台页面|\/index\.php$)/.test(path)) return;

    fetch(API + '?action=pub_announcement', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.success) return;
        var ann = j.data && j.data.announcement;
        if (!ann) return;
        // 后台「启用全站公告弹窗」关闭时，接口直接返回 disabled，这里不弹
        if (j.data && j.data.disabled === true) return;
        if (Number(ann.show_once) === 1) {
          try {
            if (localStorage.getItem(LS_PREFIX + ann.id) === '1') return;
          } catch (e) {}
          if (ann.read === true) {
            try { localStorage.setItem(LS_PREFIX + ann.id, '1'); } catch (e) {}
            return;
          }
        }
        // 延迟一点，等页面渲染完成再弹
        setTimeout(function () { show(ann); }, 700);
      })
      .catch(function () {});
  }

  ready(boot);
})();