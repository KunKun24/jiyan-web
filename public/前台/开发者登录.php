<?php
// 全站访问打点（page 通道）：登录页
require_once dirname(__DIR__) . '/_backend.php';
try { \JY\ApiLog::visitAuto('登录页'); } catch (\Throwable $e) {}
?>

<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>极验云 - 商家登录</title>
<script src="/公共资源/vendor/crypto-js.min.js"></script>
<link rel="stylesheet" href="/公共资源/fa.all.min.css?v=20261025full">
<style>
  @import url("/前台/后台模块/登录页面/Main.css");
  @import url("/前台/后台模块/二次元壁纸.css");
  @import url("/前台/后台模块/页面加载动画.css");
  @import url("/前台/后台模块/弹窗.css");
  @import url("/前台/后台模块/第三方登录.css");
  .三方登录按钮.telegram i { color: #229ed9; }
  /* 右侧内容精简：第三方并成一行、提示语弱化（2026-11-08） */
  .三方登录按钮组 { gap: 10px; }
  .三方登录按钮 { height: 44px; font-size: 13px; gap: 6px; }
  .三方登录按钮 svg { width: 17px; height: 17px; }
  .三方登录按钮.telegram i { font-size: 17px; }
  .扫码兜底_标题 { font-size: 11.5px; color: #9aa3af; }
  .协议提示 { font-size: 11px; color: #9aa3af; margin: 14px 0 0; line-height: 1.8; text-align: center; }
  .协议提示 a { color: #6b7280; white-space: nowrap; }
  .协议提示 a:hover { color: #1e90ff; }
  .表单右侧链接 { margin-top: 14px; }
  .表单说明 { font-size: 12.5px; color: #8b95a5; line-height: 1.75; margin: 0 0 18px; }
  .表单提示 { font-size: 12.5px; line-height: 1.6; margin-top: 12px; min-height: 18px; }
  .表单提示.提示-错误 { color: #e5484d; }
  .表单提示.提示-成功 { color: #12805c; }
  /* 顶部小提示（替代系统 alert） */
  .jy-toast-wrap { position: fixed; top: 22px; left: 50%; transform: translateX(-50%); z-index: 100003; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; }
  .jy-toast { display: inline-flex; align-items: center; gap: 8px; max-width: min(88vw, 420px); padding: 10px 16px 10px 12px; background: #fff; border: 1px solid #e8edf4; border-radius: 12px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12); font-size: 13.5px; color: #1f2937; line-height: 1.5; opacity: 0; transform: translateY(-8px); transition: opacity .22s ease, transform .22s ease; }
  .jy-toast.show { opacity: 1; transform: translateY(0); }
  .jy-toast-ic { flex: 0 0 auto; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; color: #fff; font-weight: 700; }
  .jy-toast-ok .jy-toast-ic { background: #12b76a; }
  .jy-toast-err .jy-toast-ic { background: #f04438; }
  /* 按钮配色统一：蓝色渐变 + 蓝色投影（原样式带绿色投影） */
  .登录按钮, .验证码发送按钮 {
    background: linear-gradient(135deg, #5b7cfa 0%, #3b52d4 100%);
    box-shadow: 0 6px 16px rgba(59, 82, 212, 0.24);
    letter-spacing: 1px;
  }
  .登录按钮:hover, .验证码发送按钮:hover {
    background: linear-gradient(135deg, #6a8aff 0%, #455de0 100%);
    box-shadow: 0 8px 20px rgba(59, 82, 212, 0.3);
  }
  .登录按钮:active, .验证码发送按钮:active { transform: translateY(1px); }
  /* 输入框：右侧面板变白后，原来半透明白底会糊在一起，改成浅灰底 + 细边 */
  .输入框外层 { background: #f8fafc; border: 1px solid #e6ebf2; }
  .输入框外层:focus-within { background: #fff; border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12); }
  .登录按钮:focus-visible, .验证码发送按钮:focus-visible {
    outline: 2px solid #93c5fd; outline-offset: 2px;
  }
  /* 右侧面板底色：文字压在壁纸上时更清晰 */
  .登录页面 { background: linear-gradient(to left, #ffffff 0%, #ffffff 46%, rgba(255, 255, 255, 0.72) 100%); }
  @media (max-width: 844px) {
    .版权行 { display: none; }
    .登录页面 {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.66), rgba(255, 255, 255, 0.84));
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
    }
  }
</style>
<link rel="stylesheet" href="/公共资源/music-player.css?v=20261025float1">
<script defer src="/公共资源/music-player.js?v=20261025backend1"></script>
</head>
<body>

<div id="Env_load">
  <div class="spinner">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
  <div class="loading-text">正在加载数据</div>
</div>

<div id="Env_main" style="display: none;">
<div class="登录页面控制器">

  <div class="PC左侧UI">
    <div class="全局左上角LOGO">
      <div class="全局左上角LOGO_图标">
          <img src="后台模块/image/jiyan-logo.png" alt="">
      </div>
      <span class="全局左上角LOGO_文字">JiYan Network</span>
    </div>

    <div class="PC左侧UI_中心控制器">
      <div class="PC左侧UI_中心控制器2 active">
        <div class="背景"><div class="散光"></div></div>
        <div class="PC左侧UI_内容">
          <h2 class="PC左侧UI_标题">快速便捷</h2>
          <p class="PC左侧UI_文本">一站式解决卡密验证/云更新/用户管理等等..服务。</p>
        </div>
      </div>

      <div class="PC左侧UI_中心控制器2">
        <div class="背景"><div class="散光"></div></div>
        <div class="PC左侧UI_内容">
          <h2 class="PC左侧UI_标题">信誉担保</h2>
          <p class="PC左侧UI_文本">挂圈知名长期开发者，全网运营时长第一的作者。</p>
        </div>
      </div>
    </div>

    <div class="PC左侧UI_底部控制器">
      <div class="PC左侧UI_底部控制器2">
        <span class="PC左侧UI_底部控制器3 选中" data-index="0"></span>
        <span class="PC左侧UI_底部控制器3" data-index="1"></span>
      </div>
    </div>
  </div>

  <div class="登录页面">
    <div class="登录页面_内容">

      <div id="登录区块">
        <div class="移动端品牌标识" aria-hidden="true">
          <img src="后台模块/image/jiyan-logo.png" alt="">
          <span>JiYan Network</span>
        </div>

        <div class="表单标题行">
          <h2 class="表单标题">商户登录</h2>
        </div>

        <form onsubmit="return false;">
          <div class="表单项">
            <div class="输入框外层">
              <input class="输入框" type="text" id="登录_UID" placeholder="请输入 JiYan_ 账号" autocomplete="username">
            </div>
          </div>

          <div class="表单项">
            <div class="输入框外层">
              <input class="输入框" type="password" id="登录_密码" placeholder="请输入登录密码" autocomplete="current-password">
              <span class="输入框后缀" onclick="密码可见切换(this)">显示</span>
            </div>
          </div>

          <button class="登录按钮" type="button" onclick="登录事件()">登 录</button>

          <div class="三方登录分隔线"><span>第三方登录</span></div>
          <div class="三方登录按钮组">
            <button class="三方登录按钮 qq" type="button" title="QQ 登录" onclick="第三方登录('qq', this)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.7 2 6.4 4.5 6.4 7.8c0 .9-.4 1.4-.9 2.2-.6 1-1.2 2-1.2 3.4 0 .8.3 1.4.7 1.9-.3.7-.5 1.3-.5 1.8 0 .7.6 1.1 1.6 1.1.3 0 .6 0 .9-.1.5.9 1.6 1.5 2.9 1.7-.3.4-.5.8-.5 1.1 0 .6.5 1 1.3 1h2.6c.8 0 1.3-.4 1.3-1 0-.3-.2-.7-.5-1.1 1.3-.2 2.4-.8 2.9-1.7.3.1.6.1.9.1 1 0 1.6-.4 1.6-1.1 0-.5-.2-1.1-.5-1.8.4-.5.7-1.1.7-1.9 0-1.4-.6-2.4-1.2-3.4-.5-.8-.9-1.3-.9-2.2C17.6 4.5 15.3 2 12 2z"/></svg>
              <span>QQ</span>
            </button>
            <button class="三方登录按钮 wx" type="button" title="微信登录" onclick="第三方登录('wx', this)">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3C4.9 3 1.6 5.8 1.6 9.2c0 1.9 1.1 3.6 2.9 4.8l-.7 2.2 2.5-1.3c.8.2 1.7.4 2.7.4h.6c-.2-.5-.3-1.1-.3-1.7 0-3.4 3.2-6.1 7.2-6.1h.6C16.5 5.2 13.1 3 9 3zm-2.5 3.4c.6 0 1 .4 1 .9s-.4.9-1 .9-1-.4-1-.9.4-.9 1-.9zm5 0c.6 0 1 .4 1 .9s-.4.9-1 .9-1-.4-1-.9.4-.9 1-.9zM17 9.5c-3.3 0-6 2.3-6 5.1 0 2.8 2.7 5.1 6 5.1.7 0 1.4-.1 2-.3l2 1-.6-1.7c1.3-.9 2.1-2.3 2.1-3.9 0-2.8-2.7-5.3-5.5-5.3zm-2 2.6c.5 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.3-.8.8-.8zm4 0c.5 0 .8.3.8.8s-.3.8-.8.8-.8-.3-.8-.8.3-.8.8-.8z"/></svg>
              <span>微信</span>
            </button>
            <?php if (\JY\TelegramConfig::ready()): ?>
            <button class="三方登录按钮 telegram" type="button" title="Telegram 登录" onclick="Telegram登录(this)">
              <i class="fa-brands fa-telegram" aria-hidden="true"></i>
              <span>Telegram</span>
            </button>
            <?php endif; ?>
          </div>

          <div class="扫码兜底">
            <div class="扫码兜底_标题" onclick="切换扫码兜底()">扫码没跳回？手动完成</div>
            <div class="扫码兜底_面板" id="扫码兜底_面板" style="display:none;">
              <div class="表单项">
                <div class="输入框外层">
                  <input class="输入框" type="text" id="兜底_code" placeholder="粘贴地址栏里 code= 后面那一串">
                </div>
              </div>
              <button class="登录按钮" type="button" onclick="兜底登录(false)">完成登录</button>
            </div>
          </div>

          <div class="表单右侧链接">
            <div class="链接操作组">
              <span class="文字链接" onclick="切换到注册账号()">注册账号</span>
              <span class="文字链接" onclick="切换到找回密码()">找回密码</span>
            </div>
          </div>
        </form>
      </div>

      <div id="注册区块" style="display: none;">
        <div class="移动端品牌标识" aria-hidden="true">
          <img src="后台模块/image/jiyan-logo.png" alt="">
          <span>JiYan Network</span>
        </div>

        <div class="表单标题行">
          <h2 class="表单标题">注册账号</h2>
        </div>

        <div class="表单项">
          <div class="输入框外层">
            <input class="输入框" type="text" id="注册_账号名称" placeholder="用户名（3-20 位字母或数字）" maxlength="20">
          </div>
        </div>

        <div class="表单项">
          <div class="输入框外层">
            <input class="输入框" type="text" id="注册_QQ号码" placeholder="邮箱（QQ / 163 / Gmail 等）" maxlength="64" inputmode="email" autocomplete="email">
          </div>
        </div>
        <div class="表单项">
          <div class="验证码行">
            <div class="输入框外层">
              <input class="输入框" type="text" id="注册_验证码" placeholder="请输入邮箱验证码" maxlength="6" inputmode="numeric">
            </div>
            <button class="验证码发送按钮" type="button" onclick="发送验证码()">发送</button>
          </div>
        </div>

        <button class="登录按钮" type="button" onclick="注册账号()">注 册</button>

        <div class="协议提示">
          注册即表示同意
          <a href="用户协议.html">《用户协议》</a>
          <a href="平台服务范围须知.html">《服务范围须知》</a>
          <a href="平台独立责任条款.html">《独立责任条款》</a>
          <a href="平台免责声明.html">《免责声明》</a>
        </div>

        <div class="表单右侧链接">
          <div class="链接操作组">
            <span class="文字链接" onclick="切换到登录()">已有账号？返回登录</span>
          </div>
        </div>
      </div>

      <div id="找回区块" style="display: none;">
        <div class="移动端品牌标识" aria-hidden="true">
          <img src="后台模块/image/jiyan-logo.png" alt="">
          <span>JiYan Network</span>
        </div>

        <div class="表单标题行">
          <h2 class="表单标题">找回密码</h2>
        </div>

        <p class="表单说明">填写注册时使用的邮箱，验证通过后会生成新密码并发送到该邮箱。</p>

        <div class="表单项">
          <div class="输入框外层">
            <input class="输入框" type="text" id="找回_邮箱" placeholder="请输入注册邮箱" maxlength="64" inputmode="email" autocomplete="email">
          </div>
        </div>

        <div class="表单项">
          <div class="验证码行">
            <div class="输入框外层">
              <input class="输入框" type="text" id="找回_验证码" placeholder="请输入邮箱验证码" maxlength="6" inputmode="numeric" autocomplete="one-time-code">
            </div>
            <button class="验证码发送按钮" type="button" onclick="找回发送验证码(this)">发送</button>
          </div>
        </div>

        <button class="登录按钮" type="button" onclick="提交找回密码()">重置密码</button>

        <div class="表单提示" id="找回_提示"></div>

        <div class="表单右侧链接">
          <div class="链接操作组">
            <span class="文字链接" onclick="切换到登录()">想起密码了？返回登录</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
</div>

<div id="图片验证码弹窗容器"></div>
<script src="后台模块/图形验证码.js"></script>

<script>
/* ================= 极验云 前端认证逻辑 ================= */
const JY_API = '/api/账号接口入口.php';

async function jyApi(action, payload) {
  const url = JY_API + '?action=' + encodeURIComponent(action);
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload || {})
  });
  let data = null;
  try { data = await resp.json(); } catch (e) { data = { success: false, message: '服务返回异常（HTTP ' + resp.status + '）' }; }
  return data || { success: false, message: '服务返回异常' };
}

/* 顶部小提示：替代原生 alert 弹窗，不打断操作 */
function 提示(message, ok) {
  if (!message) return;
  let wrap = document.getElementById('jyToastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'jyToastWrap';
    wrap.className = 'jy-toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = 'jy-toast ' + (ok ? 'jy-toast-ok' : 'jy-toast-err');
  const ic = document.createElement('span');
  ic.className = 'jy-toast-ic';
  ic.textContent = ok ? '✓' : '!';
  const msg = document.createElement('span');
  msg.className = 'jy-toast-msg';
  msg.textContent = String(message);
  el.appendChild(ic);
  el.appendChild(msg);
  wrap.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('show'); });
  setTimeout(function () {
    el.classList.remove('show');
    setTimeout(function () { el.remove(); }, 260);
  }, 3000);
}

/* ---------- 登录 ---------- */
async function 登录事件() {
  const uidEl = document.getElementById('登录_UID');
  const pwdEl = document.getElementById('登录_密码');
  const account = (uidEl.value || '').trim();
  const password = pwdEl.value || '';

  if (!account || !password) { 提示('请填写完整的登录信息', false); return; }
  if (account.indexOf('@') !== -1) { 提示('请使用 JiYan_ 账号登录，不支持邮箱登录', false); return; }

  const btn = document.querySelector('#登录区块 .登录按钮');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    const r = await jyApi('login', { account: account, password: password });
    if (!r.success) { 提示(r.message || '登录失败', false); return; }
    localStorage.setItem('Username', account);
    localStorage.removeItem('Password');
    提示('登录成功', true);
    setTimeout(function () { location.href = '/前台/用户后台.php'; }, 900);
  } catch (e) {
    提示('登录失败: ' + e.message, false);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

/* 邮箱白名单（与后端 config.email.allow_domains 同源） */
var ALLOW_DOMAINS = ['qq.com','foxmail.com','163.com','126.com','yeah.net','88.com','sina.com','sina.cn','sohu.com','139.com','189.cn','21cn.com','aliyun.com','huawei.com','bytedance.com','exmail.qq.com','vip.qq.com','gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com','office365.com','icloud.com','me.com','mac.com','yahoo.com','ymail.com','protonmail.com','proton.me','zoho.com','yandex.com','aol.com','gmx.com'];

/* ---------- 注册验证码 ---------- */
let 注册倒计时 = 0;
let 注册票据 = '';   // send_code 通过图形验证码后由服务端签发，注册时复用
async function 发送验证码() {
  const nameEl = document.getElementById('注册_账号名称');
  const qqEl = document.getElementById('注册_QQ号码');
  const name = (nameEl.value || '').trim();
  const qq = (qqEl.value || '').trim();

  if (!name) { 提示('请输入用户名', false); nameEl.focus(); return; }
  if (!/^[A-Za-z0-9]{3,20}$/.test(name)) { 提示('用户名只能是 3-20 位英文字母或数字', false); nameEl.focus(); return; }
  if (!qq) { 提示('请输入邮箱', false); qqEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(qq)) { 提示('邮箱格式不正确', false); qqEl.focus(); return; }
  if (ALLOW_DOMAINS.length && !ALLOW_DOMAINS.some(function (d) {
        var m = qq.toLowerCase().split('@')[1] || '';
        return m === d || m.slice(-(d.length + 1)) === '.' + d;
      })) {
    提示('请使用常见邮箱（QQ / 163 / 126 / Gmail / Outlook / iCloud 等），不支持临时邮箱', false);
    qqEl.focus(); return;
  }

  const btn = document.querySelector('#注册区块 .验证码发送按钮');

  // 先过图形验证码（一次性 token），通过后才真正请求 send_code
  const cap = await 弹出图形验证码();
  if (!cap) return;

  if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
  try {
    const r = await jyApi('send_code', {
      email: qq,
      purpose: 'register',
      captcha_token: cap.token,
      captcha_code: cap.code
    });
    提示(r.message || (r.success ? '验证码已发送' : '发送失败'), !!r.success);
    if (r.success) {
      // send_code 成功后服务端签发注册票据，注册时复用人机校验结果，不用再看一次图
      注册票据 = (r.data && r.data.captcha_ticket) || '';
    }
    if (r.success && btn) {
      注册倒计时 = 60;
      btn.textContent = 注册倒计时 + 's';
      const timer = setInterval(function () {
        注册倒计时--;
        if (注册倒计时 <= 0) {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = '发送';
        } else { btn.textContent = 注册倒计时 + 's'; }
      }, 1000);
      return;
    }
  } catch (e) {
    提示('发送验证码失败: ' + e.message, false);
  }
  if (btn) { btn.disabled = false; btn.textContent = '发送'; }
}

/* ---------- 注册 ---------- */
async function 注册账号() {
  const nameEl = document.getElementById('注册_账号名称');
  const qqEl = document.getElementById('注册_QQ号码');
  const codeEl = document.getElementById('注册_验证码');

  const name = (nameEl.value || '').trim();
  const qq = (qqEl.value || '').trim();
  const code = (codeEl.value || '').trim();

  if (!name) { 提示('请输入用户名', false); nameEl.focus(); return; }
  if (!/^[A-Za-z0-9]{3,20}$/.test(name)) { 提示('用户名只能是 3-20 位英文字母或数字', false); nameEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(qq)) { 提示('邮箱格式不正确', false); qqEl.focus(); return; }
  if (!/^[0-9]{6}$/.test(code)) { 提示('请输入 6 位数字验证码', false); codeEl.focus(); return; }

  const btn = document.querySelector('#注册区块 .登录按钮');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    let r = await jyApi('register', {
      username: name,
      email: qq,
      code: code,
      captcha_ticket: 注册票据 || ''
    });

    // 票据丢失 / 过期时（例如刷新过页面），当场补一次图形验证码再重试
    if (!r.success && /图形验证码/.test(r.message || '')) {
      const cap = await 弹出图形验证码();
      if (!cap) { 提示(r.message || '注册失败', false); return; }
      r = await jyApi('register', {
        username: name,
        email: qq,
        code: code,
        captcha_token: cap.token,
        captcha_code: cap.code
      });
    }

    if (!r.success) { 提示(r.message || '注册失败', false); return; }

    const d = r.data || {};
    localStorage.setItem('Username', d.username || '');
    localStorage.removeItem('Password');

    if (d.password) {
      alert('注册成功！账号：' + d.username + '　密码：' + d.password + '（邮件发送失败，请立即保存）', true);
    } else {
      提示('注册成功！账号 ' + d.username + ' 与密码已发送到您的 QQ 邮箱', true);
    }
    setTimeout(function () { location.href = '/前台/用户后台.php'; }, 500);
  } catch (e) {
    提示('注册失败: ' + e.message, false);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

/* ---------- 找回密码 ---------- */
let 找回倒计时 = 0;
let 找回票据 = '';

function 找回提示(msg, ok) {
  const el = document.getElementById('找回_提示');
  if (!el) return;
  el.textContent = msg || '';
  el.className = '表单提示' + (msg ? (ok ? ' 提示-成功' : ' 提示-错误') : '');
}

function 切换到找回密码() {
  document.getElementById('登录区块').style.display = 'none';
  document.getElementById('注册区块').style.display = 'none';
  document.getElementById('找回区块').style.display = 'block';
  找回提示('');
  const el = document.getElementById('找回_邮箱');
  if (el && !el.value) {
    const u = document.getElementById('登录_UID');
    if (u) { /* 登录名不是邮箱，不带过去 */ }
    el.focus();
  }
}

async function 找回发送验证码(btn) {
  const mailEl = document.getElementById('找回_邮箱');
  const q = (mailEl.value || '').trim().toLowerCase();
  if (!q) { 找回提示('请输入注册邮箱', false); mailEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q)) { 找回提示('邮箱格式不正确', false); mailEl.focus(); return; }
  const dom = q.split('@')[1] || '';
  if (ALLOW_DOMAINS.length && !ALLOW_DOMAINS.some(function (d) { return dom === d || dom.slice(-(d.length + 1)) === '.' + d; })) {
    找回提示('请使用常见邮箱（QQ / 163 / Gmail 等），不支持临时邮箱', false);
    mailEl.focus(); return;
  }
  if (找回倒计时 > 0) return;

  const cap = await 弹出图形验证码();
  if (!cap) return;

  if (btn) { btn.disabled = true; btn.textContent = '发送中...'; }
  try {
    const r = await jyApi('send_code', {
      email: q, purpose: 'reset',
      captcha_token: cap.token, captcha_code: cap.code
    });
    if (!r.success) {
      找回提示(r.message || '验证码发送失败', false);
      if (btn) { btn.disabled = false; btn.textContent = '发送'; }
      return;
    }
    找回票据 = (r.data && r.data.captcha_ticket) || '';
    找回提示('验证码已发送，请查收邮箱（含垃圾箱）', true);
    if (btn) {
      找回倒计时 = 60;
      btn.textContent = 找回倒计时 + 's';
      const timer = setInterval(function () {
        找回倒计时--;
        if (找回倒计时 <= 0) {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = '发送';
        } else { btn.textContent = 找回倒计时 + 's'; }
      }, 1000);
    }
  } catch (e) {
    找回提示('验证码发送失败：' + e.message, false);
    if (btn) { btn.disabled = false; btn.textContent = '发送'; }
  }
}

async function 提交找回密码() {
  const mailEl = document.getElementById('找回_邮箱');
  const codeEl = document.getElementById('找回_验证码');
  const q = (mailEl.value || '').trim().toLowerCase();
  const code = (codeEl.value || '').trim();

  if (!q) { 找回提示('请输入注册邮箱', false); mailEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q)) { 找回提示('邮箱格式不正确', false); mailEl.focus(); return; }
  const dom2 = q.split('@')[1] || '';
  if (ALLOW_DOMAINS.length && !ALLOW_DOMAINS.some(function (d) { return dom2 === d || dom2.slice(-(d.length + 1)) === '.' + d; })) {
    找回提示('请使用常见邮箱（QQ / 163 / Gmail 等）', false); mailEl.focus(); return;
  }
  if (!/^[0-9]{6}$/.test(code)) { 找回提示('请输入 6 位数字验证码', false); codeEl.focus(); return; }

  const btn = document.querySelector('#找回区块 .登录按钮');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  找回提示('');
  try {
    let r = await jyApi('reset_password', { email: q, code: code, captcha_ticket: 找回票据 || '' });
    if (!r.success && /图形验证码/.test(r.message || '')) {
      const cap = await 弹出图形验证码();
      if (!cap) { 找回提示(r.message || '重置失败', false); return; }
      r = await jyApi('reset_password', { email: q, code: code, captcha_token: cap.token, captcha_code: cap.code });
    }
    if (!r.success) { 找回提示(r.message || '重置失败', false); return; }

    const d = r.data || {};
    if (d.password) {
      找回提示('密码已重置，新密码：' + d.password + '（邮件发送失败，请立即保存）', true);
    } else {
      找回提示('密码已重置，新密码已发送到邮箱，请登录后及时修改', true);
    }
    if (codeEl) codeEl.value = '';
    setTimeout(function () { 切换到登录(); }, 1600);
  } catch (e) {
    找回提示('重置失败：' + e.message, false);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

/* ---------- 第三方扫码登录 ---------- */
async function 第三方登录(type, btn) {
  const label = type === 'wx' ? '微信' : 'QQ';
  if (btn) btn.disabled = true;
  try {
    const r = await jyApi('oauth_url', { type: type });
    if (!r.success || !r.data || !r.data.url) {
      提示(r.message || ('获取' + label + '登录地址失败'), false);
      return;
    }
    location.href = r.data.url;
  } catch (e) {
    提示(label + '登录失败: ' + e.message, false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function Telegram登录(btn) {
  if (btn) btn.disabled = true;
  try {
    const r = await jyApi('telegram_url', {});
    if (!r.success || !r.data || !r.data.url) {
      提示(r.message || '获取 Telegram 登录地址失败', false);
      return;
    }
    location.href = r.data.url;
  } catch (e) {
    提示('Telegram 登录失败: ' + e.message, false);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ---------- 回调失败提示 ---------- */
(function () {
  try {
    const q = new URLSearchParams(location.search).get('oauth_error');
    if (q) 提示('登录失败：' + q, false);
  } catch (e) {}
})();


/* ---------- 扫码兜底：扫描完把 code 交回来 ---------- */
function 切换扫码兜底() {
  const p = document.getElementById('扫码兜底_面板');
  if (p) p.style.display = (p.style.display === 'none' ? 'block' : 'none');
}

async function 兜底登录(silent) {
  const el = document.getElementById('兜底_code');
  let code = el ? (el.value || '').trim() : '';
  if (!code) {
    try { code = new URLSearchParams(location.search).get('code') || ''; } catch (e) {}
  }
  if (!code) {
    if (!silent) 提示('请把地址栏里 code= 后面那一串粘贴进来', false);
    else 切换扫码兜底();
    return;
  }

  const btn = document.querySelector('.扫码兜底 .登录按钮');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }
  try {
    const r = await jyApi('oauth_login', { type: 'qq', code: code });
    if (!r.success) {
      if (!silent) 提示(r.message || '登录失败', false);
      else { 提示(r.message || '自动登录失败，请手动粘贴 code', false); 切换扫码兜底(); }
      return;
    }

    const d = r.data || {};
    localStorage.setItem('Username', d.username || '');
    if (d.password) {
      alert('账号已创建\n账号：' + d.username + '\n密码：' + d.password + '\n（只显示这一次，请立即保存）', true);
    } else {
      提示('登录成功', true);
    }
    setTimeout(function () { location.href = '/前台/用户后台.php'; }, 500);
  } catch (e) {
    if (!silent) 提示('登录失败: ' + e.message, false);
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
  }
}

/* 地址栏带 code 就自动试一次 */
(function () {
  try {
    const q = new URLSearchParams(location.search);
    const c = q.get('code');
    if (c) { 兜底登录(true); }
  } catch (e) {}
})();

/* ---------- 密码可见 ---------- */
function 密码可见切换(el) {
  const input = document.getElementById('登录_密码');
  const isPwd = input.type === 'password';
  input.type = isPwd ? 'text' : 'password';
  el.textContent = isPwd ? '隐藏' : '显示';
}

/* ---------- 区块切换 ---------- */
function 切换到注册账号() {
  document.getElementById('登录区块').style.display = 'none';
  document.getElementById('找回区块').style.display = 'none';
  document.getElementById('注册区块').style.display = 'block';
}
function 切换到登录() {
  document.getElementById('注册区块').style.display = 'none';
  document.getElementById('找回区块').style.display = 'none';
  document.getElementById('登录区块').style.display = 'block';
}

/* ---------- 页面加载完成：隐藏加载动画 ---------- */
function 关闭加载动画() {
  const load = document.getElementById('Env_load');
  const main = document.getElementById('Env_main');
  if (load) load.style.display = 'none';
  if (main) main.style.display = 'flex';
}

/* 首屏先渲染，不等任何网络请求 */
document.addEventListener('DOMContentLoaded', 关闭加载动画);
window.addEventListener('load', function () {
  关闭加载动画();
  const u = localStorage.getItem('Username');
  if (u) {
    fetch(JY_API + '?action=me', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.success) { location.href = '/前台/用户后台.php'; }
      })
      .catch(function () {});
  }
  const 控制器点 = document.querySelectorAll('.PC左侧UI_底部控制器3');
  const 内容面板 = document.querySelectorAll('.PC左侧UI_中心控制器2');
  控制器点.forEach((点, 索引) => {
    点.addEventListener('click', () => {
      控制器点.forEach(d => d.classList.remove('选中'));
      点.classList.add('选中');
      内容面板.forEach(p => p.classList.remove('active'));
      if (内容面板[索引]) 内容面板[索引].classList.add('active');
    });
  });
});
</script>

<script src="后台模块/公告弹窗.js"></script>
</body>

<div class="版权行" style="position:fixed;bottom:16px;left:0;right:0;text-align:center;font-size:12px;background:#666;-webkit-background-clip:text;background-clip:text;color:transparent;pointer-events:none;z-index:9999999;">
    © 2026 极验云
</div>

</html>