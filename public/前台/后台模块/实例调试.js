/* 极验云 V1 · 实例调试面板（第十轮：从对接文档搬到实例管理） */
(function () {
  'use strict';

  var ACTIONS = [
    { v: 'use_card', label: 'use_card（卡密验证）', fields: ['card_key', 'device_id'] },
    { v: 'heartbeat', label: 'heartbeat（心跳）', fields: ['card_key', 'device_id'] },
    { v: 'update_game_info', label: 'update_game_info（同行识别）', fields: ['card_key', 'device_id', 'user_name', 'user_uid'] },
    { v: 'check_version', label: 'check_version（版本检查）', fields: ['version'] },
    { v: 'example_probe', label: 'example_probe（回环探针）', fields: ['echo'] }
  ];

  var S = { appId: '', app: null, lastReq: '', lastPlain: '', lastResp: '', lastCost: 0, lastHttp: 0, lastCode: '' };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"\\']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  function actionFields(action) {
    var hit = null;
    for (var i = 0; i < ACTIONS.length; i++) if (ACTIONS[i].v === action) hit = ACTIONS[i];
    return hit ? hit.fields : [];
  }

  function renderFields() {
    var act = $('jydbgAction').value;
    var fields = actionFields(act);
    var labels = { card_key: '卡密', device_id: '设备码 / 机器码', user_name: '玩家昵称', user_uid: '玩家 UID', version: '客户端版本号', echo: '回环内容' };
    var html = '';
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      html += '<label class="jydbg-field"><span>' + esc(labels[f] || f) + '</span>'
        + '<input id="jydbgF_' + f + '" data-field="' + f + '" placeholder="' + esc(f) + '"></label>';
    }
    html += '<label class="jydbg-field"><span>安全请求密码</span><input id="jydbgPass" placeholder=""></label>';
    html += '<label class="jydbg-field"><span>安全请求 Token</span><input id="jydbgToken" placeholder=""></label>';
    $('jydbgFields').innerHTML = html;
  }

  function applyAppGlobals(app) {
    window.当前选中的应用ID = String(app.app_id);
    window.当前选中的应用加密格式 = String(app.encryption_format || '0');
    window.当前选中的应用对接密钥 = String(app.api_key || '');
    window.当前应用的签名类型 = String(app.sign_type || '0');
    window.当前应用的签名密钥 = String(app.sign_key || '');
  }

  function collectParams() {
    var act = $('jydbgAction').value;
    var fields = actionFields(act);
    var p = { action: act };
    for (var i = 0; i < fields.length; i++) {
      var el = $('jydbgF_' + fields[i]);
      var v = el ? el.value.trim() : '';
      if (v !== '') p[fields[i]] = v;
    }
    var pw = ($('jydbgPass').value || '').trim();
    var tk = ($('jydbgToken').value || '').trim();
    if (pw !== '') p.password = pw;
    if (tk !== '') p.token = tk;
    return p;
  }

  function buildRequest(params) {
    var iv = 生成随机IV();
    var data = APP_encryptRequestParams(params, iv, 'key');
    return {
      iv: iv,
      data: data,
      body: JSON.stringify({ developer_username: 开发者UID, iv: iv, app_id: S.appId, data: data })
    };
  }

  function setLine(id, ok, text) {
    var el = $(id);
    if (!el) return;
    el.className = 'jydbg-line ' + (ok ? 'ok' : 'bad');
    el.textContent = text;
  }

  function renderMeta() {
    var a = S.app;
    if (!a) return;
    var m = [
      ['应用 ID', a.app_id],
      ['加密方式', a.encryption_format],
      ['签名方式', a.sign_type],
      ['api_key', a.api_key],
      ['sign_key', a.sign_key]
    ];
    var html = '';
    for (var i = 0; i < m.length; i++) {
      html += '<div class="jydbg-meta-row"><b>' + esc(m[i][0]) + '</b><code>' + esc(m[i][1] || '') + '</code>'
        + '<button type="button" data-copy="' + esc(m[i][1] || '') + '">复制</button></div>';
    }
    $('jydbgMeta').innerHTML = html;
    var btns = $('jydbgMeta').querySelectorAll('button[data-copy]');
    for (var k = 0; k < btns.length; k++) {
      btns[k].onclick = function () {
        var v = this.getAttribute('data-copy');
        if (navigator.clipboard) navigator.clipboard.writeText(v);
      };
    }
  }

  function openPanel(appId, appName) {
    S.appId = String(appId);
    S.app = null;
    var old = document.getElementById('jydbgMask');
    if (old) old.parentNode.removeChild(old);

    var mask = document.createElement('div');
    mask.id = 'jydbgMask';
    mask.className = '弹窗遮罩 jydbg-mask';
    mask.innerHTML = ''
      + '<div class="弹窗背景 jydbg-box">'
      + '  <div class="弹窗头部"><div class="弹窗头部文字"><i class="fas fa-bug" style="color:#1e90ff;"></i><h4>实例调试面板 · ' + esc(appName || '') + '（ID ' + esc(appId) + '）</h4></div>'
      + '    <button class="弹窗头部关闭按钮" id="jydbgX">&times;</button></div>'
      + '  <div class="弹窗内部 jydbg-body">'
      + '    <div class="jydbg-meta" id="jydbgMeta"></div>'
      + '    <div class="jydbg-row"><label class="jydbg-field"><span>action</span><select id="jydbgAction"></select></label></div>'
      + '    <div class="jydbg-grid" id="jydbgFields"></div>'
      + '    <div class="jydbg-actions">'
      + '      <button type="button" class="jydbg-btn" id="jydbgGen">生成请求串</button>'
      + '      <button type="button" class="jydbg-btn primary" id="jydbgSend">实测发送</button>'
      + '      <button type="button" class="jydbg-btn" id="jydbgClear">清空结果</button>'
      + '    </div>'
      + '    <div class="jydbg-lines">'
      + '      <div class="jydbg-line" id="jydbgL1">请求明文 / 密文 / 签名：等待生成</div>'
      + '      <div class="jydbg-line" id="jydbgL2">明文响应：—</div>'
      + '      <div class="jydbg-line" id="jydbgL3">解密后 JSON：—</div>'
      + '      <div class="jydbg-line" id="jydbgL4">rc 回传比对：—</div>'
      + '      <div class="jydbg-line" id="jydbgL5">响应验签：—</div>'
      + '    </div>'
      + '    <pre class="jydbg-out" id="jydbgOut"></pre>'
      + '    <div class="jydbg-foot" id="jydbgFoot">耗时 — · HTTP — · code —</div>'
      + '  </div>'
      + '</div>';
    document.body.appendChild(mask);

    var sel = $('jydbgAction');
    for (var i = 0; i < ACTIONS.length; i++) {
      var o = document.createElement('option');
      o.value = ACTIONS[i].v;
      o.textContent = ACTIONS[i].label;
      sel.appendChild(o);
    }
    sel.value = 'example_probe';
    sel.onchange = renderFields;
    renderFields();

    $('jydbgX').onclick = function () { mask.parentNode.removeChild(mask); };
    $('jydbgGen').onclick = generate;
    $('jydbgSend').onclick = send;
    $('jydbgClear').onclick = clearOut;

    var params = { action: 'get_app_api_key', password: 开发者安全密码, app_id: S.appId };
    POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('app.php'), params).then(function (r) {
      if (!r || !r.success) { setLine('jydbgL1', false, '读取应用配置失败：' + ((r && r.message) || '未知错误')); return; }
      S.app = r.data || {};
      renderMeta();
    }).catch(function (e) {
      setLine('jydbgL1', false, '读取应用配置异常：' + (e && e.message));
    });
  }

  function clearOut() {
    var ids = ['jydbgL1', 'jydbgL2', 'jydbgL3', 'jydbgL4', 'jydbgL5'];
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el) { el.className = 'jydbg-line'; el.textContent = '—'; }
    }
    $('jydbgOut').textContent = '';
    $('jydbgFoot').textContent = '耗时 — · HTTP — · code —';
  }

  function generate() {
    if (!S.app) { setLine('jydbgL1', false, '应用配置还没读到，请稍候再试'); return; }
    var prev = snapshot();
    try {
      applyAppGlobals(S.app);
      var p = collectParams();
      var req = buildRequest(p);
      S.lastReq = req;
      var plain = Object.keys(p).map(function (k) { return k + '=' + p[k]; }).join('&');
      $('jydbgOut').textContent = '【明文参数】\n' + plain
        + '\n\n【IV】\n' + req.iv
        + '\n\n【密文 data】\n' + req.data
        + '\n\n【请求体】\n' + req.body;
      setLine('jydbgL1', true, '已生成请求串（未发送）：' + p.action);
    } catch (e) {
      setLine('jydbgL1', false, '生成失败：' + (e && e.message));
    } finally { restore(prev); }
  }

  function snapshot() {
    return {
      id: window.当前选中的应用ID, enc: window.当前选中的应用加密格式, key: window.当前选中的应用对接密钥,
      st: window.当前应用的签名类型, sk: window.当前应用的签名密钥
    };
  }
  function restore(p) {
    window.当前选中的应用ID = p.id; window.当前选中的应用加密格式 = p.enc;
    window.当前选中的应用对接密钥 = p.key; window.当前应用的签名类型 = p.st; window.当前应用的签名密钥 = p.sk;
  }

  async function send() {
    if (!S.app) { setLine('jydbgL2', false, '应用配置还没读到，请稍候再试'); return; }
    var prev = snapshot();
    var t0 = Date.now();
    try {
      applyAppGlobals(S.app);
      var p = collectParams();
      var req = buildRequest(p);
      S.lastReq = req;
      $('jydbgL1').className = 'jydbg-line ok';
      $('jydbgL1').textContent = '请求已发送：' + p.action;

      var res = await fetch(获取API链接('key.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: req.body
      });
      var httpStatus = res.status;
      var text = await res.text();
      var cost = Date.now() - t0;

      var json = null, decrypted = '';
      try { json = JSON.parse(text); } catch (e1) {}
      if (!json) {
        try { decrypted = APP_解密(text, req.iv); } catch (e2) {}
        try { json = JSON.parse(decrypted); } catch (e3) {}
      }
      if (!json && decrypted === '' && text) {
        try { decrypted = APP_解密(text, req.iv); } catch (e4) {}
      }

      $('jydbgL2').className = 'jydbg-line ok';
      $('jydbgL2').textContent = '明文响应：' + String(text || '').slice(0, 400);
      $('jydbgL3').className = 'jydbg-line ' + (json ? 'ok' : 'bad');
      $('jydbgL3').textContent = '解密后 JSON：' + (json ? JSON.stringify(json).slice(0, 400) : ('解密失败 / 原文：' + String(decrypted || '').slice(0, 200)));

      var rcOk = false, rcMsg = '无法比对（响应无 rc）';
      var expectRc = (p.rc || '') || (json && json.rc) || '';
      if (json && json.data && typeof json.data === 'object' && 'rc' in json.data) {
        var got = String(json.data.rc || '');
        S.lastCode = got;
        var sent = S.lastRc || '';
        rcOk = (got !== '' && sent !== '' && got === sent);
        rcMsg = 'rc 回传比对：期望 ' + (sent || '(未记录)') + ' / 实际 ' + got + (rcOk ? ' ✔ 一致' : ' ✘ 不一致');
      } else {
        rcMsg = 'rc 回传比对：响应中没有 data.rc（服务端未回传）';
      }
      setLine('jydbgL4', rcOk, rcMsg);

      var signOk = true, signMsg = '响应验签：签名方式 0，免验';
      if (String(S.app.sign_type || '0') !== '0') {
        try { signOk = !!APP_校验响应签名(json || {}); } catch (e5) { signOk = false; }
        signMsg = '响应验签：' + (signOk ? '✔ 通过' : '✘ 失败');
      }
      setLine('jydbgL5', signOk, signMsg);

      $('jydbgOut').textContent = '【请求明文】\n' + JSON.stringify(p, null, 2)
        + '\n\n【密文 data】\n' + req.data
        + '\n\n【响应原文】\n' + String(text || '')
        + '\n\n【响应 JSON】\n' + (json ? JSON.stringify(json, null, 2) : '(无法解析)');
      $('jydbgFoot').textContent = '耗时 ' + cost + ' ms · HTTP ' + httpStatus + ' · code ' + (json ? (json.code !== undefined ? json.code : '—') : '—');
    } catch (e) {
      setLine('jydbgL2', false, '请求异常：' + (e && e.message));
    } finally { restore(prev); }
  }

  window.打开实例调试面板 = openPanel;
})();
