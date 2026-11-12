/* 首次扫码建号：账号密码只弹一次。服务端 shown 置 1 后不再返回，前端再用 localStorage 兜一层 */
(function () {
  var KEY = 'JY_CRED_ONCE';
  try { if (localStorage.getItem(KEY) === 'done') return; } catch (e) {}

  fetch('/api/账号接口入口.php?action=oauth_cred', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: '{}'
  }).then(function (r) {
    if (r.status !== 200) return null;
    return r.json();
  }).then(function (d) {
    // 只有服务端明确答复过才打完成标记；401/网络异常一律不标记，避免漏弹
    if (!d || d.success !== true || !d.data) return;
    if (d.data.has_cred === true) {
      展示凭证(d.data);
    }
    try { localStorage.setItem(KEY, 'done'); } catch (e) {}
  }).catch(function () {});

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function 展示凭证(d) {
    window.JY凭证 = d;
    var wrap = document.createElement('div');
    wrap.id = 'JY_CRED_MASK';
    var h = '';
    h += '<div style="position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999998;"></div>';
    h += '<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999999;width:min(92vw,430px);background:#fff;border-radius:16px;padding:26px 22px;box-shadow:0 24px 60px rgba(15,23,42,.28);font-family:Arial,sans-serif;">';
    h += '<div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px;">账号已自动创建</div>';
    h += '<div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:16px;">这是系统为你的 QQ / 微信 分配的极验账号，<b style="color:#d93025;">只显示这一次</b>，请立即保存。以后可以用它登录，也可以直接扫码登录。</div>';
    h += '<div style="background:#f6f8fa;border:1px solid #eaecef;border-radius:12px;padding:14px;margin-bottom:14px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;margin-bottom:10px;"><span style="color:#64748b;">登录账号</span><span style="font-family:monospace;font-weight:700;color:#0f172a;">' + esc(d.username) + '</span></div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:14px;"><span style="color:#64748b;">登录密码</span><span style="font-family:monospace;font-weight:700;color:#0f172a;">' + esc(d.password) + '</span></div>';
    h += '</div>';
    h += '<div style="font-size:12px;color:#94a3b8;margin-bottom:16px;">登录地址：' + esc(location.origin) + '/前台/开发者登录.php</div>';
    h += '<div style="display:flex;gap:10px;">';
    h += '<button type="button" id="JY_CRED_COPY" style="flex:1;height:42px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;font-size:14px;font-weight:600;cursor:pointer;">复制账号密码</button>';
    h += '<button type="button" id="JY_CRED_OK" style="flex:1;height:42px;border:none;border-radius:10px;background:#1e90ff;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">我已保存</button>';
    h += '</div></div>';
    wrap.innerHTML = h;
    document.body.appendChild(wrap);

    var btnCopy = document.getElementById('JY_CRED_COPY');
    var btnOk = document.getElementById('JY_CRED_OK');

    if (btnOk) {
      btnOk.addEventListener('click', function () {
        var m = document.getElementById('JY_CRED_MASK');
        if (m) m.remove();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var txt = '极验云 登录账号：' + (d.username || '') + '\n登录密码：' + (d.password || '') + '\n登录地址：' + location.origin + '/前台/开发者登录.php';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () {
            btnCopy.textContent = '已复制';
          }).catch(function () { prompt('请手动复制', txt); });
        } else {
          var ta = document.createElement('textarea');
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); btnCopy.textContent = '已复制'; } catch (e) { prompt('请手动复制', txt); }
          ta.remove();
        }
      });
    }
  }
})();
