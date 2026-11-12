/* ===================================================================
   极验云 · 公告中心（右上角铃铛 + 历史公告抽屉）
   -------------------------------------------------------------------
   数据来源：/api/console/api.php?action=pub_ann_list
   设计要点：
     1. 铃铛用内联 SVG，不依赖 Font Awesome 字体子集
     2. 未读数量显示在铃铛右上角红点（>99 显示 99+）
     3. 抽屉从右侧滑出，PC 480px / 移动端全屏
     4. 列表项点击展开全文并自动标记已读
     5. 顶部「全部已读」+ 底部「加载更多」
     6. 完全独立，不影响原有 公告弹窗.js 的首次弹窗逻辑
   =================================================================== */
(function () {
  'use strict';

  var API = '/api/console/api.php';
  var LS_KEY = 'jy_ann_list_read';   // 本地已读兜底（未登录时用）

  var state = {
    page: 1,
    pages: 1,
    total: 0,
    unread: 0,
    loaded: false,
    expanded: {}
  };

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    var m = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": '#39' };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&' + m[c] + ';'; });
  }

  function localRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function setLocalRead(id) {
    try {
      var o = localRead();
      o[id] = 1;
      localStorage.setItem(LS_KEY, JSON.stringify(o));
    } catch (e) {}
  }

  /* ---------------- 样式 ---------------- */
  function injectStyle() {
    if ($('jyAnnCenterStyle')) return;

    /* 玻璃拟态令牌：与全站 style.css / 侧边栏.css / 头部栏.css 对齐
       浅色：半透明白 + 高光描边；深色：半透明黑 + 低亮描边 */
    var css = [
      /* ---------- 铃铛 ---------- */
      '.jy-bell-btn{position:relative;width:36px;height:36px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;',
      'padding:0;border:1px solid rgba(255,255,255,.85);border-radius:10px;',
      'background:rgba(255,255,255,.55);backdrop-filter:blur(10px) saturate(150%);-webkit-backdrop-filter:blur(10px) saturate(150%);',
      'color:#475569;cursor:pointer;box-shadow:0 4px 14px rgba(16,26,48,.08);',
      'transition:background .18s,transform .12s,color .18s,box-shadow .18s;}',
      '.jy-bell-btn:hover{background:rgba(47,124,246,.14);border-color:rgba(47,124,246,.35);color:#2f7cf6;',
      'transform:translateY(-1px);box-shadow:0 8px 22px rgba(47,124,246,.22);}',
      '.jy-bell-btn:active{transform:scale(.95);}',
      '.jy-bell-btn svg{width:19px;height:19px;display:block;fill:none;stroke:currentColor;stroke-width:1.9;',
      'stroke-linecap:round;stroke-linejoin:round;}',
      '.jy-bell-btn.jy-has-unread svg{animation:jyBellShake 2.6s ease-in-out infinite;}',
      '@keyframes jyBellShake{0%,88%,100%{transform:rotate(0)}90%{transform:rotate(-12deg)}93%{transform:rotate(10deg)}96%{transform:rotate(-6deg)}98%{transform:rotate(3deg)}}',
      '.jy-bell-dot{position:absolute;top:-4px;right:-4px;min-width:17px;height:17px;padding:0 4px;border-radius:9px;',
      'background:linear-gradient(135deg,#ff5a5f,#e5484d);color:#fff;font-size:10px;font-weight:700;line-height:17px;text-align:center;',
      'box-shadow:0 2px 8px rgba(229,72,77,.5),0 0 0 2px rgba(255,255,255,.92);display:none;font-variant-numeric:tabular-nums;}',
      '.jy-bell-dot.jy-on{display:block;}',

      /* ---------- 遮罩：深一点 + 毛玻璃，让背后真正虚化 ---------- */
      '.jy-anc-mask{position:fixed;inset:0;z-index:99990;opacity:0;transition:opacity .26s ease;',
      'background:rgba(15,23,42,.30);backdrop-filter:blur(5px) saturate(135%);-webkit-backdrop-filter:blur(5px) saturate(135%);}',
      '.jy-anc-mask.jy-on{opacity:1;}',

      /* ---------- 面板：浮起的玻璃卡片，四周留白 + 大圆角 ---------- */
      '.jy-anc-panel{position:fixed;top:14px;right:14px;bottom:14px;z-index:99991;width:470px;max-width:calc(100vw - 28px);',
      'display:flex;flex-direction:column;overflow:hidden;isolation:isolate;',
      'border-radius:22px;border:1px solid rgba(255,255,255,.9);',
      'background:linear-gradient(165deg,rgba(255,255,255,.54),rgba(243,248,255,.38) 55%,rgba(255,255,255,.50));',
      'backdrop-filter:blur(28px) saturate(180%);-webkit-backdrop-filter:blur(28px) saturate(180%);',
      'box-shadow:0 28px 80px rgba(15,23,42,.30),0 4px 14px rgba(15,23,42,.10),inset 0 1px 0 rgba(255,255,255,.95);',
      'transform:translateX(calc(100% + 24px));transition:transform .32s cubic-bezier(.22,.61,.36,1),opacity .24s ease;opacity:0;}',
      '.jy-anc-panel.jy-on{transform:none;opacity:1;}',
      /* 内部装饰光斑：让玻璃有“内容可透”的层次 */
      '.jy-anc-panel::before{content:"";position:absolute;inset:-40% -30% auto -30%;height:320px;z-index:-1;pointer-events:none;',
      'background:radial-gradient(58% 58% at 26% -4%,rgba(47,124,246,.34),transparent 68%),',
      'radial-gradient(48% 48% at 90% 6%,rgba(139,92,246,.30),transparent 70%),',
      'radial-gradient(40% 40% at 52% 38%,rgba(6,182,212,.14),transparent 72%);filter:blur(14px);}',
      '.jy-anc-panel::after{content:"";position:absolute;inset:auto -30% -30% -30%;height:340px;z-index:-1;pointer-events:none;',
      'background:radial-gradient(52% 52% at 72% 102%,rgba(18,184,134,.26),transparent 70%),',
      'radial-gradient(40% 40% at 18% 96%,rgba(47,124,246,.16),transparent 74%);filter:blur(18px);}',

      /* ---------- 头部 ---------- */
      '.jy-anc-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:10px;',
      'padding:17px 18px 14px;border-bottom:1px solid rgba(140,160,190,.20);position:relative;',
      'background:linear-gradient(180deg,rgba(255,255,255,.42),rgba(255,255,255,0));}',
      '.jy-anc-head::after{content:"";position:absolute;left:18px;right:18px;bottom:-1px;height:1px;',
      'background:linear-gradient(90deg,transparent,rgba(47,124,246,.42),rgba(139,92,246,.32),transparent);}',
      '.jy-anc-h-l{display:flex;align-items:center;gap:9px;min-width:0;}',
      '.jy-anc-h-l svg{width:18px;height:18px;color:#2f7cf6;fill:none;stroke:currentColor;stroke-width:1.9;',
      'stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto;}',
      '.jy-anc-h-t{font-size:15.5px;font-weight:700;color:#0f172a;white-space:nowrap;letter-spacing:.2px;}',
      '.jy-anc-h-n{font-size:12px;font-weight:600;color:#3b6fd4;background:rgba(47,124,246,.13);',
      'border:1px solid rgba(47,124,246,.22);border-radius:8px;padding:1px 8px;white-space:nowrap;}',
      '.jy-anc-h-r{display:flex;align-items:center;gap:6px;flex:0 0 auto;}',
      '.jy-anc-btn{height:30px;padding:0 11px;border:1px solid rgba(140,160,190,.28);border-radius:9px;',
      'background:rgba(255,255,255,.52);color:#475569;',
      'font-size:12.5px;font-weight:600;cursor:pointer;transition:all .16s;white-space:nowrap;',
      'display:inline-flex;align-items:center;justify-content:center;}',
      '.jy-anc-btn:hover{background:rgba(255,255,255,.95);border-color:rgba(47,124,246,.40);color:#2f7cf6;}',
      '.jy-anc-btn.jy-primary{background:linear-gradient(135deg,#2f7cf6,#4a9bff);color:#fff;border-color:transparent;',
      'box-shadow:0 4px 14px rgba(47,124,246,.28);}',
      '.jy-anc-btn.jy-primary:hover{filter:brightness(1.06);color:#fff;}',
      '.jy-anc-btn:disabled{opacity:.5;cursor:not-allowed;}',

      /* ---------- 列表 ---------- */
      '.jy-anc-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;',
      'padding:14px 14px 20px;',
      /* 极淡的双色渐变：让列表区不再是死白平面 */
      'background:radial-gradient(130% 56% at 50% -8%,rgba(47,124,246,.055),transparent 62%),',
      'radial-gradient(110% 52% at 50% 108%,rgba(139,92,246,.050),transparent 64%);}',
      '.jy-anc-body::-webkit-scrollbar{width:8px;}',
      '.jy-anc-body::-webkit-scrollbar-thumb{background:rgba(140,160,190,.35);border-radius:8px;}',
      '.jy-anc-body::-webkit-scrollbar-thumb:hover{background:rgba(140,160,190,.55);}',
      '.jy-anc-body::-webkit-scrollbar-track{background:transparent;}',

      '.jy-anc-item{position:relative;border:1px solid rgba(140,160,190,.20);border-radius:15px;margin-bottom:11px;',
      'overflow:hidden;background:rgba(255,255,255,.46);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
      'box-shadow:0 2px 10px rgba(16,26,48,.05),inset 0 1px 0 rgba(255,255,255,.85);',
      'transition:border-color .2s,box-shadow .2s,transform .18s,background .2s;}',
      '.jy-anc-item:hover{border-color:rgba(47,124,246,.34);background:rgba(255,255,255,.72);',
      'box-shadow:0 10px 28px rgba(16,26,48,.12),inset 0 1px 0 rgba(255,255,255,.95);transform:translateY(-1px);}',
      /* 未读：左竖条 + 淡蓝洗色 */
      '.jy-anc-item.jy-unread{border-color:rgba(47,124,246,.30);',
      'background:linear-gradient(100deg,rgba(47,124,246,.11),rgba(255,255,255,.72) 42%);}',
      '.jy-anc-item.jy-unread::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;',
      'background:linear-gradient(180deg,#4a9bff,#2f7cf6);box-shadow:0 0 10px rgba(47,124,246,.5);}',
      '.jy-anc-item-h{display:flex;align-items:flex-start;gap:9px;padding:14px 15px;cursor:pointer;user-select:none;}',
      '.jy-anc-dot{flex:0 0 auto;width:7px;height:7px;border-radius:50%;background:#e5484d;margin-top:7px;',
      'box-shadow:0 0 0 3px rgba(229,72,77,.14);}',
      '.jy-anc-item:not(.jy-unread) .jy-anc-dot{background:rgba(140,160,190,.55);box-shadow:none;}',
      '.jy-anc-main{flex:1 1 auto;min-width:0;}',
      '.jy-anc-title{font-size:14px;font-weight:600;color:#101828;line-height:1.5;word-break:break-word;}',
      '.jy-anc-item.jy-unread .jy-anc-title{color:#0b3fa8;}',
      '.jy-anc-meta{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:6px;font-size:11.5px;color:#8b98ab;}',
      '.jy-anc-tag{padding:1px 7px;border-radius:6px;background:rgba(140,160,190,.14);color:#5d6b80;font-weight:600;',
      'border:1px solid rgba(140,160,190,.16);}',
      '.jy-anc-tag.jy-exp{background:rgba(245,158,11,.14);color:#a16207;border-color:rgba(245,158,11,.28);}',
      '.jy-anc-tag.jy-new{background:rgba(229,72,77,.13);color:#c92a2f;border-color:rgba(229,72,77,.26);}',
      '.jy-anc-caret{flex:0 0 auto;width:16px;height:16px;color:#9aa7b8;transition:transform .24s;',
      'fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
      '.jy-anc-item.jy-open .jy-anc-caret{transform:rotate(180deg);color:#2f7cf6;}',
      '.jy-anc-item-b{display:none;padding:0 15px 15px 31px;color:#334155;font-size:13.5px;line-height:1.8;',
      'word-break:break-word;}',
      '.jy-anc-item.jy-open .jy-anc-item-b{display:block;animation:jyAnnFade .22s ease-out;}',
      '@keyframes jyAnnFade{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '.jy-anc-item-b img{max-width:100%;height:auto;border-radius:11px;margin:9px 0;display:block;',
      'border:1px solid rgba(140,160,190,.18);}',
      '.jy-anc-item-b p{margin:0 0 9px;}',
      '.jy-anc-item-b a{color:#2f7cf6;text-decoration:none;}',
      '.jy-anc-item-b a:hover{text-decoration:underline;}',

      /* ---------- 空态 / 加载 / 更多 ---------- */
      '.jy-anc-empty{text-align:center;padding:66px 20px;color:#98a5b8;}',
      '.jy-anc-empty svg{width:46px;height:46px;margin-bottom:13px;opacity:.5;fill:none;stroke:currentColor;',
      'stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}',
      '.jy-anc-empty p{margin:0;font-size:13px;}',
      '.jy-anc-load{text-align:center;padding:22px;font-size:12.5px;color:#98a5b8;}',
      '.jy-anc-more{width:100%;height:40px;border:1px dashed rgba(140,160,190,.42);border-radius:12px;',
      'background:rgba(255,255,255,.45);color:#64748b;font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;}',
      '.jy-anc-more:hover{border-color:rgba(47,124,246,.55);color:#2f7cf6;background:rgba(47,124,246,.07);}',

      /* ---------- 移动端：贴满全屏，圆角归零 ---------- */
      '@media (max-width:845px){',
      '.jy-anc-panel{top:0;right:0;bottom:0;width:100%;max-width:100vw;border-radius:0;border-left:none;border-right:none;transform:translateX(100%);}',
      '.jy-anc-head{padding:15px 15px 13px;}',
      '.jy-anc-body{padding:12px 12px 18px;}',
      '.jy-anc-item-b{padding-left:15px;}',
      '.jy-bell-btn{width:34px;height:34px;}',
      '.jy-anc-h-t{font-size:15px;}',
      '}',

      /* ---------- 深色模式 ---------- */
      'html[data-jy-theme="dark"] .jy-bell-btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.13);color:#c7d2e0;',
      'box-shadow:0 4px 14px rgba(0,0,0,.35);}',
      'html[data-jy-theme="dark"] .jy-bell-btn:hover{background:rgba(91,155,255,.22);border-color:rgba(91,155,255,.42);color:#7fb2ff;}',
      'html[data-jy-theme="dark"] .jy-bell-dot{box-shadow:0 2px 8px rgba(229,72,77,.55),0 0 0 2px rgba(22,28,38,.95);}',
      'html[data-jy-theme="dark"] .jy-anc-mask{background:rgba(3,6,12,.55);backdrop-filter:blur(6px) saturate(120%);}',
      'html[data-jy-theme="dark"] .jy-anc-panel{border-color:rgba(255,255,255,.10);',
      'background:linear-gradient(180deg,rgba(26,31,42,.90),rgba(17,21,29,.94));',
      'box-shadow:0 28px 80px rgba(0,0,0,.66),0 4px 14px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.07);}',
      'html[data-jy-theme="dark"] .jy-anc-panel::before{background:radial-gradient(60% 60% at 30% 0%,rgba(91,155,255,.28),transparent 70%),',
      'radial-gradient(50% 50% at 88% 8%,rgba(167,139,250,.22),transparent 72%);}',
      'html[data-jy-theme="dark"] .jy-anc-panel::after{background:radial-gradient(55% 55% at 70% 100%,rgba(47,206,154,.16),transparent 72%);}',
      'html[data-jy-theme="dark"] .jy-anc-body{background:radial-gradient(130% 56% at 50% -8%,rgba(91,155,255,.10),transparent 62%),',
      'radial-gradient(110% 52% at 50% 108%,rgba(167,139,250,.08),transparent 64%);}',
      'html[data-jy-theme="dark"] .jy-anc-head{border-color:rgba(255,255,255,.09);',
      'background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0));}',
      'html[data-jy-theme="dark"] .jy-anc-h-t{color:#e9eff8;}',
      'html[data-jy-theme="dark"] .jy-anc-h-n{color:#9fc0ff;background:rgba(91,155,255,.16);border-color:rgba(91,155,255,.30);}',
      'html[data-jy-theme="dark"] .jy-anc-btn{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.12);color:#a7b5c7;}',
      'html[data-jy-theme="dark"] .jy-anc-btn:hover{background:rgba(255,255,255,.14);border-color:rgba(91,155,255,.45);color:#9fc0ff;}',
      'html[data-jy-theme="dark"] .jy-anc-item{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.08);',
      'box-shadow:0 2px 10px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.05);}',
      'html[data-jy-theme="dark"] .jy-anc-item:hover{background:rgba(255,255,255,.09);border-color:rgba(91,155,255,.38);',
      'box-shadow:0 10px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.08);}',
      'html[data-jy-theme="dark"] .jy-anc-item.jy-unread{border-color:rgba(91,155,255,.36);',
      'background:linear-gradient(100deg,rgba(91,155,255,.16),rgba(255,255,255,.05) 46%);}',
      'html[data-jy-theme="dark"] .jy-anc-title{color:#e9eff8;}',
      'html[data-jy-theme="dark"] .jy-anc-item.jy-unread .jy-anc-title{color:#cfe2ff;}',
      'html[data-jy-theme="dark"] .jy-anc-meta{color:#8899ad;}',
      'html[data-jy-theme="dark"] .jy-anc-tag{background:rgba(255,255,255,.09);color:#a7b5c7;border-color:rgba(255,255,255,.10);}',
      'html[data-jy-theme="dark"] .jy-anc-item-b{color:#a7b5c7;}',
      'html[data-jy-theme="dark"] .jy-anc-item-b img{border-color:rgba(255,255,255,.10);}',
      'html[data-jy-theme="dark"] .jy-anc-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.16);}',
      'html[data-jy-theme="dark"] .jy-anc-more{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);color:#a7b5c7;}',
      'html[data-jy-theme="dark"] .jy-anc-more:hover{background:rgba(91,155,255,.14);border-color:rgba(91,155,255,.48);color:#9fc0ff;}'
    ].join('');

    var st = document.createElement('style');
    st.id = 'jyAnnCenterStyle';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------------- SVG 图标（内联，不依赖字体） ---------------- */
  var SVG_BELL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var SVG_CARET = '<svg class="jy-anc-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var SVG_EMPTY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M3 3l18 18"/></svg>';

  /* ---------------- 红点 ---------------- */
  function paintBadge(n) {
    var dot = $('jyBellDot');
    var btn = $('jyBellBtn');
    if (!dot || !btn) return;
    if (n > 0) {
      dot.textContent = n > 99 ? '99+' : String(n);
      dot.classList.add('jy-on');
      btn.classList.add('jy-has-unread');
      btn.setAttribute('aria-label', '公告中心（' + n + ' 条未读）');
    } else {
      dot.textContent = '';
      dot.classList.remove('jy-on');
      btn.classList.remove('jy-has-unread');
      btn.setAttribute('aria-label', '公告中心');
    }
  }

  /* ---------------- 渲染列表 ---------------- */
  function renderItems(list, append) {
    var body = $('jyAncBody');
    if (!body) return;

    if (!append) body.innerHTML = '';

    if (!list.length && !append) {
      body.innerHTML = '<div class="jy-anc-empty">' + SVG_EMPTY +
        '<p>暂无公告</p></div>';
      return;
    }

    // 去掉上一次的「加载更多」按钮
    var oldMore = $('jyAncMore');
    if (oldMore && oldMore.parentNode) oldMore.parentNode.removeChild(oldMore);

    var lr = localRead();
    var frag = document.createDocumentFragment();

    list.forEach(function (a) {
      var isRead = a.read === true || lr[a.id] === 1;
      var el = document.createElement('div');
      el.className = 'jy-anc-item' + (isRead ? '' : ' jy-unread') + (state.expanded[a.id] ? ' jy-open' : '');
      el.setAttribute('data-id', a.id);

      var tags = '<span class="jy-anc-tag">' + esc((a.created_at || '').slice(0, 10)) + '</span>';
      if (a.expired === 1) tags += '<span class="jy-anc-tag jy-exp">已结束</span>';
      if (!isRead) tags += '<span class="jy-anc-tag jy-new">未读</span>';

      el.innerHTML =
        '<div class="jy-anc-item-h">' +
          '<span class="jy-anc-dot"></span>' +
          '<div class="jy-anc-main">' +
            '<div class="jy-anc-title">' + esc(a.title) + '</div>' +
            '<div class="jy-anc-meta">' + tags + '</div>' +
          '</div>' + SVG_CARET +
        '</div>' +
        '<div class="jy-anc-item-b">' +
          (a.cover_url ? '<img src="' + esc(a.cover_url) + '" alt="" loading="lazy">' : '') +
          (a.content || '<span style="color:#94a3b8">（无正文）</span>') +
        '</div>';

      el.querySelector('.jy-anc-item-h').addEventListener('click', function () {
        toggle(el, a);
      });

      frag.appendChild(el);
    });

    body.appendChild(frag);

    // 加载更多
    if (state.page < state.pages) {
      var b = document.createElement('button');
      b.id = 'jyAncMore';
      b.className = 'jy-anc-more';
      b.textContent = '加载更多（' + state.total + ' 条公告）';
      b.onclick = function () { load(state.page + 1, true, b); };
      body.appendChild(b);
    }
  }

  function toggle(el, a) {
    var id = a.id;
    var isOpen = el.classList.contains('jy-open');
    if (isOpen) {
      el.classList.remove('jy-open');
      delete state.expanded[id];
    } else {
      el.classList.add('jy-open');
      state.expanded[id] = 1;
      // 首次展开即标记已读
      if (el.classList.contains('jy-unread')) {
        el.classList.remove('jy-unread');
        var tag = el.querySelector('.jy-anc-tag.jy-new');
        if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
        markRead(id);
      }
    }
  }

  function markRead(id) {
    setLocalRead(id);
    if (state.unread > 0) state.unread--;
    paintBadge(state.unread);
    try {
      fetch(API + '?action=pub_ann_read', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: id })
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------------- 数据加载 ---------------- */
  function load(page, append, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '加载中…'; }
    var body = $('jyAncBody');
    if (!append && body) {
      body.innerHTML = '<div class="jy-anc-load">加载中…</div>';
    }

    fetch(API + '?action=pub_ann_list&page=' + page, { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.success) throw new Error('fail');
        var d = j.data || {};
        state.page = d.page || 1;
        state.pages = d.pages || 1;
        state.total = d.total || 0;
        state.unread = d.unread || 0;
        state.loaded = true;

        // 未登录时用本地已读兜底计算未读
        if (!d.logged_in) {
          var lr = localRead();
          state.unread = (d.list || []).filter(function (a) { return lr[a.id] !== 1; }).length;
        }
        paintBadge(state.unread);

        var hN = $('jyAncCount');
        if (hN) hN.textContent = state.total + ' 条';

        renderItems(d.list || [], append);
      })
      .catch(function () {
        if (body && !append) {
          body.innerHTML = '<div class="jy-anc-empty">' + SVG_EMPTY +
            '<p>加载失败，请稍后重试</p></div>';
        }
        if (btn) { btn.disabled = false; btn.textContent = '重试'; }
      });
  }

  /* ---------------- 抽屉开关 ---------------- */
  function openPanel() {
    injectStyle();

    if (!$('jyAncMask')) {
      var mask = document.createElement('div');
      mask.id = 'jyAncMask';
      mask.className = 'jy-anc-mask';
      mask.onclick = closePanel;
      document.body.appendChild(mask);

      var panel = document.createElement('div');
      panel.id = 'jyAncPanel';
      panel.className = 'jy-anc-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', '公告中心');
      panel.innerHTML =
        '<div class="jy-anc-head">' +
          '<div class="jy-anc-h-l">' + SVG_BELL +
            '<span class="jy-anc-h-t">公告中心</span>' +
            '<span class="jy-anc-h-n" id="jyAncCount">—</span>' +
          '</div>' +
          '<div class="jy-anc-h-r">' +
            '<button class="jy-anc-btn" id="jyAncReadAll" type="button">全部已读</button>' +
            '<button class="jy-anc-btn" id="jyAncClose" type="button" aria-label="关闭">' + SVG_CLOSE + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="jy-anc-body" id="jyAncBody"></div>';
      document.body.appendChild(panel);

      $('jyAncClose').onclick = closePanel;
      $('jyAncReadAll').onclick = readAll;
    }

    requestAnimationFrame(function () {
      var m = $('jyAncMask'), p = $('jyAncPanel');
      if (m) m.classList.add('jy-on');
      if (p) p.classList.add('jy-on');
    });

    document.body.style.overflow = 'hidden';

    // 每次打开都重新拉一次，保证新公告立即可见
    load(1, false, null);
  }

  function closePanel() {
    var m = $('jyAncMask'), p = $('jyAncPanel');
    if (m) m.classList.remove('jy-on');
    if (p) p.classList.remove('jy-on');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (m && m.parentNode) m.parentNode.removeChild(m);
      if (p && p.parentNode) p.parentNode.removeChild(p);
    }, 300);
  }

  function readAll() {
    var btn = $('jyAncReadAll');
    if (btn) { btn.disabled = true; btn.textContent = '处理中…'; }

    // 本地立刻全标已读
    var items = document.querySelectorAll('.jy-anc-item');
    items.forEach(function (el) {
      el.classList.remove('jy-unread');
      var t = el.querySelector('.jy-anc-tag.jy-new');
      if (t && t.parentNode) t.parentNode.removeChild(t);
      setLocalRead(el.getAttribute('data-id'));
    });

    fetch(API + '?action=pub_ann_read_all', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: ''
    }).then(function () {
      state.unread = 0;
      paintBadge(0);
      if (btn) { btn.disabled = false; btn.textContent = '全部已读'; }
    }).catch(function () {
      state.unread = 0;
      paintBadge(0);
      if (btn) { btn.disabled = false; btn.textContent = '全部已读'; }
    });
  }

  /* ---------------- 挂载铃铛 ---------------- */
  function mountBell() {
    // 已存在就不重复挂
    if ($('jyBellBtn')) return true;

    // 优先插到 balanceDisplay 前面
    var bal = $('balanceDisplay');
    if (!bal || !bal.parentNode) return false;

    injectStyle();

    var btn = document.createElement('button');
    btn.id = 'jyBellBtn';
    btn.className = 'jy-bell-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', '公告中心');
    btn.title = '公告中心';
    btn.innerHTML = SVG_BELL + '<span class="jy-bell-dot" id="jyBellDot"></span>';
    btn.onclick = openPanel;

    bal.parentNode.insertBefore(btn, bal);
    return true;
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    // 只在用户端后台页挂载
    var path = location.pathname;
    try { path = decodeURIComponent(path); } catch (e) {}
    if (!/(后台\.php|后台页面)/.test(path)) return;

    // 余额是异步渲染的，等它出现再挂铃铛（最多等 6 秒）
    var tries = 0;
    (function waitBal() {
      if (mountBell()) {
        // 挂好后拉一次未读数（不打开面板）
        fetch(API + '?action=pub_ann_list&page=1', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            if (!j || !j.success) return;
            var d = j.data || {};
            var n = d.unread || 0;
            if (!d.logged_in) {
              var lr = localRead();
              n = (d.list || []).filter(function (a) { return lr[a.id] !== 1; }).length;
            }
            state.unread = n;
            state.total = d.total || 0;
            paintBadge(n);
          })
          .catch(function () {});
        return;
      }
      if (++tries > 30) return;   // 6 秒后放弃
      setTimeout(waitBal, 200);
    })();

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('jyAncPanel')) closePanel();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
