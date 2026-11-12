/* 极验云 - JiYan
 * 账号绑定模块（QQ / 微信 / 邮箱 / Telegram）
 *
 * 依赖：请求.js、通用.js、图形验证码.js
 * 约定：每类最多绑定 1 个；绑定/解绑都要过验证码；最后一个登录方式不允许解绑。
 *
 * 重要：所有输入弹窗都是页面内自绘的覆盖层，不用 prompt()。
 *       原生 prompt 在切标签页/切App后会消失，导致「去看验证码再回来就没了」。
 */
(function () {
  'use strict';

  var 绑定缓存 = null;
  var 已初始化 = false;

  function api() {
    return 获取API链接('api.php');
  }

  function 调后端(params) {
    params = params || {};
    params.password = (typeof 开发者密码 !== 'undefined') ? 开发者密码 : '';
    return POSTPHP(开发者UID, 开发者密码, 开发者Token, api(), params);
  }

  function 弹图形码() {
    if (typeof 弹出图形验证码 !== 'function') return Promise.resolve(null);
    return 弹出图形验证码();
  }

  /* ================= 自绘输入弹窗（替代 prompt） ================= */

  function 注入样式() {
    if (document.getElementById('JY_INPUT_STYLE')) return;
    var st = document.createElement('style');
    st.id = 'JY_INPUT_STYLE';
    st.textContent = [
      '#JY_INPUT_MASK{position:fixed;inset:0;z-index:10000010;display:flex;align-items:center;justify-content:center;',
      'background:rgba(10,14,24,.55);}',
      '#JY_INPUT_BOX{width:min(92vw,380px);background:#fff;border-radius:16px;padding:22px 20px 18px;',
      'box-shadow:0 24px 64px rgba(9,14,26,.32);font-family:Arial,"Microsoft YaHei",sans-serif;}',
      '#JY_INPUT_BOX h3{margin:0 0 8px;font-size:17px;font-weight:700;color:#0f172a;}',
      '#JY_INPUT_TIP{font-size:12.5px;color:#64748b;line-height:1.7;margin-bottom:14px;}',
      '#JY_INPUT_FIELD{width:100%;height:46px;border:1px solid #d8dee9;border-radius:10px;padding:0 12px;',
      'font-size:17px;letter-spacing:4px;color:#0f172a;outline:none;box-sizing:border-box;',
      'font-family:Consolas,Menlo,monospace;text-align:center;}',
      '#JY_INPUT_FIELD:focus{border-color:#1e90ff;box-shadow:0 0 0 3px rgba(30,144,255,.14);}',
      '#JY_INPUT_MSG{min-height:18px;font-size:12.5px;color:#d93025;margin-top:8px;}',
      '#JY_INPUT_BTNS{display:flex;gap:10px;margin-top:14px;}',
      '#JY_INPUT_BTNS button{flex:1;height:42px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;}',
      '#JY_INPUT_CANCEL{border:1px solid #cbd5e1;background:#fff;color:#334155;}',
      '#JY_INPUT_OK{border:0;background:#1e90ff;color:#fff;}',
      '#JY_INPUT_RESEND{border:0;background:#f1f5f9;color:#475569;font-size:12.5px;height:34px;',
      'border-radius:8px;margin-top:10px;width:100%;cursor:pointer;}',
      '#JY_INPUT_RESEND[disabled]{opacity:.55;cursor:not-allowed;}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  /**
   * 弹一个输入框
   * @param {object} opt {title, tip, placeholder, maxlength, numeric, okText, onResend}
   * @returns {Promise<string|null>}
   */
  function 弹出输入框(opt) {
    opt = opt || {};
    注入样式();

    return new Promise(function (resolve) {
      var wrap = document.createElement('div');
      wrap.id = 'JY_INPUT_MASK';
      var resendHtml = opt.onResend
        ? '<button type="button" id="JY_INPUT_RESEND">没收到？重新发送验证码</button>'
        : '';
      wrap.innerHTML = ''
        + '<div id="JY_INPUT_BOX">'
        + '  <h3>' + (opt.title || '请输入') + '</h3>'
        + '  <div id="JY_INPUT_TIP">' + (opt.tip || '') + '</div>'
        + '  <input id="JY_INPUT_FIELD" type="text" autocomplete="off" autocorrect="off" '
        + ' spellcheck="false" placeholder="' + (opt.placeholder || '') + '" '
        + ' maxlength="' + (opt.maxlength || 64) + '" '
        + ' inputmode="' + (opt.numeric ? 'numeric' : 'text') + '">'
        + '  <div id="JY_INPUT_MSG"></div>'
        + resendHtml
        + '  <div id="JY_INPUT_BTNS">'
        + '    <button type="button" id="JY_INPUT_CANCEL">取消</button>'
        + '    <button type="button" id="JY_INPUT_OK">' + (opt.okText || '确定') + '</button>'
        + '  </div>'
        + '</div>';
      document.body.appendChild(wrap);

      var field = document.getElementById('JY_INPUT_FIELD');
      var msg = document.getElementById('JY_INPUT_MSG');
      var btnOk = document.getElementById('JY_INPUT_OK');
      var btnCancel = document.getElementById('JY_INPUT_CANCEL');
      var btnResend = document.getElementById('JY_INPUT_RESEND');
      var done = false;

      function 收尾(v) {
        if (done) return;
        done = true;
        var box = document.getElementById('JY_INPUT_MASK');
        if (box && box.parentNode) box.parentNode.removeChild(box);
        resolve(v);
      }

      function 提交() {
        var v = (field.value || '').trim();
        if (!v) { msg.textContent = '请输入内容'; field.focus(); return; }
        if (opt.numeric && !/^[0-9]+$/.test(v)) { msg.textContent = '只能输入数字'; field.focus(); return; }
        if (opt.maxlength && v.length > opt.maxlength) { msg.textContent = '长度超出'; return; }
        收尾(v);
      }

      btnOk.addEventListener('click', 提交);
      btnCancel.addEventListener('click', function () { 收尾(null); });
      field.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); 提交(); }
        else if (e.key === 'Escape') { e.preventDefault(); 收尾(null); }
      });
      field.addEventListener('input', function () { msg.textContent = ''; });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) 收尾(null); });

      if (btnResend) {
        var 剩余 = 60;
        var timer = null;
        function 计数() {
          剩余--;
          if (剩余 <= 0) {
            clearInterval(timer);
            btnResend.disabled = false;
            btnResend.textContent = '没收到？重新发送验证码';
          } else {
            btnResend.textContent = 剩余 + ' 秒后可重新发送';
          }
        }
        timer = setInterval(计数, 1000);
        btnResend.disabled = true;
        btnResend.textContent = 60 + ' 秒后可重新发送';

        btnResend.addEventListener('click', function () {
          if (btnResend.disabled) return;
          btnResend.disabled = true;
          剩余 = 60;
          btnResend.textContent = 60 + ' 秒后可重新发送';
          clearInterval(timer);
          timer = setInterval(计数, 1000);
          try { opt.onResend(); } catch (e) {}
        });
      }

      setTimeout(function () { field.focus(); }, 60);
    });
  }

  /* ================= 渲染 ================= */

  function 遮邮箱(e) {
    var at = e.indexOf('@');
    if (at < 2) return e;
    return e.slice(0, 2) + '***' + e.slice(at);
  }

  function 渲染(列表) {
    绑定缓存 = 列表 || [];
    var host = document.getElementById('绑定列表容器');
    if (!host) return;

    var 图标 = { qq: 'fa-brands fa-qq', wx: 'fa-brands fa-weixin', email: 'fa-solid fa-envelope', telegram: 'fa-brands fa-telegram' };
    var 颜色 = { qq: '#12b7f5', wx: '#07c160', email: '#f0a500', telegram: '#229ed9' };
    var 文案 = { qq: 'QQ', wx: '微信', email: '邮箱', telegram: 'Telegram' };

    host.innerHTML = 绑定缓存.map(function (it) {
      var t = it.type;
      var bound = !!it.bound;
      var 状态 = bound
        ? '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#07c160;">'
            + '<i class="fa-solid fa-circle-check"></i>已绑定</span>'
        : '<span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:#9aa3b2;">'
            + '<i class="fa-regular fa-circle"></i>未绑定</span>';

      var 按钮;
      if (bound) {
        var disabled = it.lockout ? 'disabled style="opacity:.5;cursor:not-allowed;"' : '';
        var title = it.lockout ? ' title="这是最后一个登录方式，请先绑定其他方式"' : '';
        按钮 = '<a class="按钮" ' + disabled + title + ' onclick="解绑账号(\'' + t + '\')">解绑</a>';
      } else if (it.can_bind === false) {
        按钮 = '<span style="font-size:12px;color:#9aa3b2;">未开放</span>';
      } else {
        按钮 = '<a class="按钮" onclick="绑定账号(\'' + t + '\')">绑定</a>';
      }

      var 副行 = '';
      if (bound && t === 'email') {
        副行 = '<div style="font-size:11px;color:#9aa3b2;margin-top:2px;">' + 遮邮箱(it.display || '') + '</div>';
      } else if (bound) {
        副行 = '<div style="font-size:11px;color:#9aa3b2;margin-top:2px;">已授权，可使用此账号登录</div>';
      }

      return ''
        + '<div style="display:flex;align-items:center;gap:8px;padding:12px;background:#f8f9fa85;border-radius:6px;margin-bottom:10px;">'
        + '  <div style="color:' + 颜色[t] + ';font-size:20px;width:32px;text-align:center;">'
        + '    <i class="' + 图标[t] + '"></i>'
        + '  </div>'
        + '  <div style="flex:1;">'
        + '    <div style="font-size:13px;color:#2a2e3e;font-weight:600;display:flex;align-items:center;gap:8px;">'
        +      文案[t] + 状态
        + '    </div>' + 副行
        + '  </div>'
        +    按钮
        + '</div>';
    }).join('');
  }

  /* ================= 头像 ================= */

  var 默认头像 = '后台模块/image/jiyan-logo.png';

  function 应用头像(url) {
    var box = document.getElementById('eNVAvatar1');
    if (!box) return;
    var img = box.querySelector('img');
    var icon = box.querySelector('i');
    if (!img) return;
    var src = url || 默认头像;
    img.src = src;
    img.style.display = '';
    img.onerror = function () { img.src = 默认头像; };
    if (icon) icon.style.display = 'none';
  }

  /* ================= 拉取 ================= */

  function 加载绑定() {
    return 调后端({ action: 'get_bindings' }).then(function (r) {
      if (!r || !r.success) return;
      var d = r.data || {};
      if (d.bindings) 渲染(d.bindings);
      应用头像(d.avatar_url || '');
    }).catch(function () {});
  }

  window.刷新头像 = function () {
    return 调后端({ action: 'update_info' }).then(function (r) {
      if (!r || !r.success) return;
      var d = r.data || {};
      应用头像(d.avatar_url || '');
      if (d.bindings) 渲染(d.bindings);
      if (d.user_name) {
        var el = document.getElementById('displayUsername');
        if (el) el.textContent = d.user_name;
      }
    }).catch(function () {});
  };

  /* ================= 绑定 / 解绑 ================= */

  window.绑定账号 = function (type) {
    var it = null;
    (绑定缓存 || []).forEach(function (x) { if (x.type === type) it = x; });
    if (it && it.can_bind === false) { alert('该绑定方式暂未开放', false); return; }
    if (type === 'email') { 绑定邮箱(); return; }
    绑定第三方(type);
  };

  window.解绑账号 = function (type) {
    var it = null;
    (绑定缓存 || []).forEach(function (x) { if (x.type === type) it = x; });
    if (it && it.lockout) {
      alert('这是最后一个登录方式，请先绑定其他方式再解绑', false);
      return;
    }
    if (type === 'email') { 解绑邮箱(); return; }
    解绑第三方(type);
  };

  function 绑定第三方(type) {
    var 名 = type === 'telegram' ? 'Telegram' : (type === 'wx' ? '微信' : 'QQ');
    弹图形码().then(function (cap) {
      if (!cap) return;
      return 调后端({
        action: type === 'telegram' ? 'telegram_bind_url' : 'oauth_bind_url',
        bind_type: type,
        captcha_token: cap.token,
        captcha_code: cap.code
      }).then(function (r) {
        if (!r || !r.success) { alert((r && r.message) || '获取授权地址失败', false); return; }
        var url = r.data && r.data.url;
        if (!url) { alert('授权地址为空', false); return; }
        location.href = url;
      });
    }).catch(function (e) {
      alert('绑定' + 名 + '失败：' + (e && e.message ? e.message : '网络异常'), false);
    });
  }

  function 解绑第三方(type) {
    var 名 = type === 'telegram' ? 'Telegram' : (type === 'wx' ? '微信' : 'QQ');
    if (!confirm('确定解绑' + 名 + '吗？解绑后将不能用' + 名 + '账号登录。')) return;
    弹图形码().then(function (cap) {
      if (!cap) return;
      return 调后端({
        action: type === 'telegram' ? 'telegram_unbind' : 'oauth_unbind',
        bind_type: type,
        captcha_token: cap.token,
        captcha_code: cap.code
      }).then(function (r) {
        if (!r || !r.success) { alert((r && r.message) || '解绑失败', false); return; }
        alert((r.message || (名 + '已解绑')), true);
        var d = r.data || {};
        if (d.bindings) 渲染(d.bindings);
        应用头像(d.avatar_url || '');
      });
    }).catch(function (e) {
      alert('解绑' + 名 + '失败：' + (e && e.message ? e.message : '网络异常'), false);
    });
  }

  /* ---- 邮箱：绑定 ---- */
  function 绑定邮箱() {
    弹出输入框({
      title: '绑定邮箱',
      tip: '请输入要绑定的邮箱（QQ / 163 / 126 / Gmail 等常见邮箱）',
      placeholder: 'example@qq.com',
      maxlength: 64
    }).then(function (email) {
      if (email === null) return;
      email = email.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { alert('邮箱格式不正确', false); return; }

      var ticketHolder = { ticket: '' };

      function 发码(silent) {
        return 弹图形码().then(function (cap) {
          if (!cap) return null;
          return 调后端({
            action: 'send_bind_code',
            bind_type: 'email',
            bind_action: 'bind',
            email: email,
            captcha_token: cap.token,
            captcha_code: cap.code
          }).then(function (r) {
            if (!r || !r.success) {
              if (!silent) alert((r && r.message) || '验证码发送失败', false);
              return null;
            }
            ticketHolder.ticket = (r.data && r.data.ticket) || '';
            if (!silent) alert('验证码已发送到 ' + email, true);
            return ticketHolder.ticket;
          });
        });
      }

      发码(false).then(function (ticket) {
        if (!ticket) return;
        弹出输入框({
          title: '输入邮箱验证码',
          tip: '验证码已发送到 <b>' + email + '</b><br>可以直接切到邮箱App查看，回来弹窗还在。',
          placeholder: '6 位数字',
          maxlength: 6,
          numeric: true,
          okText: '确认绑定',
          onResend: function () {
            return 发码(true).then(function (t) {
              if (t) alert('验证码已重新发送', true);
            });
          }
        }).then(function (code) {
          if (code === null) return;
          if (!/^[0-9]{6}$/.test(code)) { alert('请输入 6 位数字验证码', false); return; }

          调后端({ action: 'bind_email', ticket: ticketHolder.ticket, code: code }).then(function (r2) {
            if (!r2 || !r2.success) { alert((r2 && r2.message) || '绑定失败', false); return; }
            alert('邮箱绑定成功', true);
            var d = r2.data || {};
            if (d.bindings) 渲染(d.bindings);
            应用头像(d.avatar_url || '');
            刷新头像();
          });
        });
      });
    });
  }

  /* ---- 邮箱：解绑 ---- */
  function 解绑邮箱() {
    if (!confirm('确定解绑邮箱吗？解绑后将不能再用该邮箱找回密码。')) return;

    var ticketHolder = { ticket: '', email: '' };

    function 发码(silent) {
      return 弹图形码().then(function (cap) {
        if (!cap) return null;
        return 调后端({
          action: 'send_bind_code',
          bind_type: 'email',
          bind_action: 'unbind',
          captcha_token: cap.token,
          captcha_code: cap.code
        }).then(function (r) {
          if (!r || !r.success) {
            if (!silent) alert((r && r.message) || '验证码发送失败', false);
            return null;
          }
          ticketHolder.ticket = (r.data && r.data.ticket) || '';
          ticketHolder.email = (r.data && r.data.email) || '';
          if (!silent) alert('验证码已发送到 ' + 遮邮箱(ticketHolder.email), true);
          return ticketHolder.ticket;
        });
      });
    }

    发码(false).then(function (ticket) {
      if (!ticket) return;
      弹出输入框({
        title: '确认解绑邮箱',
        tip: '验证码已发送到 <b>' + 遮邮箱(ticketHolder.email) + '</b><br>输入邮件中的 6 位验证码以确认解绑。',
        placeholder: '6 位数字',
        maxlength: 6,
        numeric: true,
        okText: '确认解绑',
        onResend: function () {
          return 发码(true).then(function (t) {
            if (t) alert('验证码已重新发送', true);
          });
        }
      }).then(function (code) {
        if (code === null) return;
        if (!/^[0-9]{6}$/.test(code)) { alert('请输入 6 位数字验证码', false); return; }

        调后端({ action: 'unbind_email', ticket: ticketHolder.ticket, code: code }).then(function (r2) {
          if (!r2 || !r2.success) { alert((r2 && r2.message) || '解绑失败', false); return; }
          alert('邮箱已解绑', true);
          var d = r2.data || {};
          if (d.bindings) 渲染(d.bindings);
          应用头像(d.avatar_url || '');
          刷新头像();
        });
      });
    });
  }

  /* ================= 初始化 ================= */

  function 初始化() {
    if (已初始化) return;
    if (typeof POSTPHP !== 'function' || typeof 获取API链接 !== 'function') return;
    已初始化 = true;

    try {
      var q = new URLSearchParams(location.search);
      if (q.get('bind') === '1') {
        var okMsg = q.get('bind_ok');
        var errMsg = q.get('bind_err');
        if (okMsg) setTimeout(function () { alert(okMsg, true); }, 400);
        if (errMsg) setTimeout(function () { alert(errMsg, false); }, 400);
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) {}

    加载绑定();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(初始化, 600); });
  } else {
    setTimeout(初始化, 600);
  }

  window.加载账号绑定 = 加载绑定;
  window.弹出输入框 = 弹出输入框;
})();
