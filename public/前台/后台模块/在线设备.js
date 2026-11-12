//极验云 - JiYan V1
//在线设备抽屉 + 踢下线
//依赖：请求.js 的 POSTPHP、通用.js 的 获取API链接

(function () {
  'use strict';

  var timer = null;
  var state = { appId: 0, list: [], interval: 30 };

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

  function ago(ts) {
    var t = parseInt(ts, 10) || 0;
    if (t <= 0) return '-';
    var d = Math.max(0, Math.floor(Date.now() / 1000) - t);
    if (d < 60) return d + ' 秒前';
    if (d < 3600) return Math.floor(d / 60) + ' 分钟前';
    if (d < 86400) return Math.floor(d / 3600) + ' 小时前';
    return Math.floor(d / 86400) + ' 天前';
  }

  function ensureDrawer() {
    var old = document.getElementById('jyOnlineDrawer');
    if (old) return old;
    var d = document.createElement('div');
    d.id = 'jyOnlineDrawer';
    d.className = 'jy-drawer-mask';
    d.innerHTML = ''
      + '<div class="jy-drawer">'
      + '  <div class="jy-drawer-head">'
      + '    <div><i class="fas fa-signal" style="color:#28a745;"></i> 在线设备</div>'
      + '    <div style="display:flex;align-items:center;gap:10px;">'
      + '      <span id="jyOnLineCount" class="jy-drawer-count">0 台</span>'
      + '      <button class="jy-drawer-x" onclick="JY_ONLINE.close()">&times;</button>'
      + '    </div>'
      + '  </div>'
      + '  <div class="jy-drawer-body" id="jyOnLineBody"></div>'
      + '  <div class="jy-drawer-foot">'
      + '    每 15 秒自动刷新 · 在线判定窗口跟随心跳间隔'
      + '  </div>'
      + '</div>';
    document.body.appendChild(d);
    return d;
  }

  function render() {
    var body = document.getElementById('jyOnLineBody');
    var cnt = document.getElementById('jyOnLineCount');
    if (!body) return;
    if (cnt) cnt.textContent = state.list.length + ' 台';
    if (!state.list.length) {
      body.innerHTML = '<div class="jy-empty">当前没有在线设备</div>';
      return;
    }
    var html = '<table class="jy-online-table"><thead><tr>'
      + '<th>卡密</th><th>机器码</th><th>子用户</th><th>UID</th>'
      + '<th>首次在线</th><th>最后心跳</th><th>操作</th>'
      + '</tr></thead><tbody>';
    state.list.forEach(function (r) {
      html += '<tr>'
        + '<td class="mono">' + esc(r.card_no || '-') + '</td>'
        + '<td class="mono">' + esc(r.device_id || '-') + '</td>'
        + '<td>' + esc(r.user_name || '-') + '</td>'
        + '<td class="mono">' + esc(r.user_uid || '-') + '</td>'
        + '<td>' + esc(r.first_seen || '-') + '</td>'
        + '<td>' + esc(r.last_seen || '-') + '<span class="jy-ago">' + ago(r.last_seen_ts) + '</span></td>'
        + '<td><button class="jy-mini-btn" onclick="JY_ONLINE.kick(\'' + esc(r.card_no || '') + '\',\'' + esc(r.device_id || '') + '\')">踢下线</button></td>'
        + '</tr>';
    });
    html += '</tbody></table>';
    body.innerHTML = html;
  }

  async function refresh() {
    if (!state.appId) return false;
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'get_online',
        password: 开发者安全密码,
        app_id: state.appId
      });
      if (!res || !res.success) return false;
      state.list = res.data.list || [];
      state.interval = parseInt(res.data.interval, 10) || 30;
      render();
      return true;
    } catch (e) {
      return false;
    }
  }

  async function open() {
    var appId = curAppId();
    if (!appId) { alert('请先选择应用实例', false); return; }
    state.appId = appId;
    var d = ensureDrawer();
    d.style.display = 'flex';
    await refresh();
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, 15000);
  }

  function close() {
    var d = document.getElementById('jyOnlineDrawer');
    if (d) d.style.display = 'none';
    if (timer) { clearInterval(timer); timer = null; }
  }

  async function kick(cardNo, deviceId) {
    if (!cardNo && !deviceId) { alert('缺少卡密或机器码', false); return; }
    if (!confirm('确定将「' + (cardNo || '(按机器码)') + '」踢下线吗？')) return;
    try {
      var res = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'kick_online',
        password: 开发者安全密码,
        app_id: state.appId,
        card_no: cardNo || '',
        device_id: deviceId || ''
      });
      if (res && res.success) {
        alert('已踢下线 ' + ((res.data && res.data.kicked) || 0) + ' 台', 'success');
        await refresh();
      } else {
        alert('踢下线失败：' + ((res && res.message) || '未知错误'), false);
      }
    } catch (e) {
      alert('踢下线异常：' + e.message, false);
    }
  }

  window.JY_ONLINE = { open: open, close: close, refresh: refresh, kick: kick, state: state };
})();
