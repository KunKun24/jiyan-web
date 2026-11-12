//极验云 - JiYan V1
//功能开关面板：站点级（只读）+ 应用级（可改）
//依赖：请求.js 的 POSTPHP、通用.js 的 获取API链接

(function () {
  'use strict';

  var state = { site: {}, app: {}, detail: {}, labels: {}, appId: 0 };

  function curAppId() {
    var v = 0;
    try {
      v = window.当前选中的应用ID || (typeof 当前选中的应用ID !== 'undefined' ? 当前选中的应用ID : 0);
    } catch (e) {
      v = 0;
    }
    return parseInt(v, 10) || 0;
  }

  function esc(s) {
    var t = String(s === undefined || s === null ? '' : s);
    t = t.split(String.fromCharCode(38)).join(String.fromCharCode(38) + 'amp;');
    t = t.split('<').join(String.fromCharCode(38) + 'lt;');
    t = t.split('>').join(String.fromCharCode(38) + 'gt;');
    t = t.split(String.fromCharCode(34)).join(String.fromCharCode(38) + 'quot;');
    return t;
  }

  function sw(key, checked, disabled, idPrefix) {
    var id = idPrefix + '_' + key;
    return '<label class="jy-sw">'
      + '<input type="checkbox" id="' + esc(id) + '" data-key="' + esc(key) + '"'
      + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>'
      + '<span class="jy-sw-slider"></span>'
      + '</label>';
  }

  function renderSite() {
    var box = document.getElementById('功能开关_站点区');
    if (!box) return;
    var rows = '';
    Object.keys(state.labels).forEach(function (k) {
      var on = parseInt(state.site[k] || 0, 10) === 1;
      rows += '<div class="jy-feat-row">'
        + '<div class="jy-feat-name">' + esc(state.labels[k]) + '<span class="jy-feat-key">' + esc(k) + '</span></div>'
        + '<div class="jy-feat-ctl">' + sw(k, on, true, 'site') + '</div>'
        + '</div>';
    });
    box.innerHTML = rows;
  }

  function renderApp() {
    var box = document.getElementById('功能开关_应用区');
    if (!box) return;
    if (!state.appId) {
      box.innerHTML = '<div class="jy-empty">请先在右上角「应用选择」里选中一个应用实例</div>';
      return;
    }
    var rows = '';
    Object.keys(state.labels).forEach(function (k) {
      var d = state.detail[k] || {};
      var on = !!d.enabled;
      var siteOff = d.site === false;
      rows += '<div class="jy-feat-row">'
        + '<div class="jy-feat-name">' + esc(state.labels[k])
        + '<span class="jy-feat-key">' + esc(k) + '</span>'
        + (siteOff ? '<span class="jy-feat-tag">站点已关闭</span>' : '')
        + '</div>'
        + '<div class="jy-feat-ctl">' + sw(k, on, siteOff, 'app') + '</div>'
        + '</div>';
    });
    box.innerHTML = rows;
    box.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
      cb.addEventListener('change', onToggle);
    });
  }

  async function onToggle(e) {
    var cb = e.target;
    var key = cb.getAttribute('data-key');
    var want = cb.checked;
    if (!state.appId) { cb.checked = !want; return; }
    cb.disabled = true;
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'set_feature',
        password: 开发者安全密码,
        app_id: state.appId,
        feature: key,
        enabled: want ? '1' : '0'
      });
      if (res && res.success) {
        if (typeof alert === 'function') alert('『' + (state.labels[key] || key) + '』已' + (want ? '开启' : '关闭'), 'success');
        await load(true);
      } else {
        cb.checked = !want;
        if (typeof alert === 'function') alert('修改失败：' + ((res && res.message) || '未知错误'), false);
      }
    } catch (err) {
      cb.checked = !want;
      if (typeof alert === 'function') alert('修改异常：' + err.message, false);
    } finally {
      cb.disabled = false;
    }
  }

  async function load(force) {
    if (!window.开发者UID || !window.开发者密码) return false;
    var appId = curAppId();
    state.appId = appId;
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'get_features',
        password: 开发者安全密码,
        app_id: appId || 0
      });
      if (!res || !res.success) return false;
      state.site = res.data.site || {};
      state.labels = res.data.labels || {};
      state.detail = res.data.detail || {};
      state.app = res.data.app || [];
      renderSite();
      renderApp();
      return true;
    } catch (e) {
      return false;
    }
  }

  window.JY_FEATURE = { load: load, state: state };
})();
