/* 极验云 - JiYan
 * 自建图形验证码前端组件（覆盖层，不修改任何原有 css 文件）
 *
 * 用法：
 *   const r = await 弹出图形验证码();          // 取消返回 null
 *   if (!r) return;                             // r = { token, code }
 *   jyApi('send_code', { email, purpose, captcha_token: r.token, captcha_code: r.code });
 */
(function () {
  var API = '/api/账号接口入口.php?action=captcha_image';

  // 覆盖层样式：动态注入，避免碰 后台模块/css/*.css
  function 注入样式() {
    if (document.getElementById('JY_CAPTCHA_STYLE')) return;
    var st = document.createElement('style');
    st.id = 'JY_CAPTCHA_STYLE';
    st.textContent = [
      '#JY_CAPTCHA_MASK{position:fixed;inset:0;z-index:10000020;display:flex;align-items:center;justify-content:center;',
      'background:rgba(10,14,24,.55);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}',
      '#JY_CAPTCHA_BOX{width:min(92vw,360px);background:#fff;border-radius:16px;padding:22px 20px 18px;',
      'box-shadow:0 24px 64px rgba(9,14,26,.32);font-family:Arial,"Microsoft YaHei",sans-serif;}',
      '#JY_CAPTCHA_BOX h3{margin:0 0 6px;font-size:17px;font-weight:700;color:#0f172a;}',
      '#JY_CAPTCHA_BOX .jy-cap-tip{font-size:12.5px;color:#64748b;line-height:1.6;margin-bottom:14px;}',
      '#JY_CAPTCHA_ROW{display:flex;gap:10px;align-items:center;}',
      '#JY_CAPTCHA_IMG{height:44px;width:120px;border-radius:10px;background:#0d1220;cursor:pointer;flex:0 0 auto;',
      'border:1px solid #26304a;object-fit:cover;display:block;}',
      '#JY_CAPTCHA_INPUT{flex:1 1 auto;min-width:0;height:44px;border:1px solid #d8dee9;border-radius:10px;',
      'padding:0 12px;font-size:16px;letter-spacing:3px;text-transform:uppercase;color:#0f172a;outline:none;',
      'font-family:Consolas,Menlo,monospace;}',
      '#JY_CAPTCHA_INPUT:focus{border-color:#1e90ff;box-shadow:0 0 0 3px rgba(30,144,255,.14);}',
      '#JY_CAPTCHA_MSG{min-height:18px;font-size:12.5px;color:#d93025;margin-top:8px;line-height:1.5;}',
      '#JY_CAPTCHA_BTNS{display:flex;gap:10px;margin-top:14px;}',
      '#JY_CAPTCHA_BTNS button{flex:1;height:42px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;}',
      '#JY_CAPTCHA_CANCEL{border:1px solid #cbd5e1;background:#fff;color:#334155;}',
      '#JY_CAPTCHA_OK{border:0;background:#1e90ff;color:#fff;}',
      '#JY_CAPTCHA_OK[disabled]{opacity:.6;cursor:not-allowed;}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  function 容器() {
    var host = document.getElementById('图片验证码弹窗容器');
    return host || document.body;
  }

  // 取一张新图：返回 Promise<token>；img 的 src 直接指向接口（同源 cookie 会自动带上）
  function 刷新图片(img, msgEl) {
    return new Promise(function (resolve, reject) {
      var bust = API + '&t=' + Date.now();
      fetch(bust, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: '{}'
      }).then(function (resp) {
        var token = resp.headers.get('X-Captcha-Token') || '';
        if (!resp.ok || !token) {
          return resp.text().then(function (txt) {
            throw new Error((txt || '').trim() || ('HTTP ' + resp.status));
          });
        }
        return resp.blob().then(function (blob) {
          if (img.getAttribute('data-url')) URL.revokeObjectURL(img.getAttribute('data-url'));
          var url = URL.createObjectURL(blob);
          img.setAttribute('data-url', url);
          img.src = url;
          resolve(token);
        });
      }).catch(function (e) {
        if (msgEl) msgEl.textContent = '图片加载失败，点图重试';
        reject(e);
      });
    });
  }

  /**
   * 弹出图形验证码
   * @returns {Promise<null | {token:string, code:string}>} 取消返回 null
   */
  window.弹出图形验证码 = function () {
    return new Promise(function (resolve) {
      注入样式();

      var wrap = document.createElement('div');
      wrap.id = 'JY_CAPTCHA_MASK';
      wrap.innerHTML =
        '<div id="JY_CAPTCHA_BOX">' +
          '<h3>请输入图形验证码</h3>' +
          '<div class="jy-cap-tip">为防止恶意刷取，继续操作前请先完成验证。</div>' +
          '<div id="JY_CAPTCHA_ROW">' +
            '<img id="JY_CAPTCHA_IMG" alt="图形验证码" title="点击换一张">' +
            '<input id="JY_CAPTCHA_INPUT" type="text" maxlength="4" inputmode="text" ' +
              'autocomplete="off" autocorrect="off" autocapitalize="characters" spellcheck="false" placeholder="4 位字符">' +
          '</div>' +
          '<div id="JY_CAPTCHA_MSG"></div>' +
          '<div id="JY_CAPTCHA_BTNS">' +
            '<button type="button" id="JY_CAPTCHA_CANCEL">取消</button>' +
            '<button type="button" id="JY_CAPTCHA_OK">确定</button>' +
          '</div>' +
        '</div>';
      容器().appendChild(wrap);

      var img = document.getElementById('JY_CAPTCHA_IMG');
      var input = document.getElementById('JY_CAPTCHA_INPUT');
      var msg = document.getElementById('JY_CAPTCHA_MSG');
      var btnOk = document.getElementById('JY_CAPTCHA_OK');
      var btnCancel = document.getElementById('JY_CAPTCHA_CANCEL');
      var token = '';
      var done = false;

      function 收尾(v) {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey, true);
        var u = img.getAttribute('data-url');
        if (u) URL.revokeObjectURL(u);
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
        resolve(v);
      }

      function onKey(e) {
        if (e.key === 'Escape') { e.stopPropagation(); 收尾(null); }
        else if (e.key === 'Enter') { e.stopPropagation(); 提交(); }
      }

      function 换图() {
        msg.textContent = '';
        token = '';
        img.style.opacity = '.5';
        刷新图片(img, msg).then(function (t) {
          token = t;
          img.style.opacity = '1';
          input.value = '';
          input.focus();
        }).catch(function () {
          img.style.opacity = '1';
        });
      }

      function 提交() {
        var code = (input.value || '').trim().toUpperCase();
        if (!token) { msg.textContent = '图片还没加载好，请稍候或点图刷新'; return; }
        if (code.length !== 4) { msg.textContent = '请输入 4 位图形验证码'; input.focus(); return; }
        收尾({ token: token, code: code });
      }

      img.addEventListener('click', 换图);
      btnCancel.addEventListener('click', function () { 收尾(null); });
      btnOk.addEventListener('click', 提交);
      wrap.addEventListener('click', function (e) { if (e.target === wrap) 收尾(null); });
      input.addEventListener('input', function () { msg.textContent = ''; });
      document.addEventListener('keydown', onKey, true);

      换图();
    });
  };
})();
