//极验云 - JiYan V1
//安全设置面板：心跳配置 / 凭据重置 / 凭据强制校验
//依赖：请求.js 的 POSTPHP、通用.js 的 获取API链接

(function () {
  'use strict';

  var state = { appId: 0, interval: 30, strict: 1, credRequired: 0 };

  function curAppId() {
    try {
      return parseInt(window.当前选中的应用ID || 0, 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function esc(s) {
    var t = String(s === undefined || s === null ? '' : s);
    t = t.split(String.fromCharCode(38)).join(String.fromCharCode(38) + 'amp;');
    t = t.split('<').join(String.fromCharCode(38) + 'lt;');
    t = t.split('>').join(String.fromCharCode(38) + 'gt;');
    t = t.split(String.fromCharCode(34)).join(String.fromCharCode(38) + 'quot;');
    return t;
  }

  // 拉当前应用配置（复用 get_features 不返回 apps 字段，单独拉一次 get_apps）
  async function loadApp() {
    var appId = curAppId();
    state.appId = appId;
    var hint = document.getElementById('安全设置_应用提示');
    var body = document.getElementById('安全设置_主体');
    if (!body) return false;
    if (!appId) {
      body.style.display = 'none';
      if (hint) hint.style.display = 'block';
      return false;
    }
    body.style.display = 'block';
    if (hint) hint.style.display = 'none';

    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('app.php'), {
        action: 'get_apps',
        password: 开发者安全密码,
        page: 1,
        limit: 100
      });
      var apps = (res && res.success && res.data && res.data.apps) || [];
      var hit = null;
      for (var i = 0; i < apps.length; i++) {
        if (String(apps[i].app_id) === String(appId)) { hit = apps[i]; break; }
      }
      if (hit) {
        state.interval = parseInt(hit.heartbeat_interval, 10) || 30;
        state.strict = parseInt(hit.heartbeat_strict, 10) === 1 ? 1 : 0;
        state.credRequired = parseInt(hit.cred_required, 10) === 1 ? 1 : 0;
      }
      render();
      return true;
    } catch (e) {
      return false;
    }
  }

  function render() {
    var iv = document.getElementById('安全设置_心跳间隔');
    if (iv) iv.value = state.interval;
    var st = document.getElementById('安全设置_严格模式');
    if (st) st.checked = state.strict === 1;
    var cr = document.getElementById('安全设置_强制凭据');
    if (cr) cr.checked = state.credRequired === 1;
    var idTxt = document.getElementById('安全设置_应用ID');
    if (idTxt) idTxt.textContent = state.appId ? String(state.appId) : '-';
  }

  async function saveHeartbeat() {
    if (!state.appId) { alert('请先选择应用实例', false); return; }
    var iv = parseInt(document.getElementById('安全设置_心跳间隔').value, 10) || 0;
    if (iv < 1 || iv > 1440) { alert('心跳间隔需在 1~1440 分钟之间', false); return; }
    var st = document.getElementById('安全设置_严格模式').checked ? '1' : '0';
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'update_heartbeat',
        password: 开发者安全密码,
        app_id: state.appId,
        interval: iv,
        strict: st
      });
      if (res && res.success) {
        alert('心跳配置已保存', 'success');
        state.interval = iv;
        state.strict = st === '1' ? 1 : 0;
        render();
      } else {
        alert('保存失败：' + ((res && res.message) || '未知错误'), false);
      }
    } catch (e) {
      alert('保存异常：' + e.message, false);
    }
  }

  async function rotateCred(which) {
    if (!state.appId) { alert('请先选择应用实例', false); return; }
    var 名称 = which === 'pass' ? '安全请求密码' : (which === 'token' ? '安全请求 Token' : '安全请求密码与 Token');
    if (!confirm('确定重置「' + 名称 + '」吗？\n重置后所有旧客户端会立即请求失败，必须更新客户端配置。')) return;
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'rotate_cred',
        password: 开发者安全密码,
        app_id: state.appId,
        which: which
      });
      if (res && res.success) {
        var d = res.data || {};
        var lines = [];
        // 后端 both 返回 {pass, token}；单顶返回 {which, value}
        if (d.pass) lines.push('安全密码：' + d.pass);
        if (d.token) lines.push('安全 Token：' + d.token);
        if (!d.pass && !d.token && d.value) {
          lines.push((d.which === 'pass' ? '安全密码：' : (d.which === 'token' ? '安全 Token：' : '新凭据：')) + d.value);
        }
        alert('已重置\n' + (lines.length ? lines.join('\n') : ''), 'success');
      } else {
        alert('重置失败：' + ((res && res.message) || '未知错误'), false);
      }
    } catch (e) {
      alert('重置异常：' + e.message, false);
    }
  }

  async function toggleCredRequired(on) {
    if (!state.appId) { alert('请先选择应用实例', false); return; }
    if (on && !confirm('开启后，未携带安全密码/Token 的请求全部会被拒绝（code=1005）。\n存量客户端必须先升级。确认开启？')) {
      document.getElementById('安全设置_强制凭据').checked = false;
      return;
    }
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'set_cred_required',
        password: 开发者安全密码,
        app_id: state.appId,
        enabled: on ? '1' : '0'
      });
      if (res && res.success) {
        state.credRequired = on ? 1 : 0;
        alert('凭据强制校验已' + (on ? '开启' : '关闭'), 'success');
      } else {
        document.getElementById('安全设置_强制凭据').checked = !on;
        alert('设置失败：' + ((res && res.message) || '未知错误'), false);
      }
    } catch (e) {
      document.getElementById('安全设置_强制凭据').checked = !on;
      alert('设置异常：' + e.message, false);
    }
  }

  window.JY_SEC = {
    load: loadApp,
    saveHeartbeat: saveHeartbeat,
    rotateCred: rotateCred,
    toggleCredRequired: toggleCredRequired,
    state: state
  };
})();
