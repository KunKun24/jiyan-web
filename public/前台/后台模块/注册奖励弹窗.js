/* ===================================================================
   极验云 · 注册赠送弹窗
   注册后首次进入用户后台时展示一次，展示后回写标记不再出现。
   数据：/api/账号接口入口.php?action=register_reward
   =================================================================== */
(function () {
  'use strict';

  var API = '/api/账号接口入口.php';
  var shown = false;

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function esc(s) {
    var m = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&' + m[c] + ';'; });
  }

  var ICONS = {
    balance: '<i class="fas fa-coins"></i>',
    app_quota: '<i class="fas fa-cubes"></i>',
    card_balance: '<i class="fas fa-ticket"></i>',
    cloud_times: '<i class="fas fa-cloud-arrow-up"></i>'
  };

  function injectStyle() {
    if (document.getElementById('jyRwStyle')) return;
    var st = document.createElement('style');
    st.id = 'jyRwStyle';
    st.textContent = [
      '.jy-rw-mask{position:fixed;inset:0;z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .22s ease;}',
      '.jy-rw-mask.jy-show{opacity:1;}',
      '.jy-rw-box{width:100%;max-width:430px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 26px 80px rgba(15,23,42,.36);transform:translateY(16px) scale(.97);transition:transform .26s cubic-bezier(.22,.61,.36,1);}',
      '.jy-rw-box.jy-in{transform:none;}',
      '.jy-rw-head{padding:26px 24px 18px;background:linear-gradient(135deg,#1e90ff,#4f7cff 55%,#7c5cff);color:#fff;text-align:center;}',
      '.jy-rw-head h3{margin:0 0 6px;font-size:20px;font-weight:800;letter-spacing:.5px;}',
      '.jy-rw-head p{margin:0;font-size:13px;opacity:.9;}',
      '.jy-rw-list{padding:18px 22px 6px;}',
      '.jy-rw-item{display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid #eef2f7;border-radius:14px;margin-bottom:10px;background:#f8fafc;}',
      '.jy-rw-ico{flex:0 0 42px;width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;background:linear-gradient(135deg,#1e90ff,#5b8cff);}',
      '.jy-rw-ico.k2{background:linear-gradient(135deg,#12b886,#2bd9a3);}',
      '.jy-rw-ico.k3{background:linear-gradient(135deg,#f59f00,#ffc94d);}',
      '.jy-rw-ico.k4{background:linear-gradient(135deg,#7c5cff,#a78bfa);}',
      '.jy-rw-txt{flex:1;min-width:0;}',
      '.jy-rw-txt b{display:block;font-size:14px;color:#0f172a;font-weight:700;line-height:1.4;}',
      '.jy-rw-txt span{display:block;font-size:12px;color:#64748b;margin-top:2px;}',
      '.jy-rw-foot{padding:10px 22px 20px;}',
      '.jy-rw-btn{width:100%;border:none;border-radius:13px;padding:13px 20px;font-size:15px;font-weight:700;color:#fff;cursor:pointer;background:linear-gradient(135deg,#1e90ff,#4f7cff);box-shadow:0 10px 24px rgba(30,144,255,.3);transition:transform .15s,box-shadow .15s;}',
      '.jy-rw-btn:hover{transform:translateY(-1px);box-shadow:0 14px 28px rgba(30,144,255,.36);}'
    ].join('');
    document.head.appendChild(st);
  }

  function render(items) {
    injectStyle();
    var mask = document.createElement('div');
    mask.className = 'jy-rw-mask';
    var list = items.map(function (it, i) {
      var type = String(it.type || '');
      var icon = ICONS[type] || '<i class="fas fa-gift"></i>';
      var k = type === 'app_quota' ? ' k2' : (type === 'card_balance' ? ' k3' : (type === 'cloud_times' ? ' k4' : ''));
      return '<div class="jy-rw-item">'
        + '<div class="jy-rw-ico' + k + '">' + icon + '</div>'
        + '<div class="jy-rw-txt"><b>' + esc(it.text || '') + '</b>'
        + '<span>已发放到您的账号</span></div></div>';
    }).join('');
    mask.innerHTML = '<div class="jy-rw-box" role="dialog" aria-modal="true" aria-label="注册赠送">'
      + '<div class="jy-rw-head"><h3>欢迎加入极验云</h3><p>注册礼包已到账，感谢您的支持</p></div>'
      + '<div class="jy-rw-list">' + list + '</div>'
      + '<div class="jy-rw-foot"><button type="button" class="jy-rw-btn">收下礼包，开始使用</button></div>'
      + '</div>';
    document.body.appendChild(mask);
    requestAnimationFrame(function () {
      mask.classList.add('jy-show');
      var box = mask.querySelector('.jy-rw-box');
      if (box) box.classList.add('jy-in');
    });

    var btn = mask.querySelector('.jy-rw-btn');
    var close = function () {
      mask.classList.remove('jy-show');
      setTimeout(function () { if (mask.parentNode) mask.parentNode.removeChild(mask); }, 240);
      try {
        fetch(API + '?action=register_reward_ack', {
          method: 'POST', credentials: 'same-origin', cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        });
      } catch (e) {}
    };
    if (btn) btn.addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
  }

  function load() {
    if (shown) return;
    shown = true;
    var path = location.pathname;
    try { path = decodeURIComponent(path); } catch (e) {}
    if (path.indexOf('/后台页面/') === -1 && path.indexOf('用户后台') === -1) return;
    fetch(API + '?action=register_reward', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.success) return;
        var items = j.data && j.data.reward;
        if (!items || !items.length) return;
        render(items);
      })
      .catch(function () {});
  }

  ready(load);
})();
