/* 极验云 · 自定义下拉框（替换原生 select 外观，保留原生行为）
 * 用法：给 <select> 加 class="jy-select"，脚本会自动增强；
 *      动态插入的节点也会被自动增强，无需手动初始化。
 *       也可手动调用 window.JySelect.enhanceAll(root)。
 */
(function () {
  'use strict';
  if (window.JySelect) { return; }

  var ID = 0;

  function injectCss() {
    if (document.getElementById('jys-css')) { return; }
    var css = document.createElement('style');
    css.id = 'jys-css';
    css.textContent = [
      '.jys-wrap{position:relative;display:block;width:100%;box-sizing:border-box}',
      '.jys-btn{width:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:10px;',
      'padding:10px 12px;border:1px solid #e3e5e8;border-radius:10px;background:#fff;color:#222;font-size:14px;',
      'font-family:inherit;line-height:1.4;text-align:left;cursor:pointer;transition:border-color .16s,box-shadow .16s,background .16s}',
      '.jys-btn:hover{border-color:#cfd3d8;background:#fcfcfd}',
      '.jys-btn.on{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}',
      '.jys-btn:disabled,.jys-btn.jys-disabled{opacity:.55;cursor:not-allowed;background:#f7f7f8}',
      '.jys-btn .jys-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.jys-btn .jys-caret{width:16px;height:16px;flex:0 0 16px;color:#8a8f98;transition:transform .16s}',
      '.jys-btn.on .jys-caret{transform:rotate(180deg)}',
      '.jys-panel{position:fixed;z-index:2147483000;max-height:320px;overflow:auto;-webkit-overflow-scrolling:touch;',
      'background:#fff;border:1px solid #e6e8eb;border-radius:12px;box-shadow:0 12px 34px rgba(16,24,40,.16),0 2px 6px rgba(16,24,40,.06);',
      'padding:6px;box-sizing:border-box;animation:jys-in .12s ease-out}',
      '@keyframes jys-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
      '.jys-grp{padding:8px 10px 4px;font-size:11px;font-weight:600;color:#9aa0a6;letter-spacing:.06em;text-transform:uppercase}',
      '.jys-opt{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;font-size:13.5px;color:#333;cursor:pointer;line-height:1.45}',
      '.jys-opt:hover{background:#f4f6f8}',
      '.jys-opt.on{background:#eef4ff;color:#1d4ed8;font-weight:600}',
      '.jys-opt.dis{color:#b3b7bd;cursor:not-allowed;background:transparent}',
      '.jys-opt .jys-t{flex:1;min-width:0;word-break:break-word}',
      '.jys-opt .jys-badge{flex:0 0 auto;font-size:10.5px;font-weight:600;color:#b45309;background:#fff4e5;border:1px solid #ffe2bf;border-radius:999px;padding:1px 7px}',
      '.jys-opt .jys-tick{flex:0 0 14px;width:14px;height:14px;color:#2563eb;opacity:0}',
      '.jys-opt.on .jys-tick{opacity:1}',
      'html[data-theme="dark"] .jys-btn,html[data-jy-theme="dark"] .jys-btn{background:#1c1c1e;border-color:#3a3a3c;color:#f2f2f7}',
      'html[data-theme="dark"] .jys-btn:hover,html[data-jy-theme="dark"] .jys-btn:hover{background:#242426;border-color:#48484a}',
      'html[data-theme="dark"] .jys-panel,html[data-jy-theme="dark"] .jys-panel{background:#1c1c1e;border-color:#3a3a3c;box-shadow:0 12px 34px rgba(0,0,0,.55)}',
      'html[data-theme="dark"] .jys-opt,html[data-jy-theme="dark"] .jys-opt{color:#e5e5ea}',
      'html[data-theme="dark"] .jys-opt:hover,html[data-jy-theme="dark"] .jys-opt:hover{background:#2c2c2e}',
      'html[data-theme="dark"] .jys-opt.on,html[data-jy-theme="dark"] .jys-opt.on{background:#0a2a4a;color:#7ab8ff}',
      'html[data-theme="dark"] .jys-opt.dis,html[data-jy-theme="dark"] .jys-opt.dis{color:#636366}',
      'html[data-theme="dark"] .jys-opt .jys-badge,html[data-jy-theme="dark"] .jys-opt .jys-badge{background:#3a2a12;border-color:#5a421c;color:#f5b971}',
      '@media (max-width:520px){.jys-panel{max-height:56vh}}'
    ].join('');
    document.head.appendChild(css);
  }

  function supportsDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) { return t === 'dark'; }
    return false;
  }

  function isVipOption(opt) {
    return opt.getAttribute('data-vip') === '1' || /\(VIP\)|（VIP）/i.test(opt.textContent || '');
  }

  function cleanText(text) {
    return String(text || '').replace(/\s*[（(]VIP[）)]\s*/i, '').trim();
  }

  var openPanel = null;

  function closeOpen() {
    if (!openPanel) { return; }
    var p = openPanel;
    openPanel = null;
    p.panel.hidden = true;
    p.btn.classList.remove('on');
    document.removeEventListener('pointerdown', p.onDocDown, true);
    document.removeEventListener('keydown', p.onKey, true);
    window.removeEventListener('scroll', p.onRepos, true);
    window.removeEventListener('resize', p.onRepos, true);
  }

  function enhance(sel) {
    if (!sel || sel.dataset.jys === '1') { return; }
    if (sel.multiple || sel.size > 1) { return; }
    injectCss();
    sel.dataset.jys = '1';
    var wrap = document.createElement('div');
    wrap.className = 'jys-wrap';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.style.display = 'none';
    sel.setAttribute('tabindex', '-1');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jys-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.innerHTML = '<span class="jys-label"></span>'
      + '<svg class="jys-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
    wrap.appendChild(btn);

    var panel = document.createElement('div');
    panel.className = 'jys-panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;
    document.body.appendChild(panel);

    var labelEl = btn.querySelector('.jys-label');

    function syncLabel() {
      var o = sel.options[sel.selectedIndex];
      labelEl.textContent = o ? cleanText(o.text) : '';
      btn.disabled = !!sel.disabled;
      btn.classList.toggle('jys-disabled', !!sel.disabled);
      btn.title = o ? cleanText(o.text) : '';
    }

    function position() {
      var r = btn.getBoundingClientRect();
      panel.style.width = Math.max(180, r.width) + 'px';
      panel.style.left = Math.round(r.left) + 'px';
      panel.hidden = false;
      var ph = panel.offsetHeight;
      var spaceBelow = window.innerHeight - r.bottom;
      var top;
      if (spaceBelow < ph + 12 && r.top > ph + 12) { top = r.top - ph - 6; }
      else { top = r.bottom + 6; }
      panel.style.top = Math.round(Math.max(8, Math.min(top, window.innerHeight - ph - 8))) + 'px';
    }

    function choose(opt) {
      if (!opt || opt.disabled) { return; }
      var changed = sel.value !== opt.value;
      sel.value = opt.value;
      syncLabel();
      closeOpen();
      if (changed) {
        try { sel.dispatchEvent(new Event('change', { bubbles: true })); }
        catch (e) { var ev = document.createEvent('HTMLEvents'); ev.initEvent('change', true, false); sel.dispatchEvent(ev); }
      }
      try { sel.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    }

    function render() {
      panel.innerHTML = '';
      var lastGroup = null;
      var hasVip = false;
      for (var i = 0; i < sel.options.length; i++) {
        var o = sel.options[i];
        var parent = o.parentNode;
        if (parent && parent.tagName === 'OPTGROUP') {
          if (lastGroup !== parent) {
            lastGroup = parent;
            var g = document.createElement('div');
            g.className = 'jys-grp';
            g.textContent = parent.label;
            panel.appendChild(g);
          }
        } else {
          lastGroup = null;
        }
        var vip = isVipOption(o);
        if (vip) { hasVip = true; }
        var item = document.createElement('div');
        item.className = 'jys-opt' + (o.selected ? ' on' : '') + (o.disabled ? ' dis' : '') + (vip ? ' vip' : '');
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', o.selected ? 'true' : 'false');
        var t = document.createElement('span');
        t.className = 'jys-t';
        t.textContent = cleanText(o.text);
        item.appendChild(t);
        if (vip) {
          var b = document.createElement('span');
          b.className = 'jys-badge';
          b.textContent = 'VIP';
          item.appendChild(b);
        }
        var tick = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tick.setAttribute('class', 'jys-tick');
        tick.setAttribute('viewBox', '0 0 24 24');
        tick.setAttribute('fill', 'none');
        tick.setAttribute('stroke', 'currentColor');
        tick.setAttribute('stroke-width', '2.6');
        tick.setAttribute('stroke-linecap', 'round');
        tick.setAttribute('stroke-linejoin', 'round');
        tick.innerHTML = '<path d="M20 6L9 17l-5-5"/>';
        item.appendChild(tick);
        (function (opt) {
          item.addEventListener('click', function (e) { e.stopPropagation(); choose(opt); });
        })(o);
        panel.appendChild(item);
      }
      panel.dataset.hasVip = hasVip ? '1' : '0';
    }

    function open() {
      if (sel.disabled) { return; }
      if (openPanel && openPanel.sel === sel) { closeOpen(); return; }
      closeOpen();
      render();
      position();
      btn.classList.add('on');

      var onDocDown = function (e) {
        if (panel.contains(e.target) || btn.contains(e.target)) { return; }
        closeOpen();
      };
      var onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); closeOpen(); btn.focus(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var items = Array.prototype.slice.call(panel.querySelectorAll('.jys-opt:not(.dis)'));
          if (!items.length) { return; }
          var idx = items.indexOf(document.activeElement);
          var next = e.key === 'ArrowDown' ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
          items[next === -1 ? 0 : next].focus();
        }
        if ((e.key === 'Enter' || e.key === ' ') && panel.contains(document.activeElement)) {
          e.preventDefault();
          document.activeElement.click();
        }
      };
      var onRepos = function () { if (openPanel) { position(); } };
      document.addEventListener('pointerdown', onDocDown, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', onRepos, true);
      window.addEventListener('resize', onRepos, true);
      openPanel = { sel: sel, panel: panel, btn: btn, onDocDown: onDocDown, onKey: onKey, onRepos: onRepos };
      var cur = panel.querySelector('.jys-opt.on:not(.dis)');
      if (cur) { try { cur.focus(); } catch (e) {} }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (panel.hidden) { open(); } else { closeOpen(); }
    });

    sel.addEventListener('change', syncLabel);
    if (window.MutationObserver) {
      new MutationObserver(function () {
        syncLabel();
        if (!panel.hidden) { render(); position(); }
      }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected'] });
    }
    syncLabel();
    sel._jysRefresh = syncLabel;
  }

  function enhanceAll(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list = scope.querySelectorAll('select.jy-select:not([data-jys="1"])');
    for (var i = 0; i < list.length; i++) { enhance(list[i]); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { enhanceAll(); });
  } else {
    enhanceAll();
  }
  if (window.MutationObserver) {
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var added = muts[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType !== 1) { continue; }
          if (n.matches && n.matches('select.jy-select')) { enhance(n); }
          else if (n.querySelectorAll) { enhanceAll(n); }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  window.JySelect = { enhance: enhance, enhanceAll: enhanceAll, close: closeOpen, dark: supportsDark };
})();
