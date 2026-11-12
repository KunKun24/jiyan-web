/* 极验云 · 全球业务态势
 * 由上传预览（全球业务流向图）适配：保留其视觉结构，数据全部来自平台真实业务接口。
 * 用法：JYFlowLive.mount(hostEl, {mode:'embed'|'full', title, subtitle, worldUrl})
 *       api.update(data)  data = { points:[{name,lon,lat,count}], server:{name,lon,lat}, total, unresolved, updatedAt }
 */
(function (global) {
  'use strict';

  var HUE_KEY = 'jy-flow-hue-v1';
  var DEFAULT_HUE = 210;
  var CSS_ID = 'jyFlowLiveCss';

  var CSS = [
    '.jy-flow-shell{position:relative;width:100%;height:100%;min-height:340px;overflow:hidden;isolation:isolate;color:#f4f8ff;background:transparent;font-family:Inter,SF Pro Display,PingFang SC,Microsoft YaHei,Arial,sans-serif}',
    '.jy-flow-shell[data-mode="full"]{background:radial-gradient(circle at 52% 42%,rgba(10,38,78,.25),transparent 42%),linear-gradient(180deg,#020611,#031022 62%,#020712)}',
    '.jy-flow-shell .jy-map-host{position:absolute;inset:0}',
    '.jy-flow-shell .jy-map-canvas{position:absolute;inset:0;width:100%;height:100%}',
    '.jy-flow-shell .jy-overlay{position:absolute;inset:0;z-index:3;pointer-events:none;display:none}',
    '.jy-flow-shell[data-mode="full"] .jy-overlay{display:block}',
    '.jy-flow-shell .jy-vignette{position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 130px 20px #00000085;display:none}',
    '.jy-flow-shell[data-mode="full"] .jy-vignette{display:block}',
    '.jy-flow-shell .jy-brand{position:absolute;top:clamp(22px,3.2vh,46px);left:clamp(22px,2.8vw,54px);display:flex;align-items:stretch;gap:16px;filter:drop-shadow(0 4px 18px rgba(0,0,0,.55))}',
    '.jy-flow-shell .jy-brand-mark{width:3px;min-height:72px;background:#19dff2;box-shadow:0 0 10px #19badc6b}',
    '.jy-flow-shell .jy-kicker{display:flex;align-items:center;gap:6px;margin-bottom:6px;color:#55bddb;font-size:10px;font-weight:700;letter-spacing:1.8px}',
    '.jy-flow-shell .jy-brand h1{margin:0;font-size:clamp(27px,2.1vw,42px);line-height:1.08;font-weight:700;text-shadow:0 0 24px rgba(117,181,255,.16)}',
    '.jy-flow-shell .jy-brand p{margin:7px 0 0;color:#8796ad;font-size:clamp(11px,.8vw,15px);letter-spacing:.4px}',
    '.jy-flow-shell .jy-metrics,.jy-flow-shell .jy-legend{border:1px solid rgba(67,142,187,.26);border-radius:7px;background:linear-gradient(145deg,#051427d1,#030e1d94);box-shadow:inset 0 0 24px #144c7009,0 14px 38px #0003;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}',
    '.jy-flow-shell .jy-metrics{position:absolute;top:clamp(28px,4.6vh,62px);right:clamp(20px,2.5vw,50px);width:clamp(206px,13vw,248px);overflow:hidden;padding:7px 17px}',
    '.jy-flow-shell .jy-metric{display:flex;align-items:center;gap:14px;min-height:73px}',
    '.jy-flow-shell .jy-metric+.jy-metric{border-top:1px solid rgba(93,151,203,.17)}',
    '.jy-flow-shell .jy-metric-icon{display:grid;flex:0 0 43px;width:43px;height:43px;place-items:center;border-radius:50%;color:#55c8e8;background:#1e7eab21}',
    '.jy-flow-shell .jy-metric-copy{display:flex;min-width:0;flex-direction:column;gap:3px}',
    '.jy-flow-shell .jy-metric-copy strong{font-size:clamp(22px,1.55vw,30px);line-height:1;font-variant-numeric:tabular-nums;font-weight:650}',
    '.jy-flow-shell .jy-metric-copy span{color:#8a9ab1;font-size:12px;white-space:nowrap}',
    '.jy-flow-shell .jy-legend{position:absolute;left:clamp(20px,2.5vw,48px);bottom:clamp(46px,7vh,82px);width:188px;padding:16px 17px 17px}',
    '.jy-flow-shell .jy-legend-title{display:flex;align-items:center;gap:8px;margin-bottom:15px;color:#d8e7fa;font-size:13px;font-weight:600}',
    '.jy-flow-shell .jy-radiation{display:grid;grid-template-columns:38px 1fr;align-items:center;gap:9px;color:#9eacc0;font-size:11px}',
    '.jy-flow-shell .jy-radiation+.jy-radiation{margin-top:12px}',
    '.jy-flow-shell .jy-source-key,.jy-flow-shell .jy-flow-key{position:relative;height:8px}',
    '.jy-flow-shell .jy-source-key span{position:absolute;top:0;left:2px;width:8px;height:8px;border:1px solid rgba(102,220,255,.8);border-radius:50%;background:#c8f5ff;box-shadow:0 0 7px #4bc5e98c}',
    '.jy-flow-shell .jy-flow-key:before{content:"";position:absolute;top:3px;left:0;width:29px;height:1px;background:#42c8f5;box-shadow:0 0 4px #42c8f573}',
    '.jy-flow-shell .jy-flow-key:after{content:"";position:absolute;top:0;right:1px;border-top:4px solid transparent;border-bottom:4px solid transparent;border-left:6px solid #7fe2f9}',
    '.jy-flow-shell .jy-status{position:absolute;right:clamp(20px,2.4vw,48px);bottom:23px;display:flex;align-items:center;gap:8px;color:#64748b;font-size:10px;font-variant-numeric:tabular-nums}',
    '.jy-flow-shell .jy-status-dot{width:5px;height:5px;border-radius:50%;background:#55c8e8;box-shadow:0 0 6px #55c8e899;animation:jyFlowPulse 2s ease-in-out infinite}',
    '.jy-flow-shell .jy-status-sep{width:24px;height:1px;margin:0 3px;background:#6e8eb159}',
    '@keyframes jyFlowPulse{50%{opacity:.35}}',
    '.jy-flow-shell .jy-appearance{position:absolute;right:clamp(20px,2.4vw,48px);bottom:49px;z-index:5;display:none;flex-direction:column;align-items:flex-end;gap:9px;pointer-events:auto}',
    '.jy-flow-shell[data-mode="full"] .jy-appearance{display:flex}',
    '.jy-flow-shell .jy-appearance-trigger{display:grid;width:34px;height:34px;padding:0;place-items:center;border:1px solid rgba(85,151,190,.28);border-radius:6px;color:#8fa8bd;background:#041121c2;box-shadow:0 8px 24px #00000040;cursor:pointer}',
    '.jy-flow-shell .jy-appearance-trigger:hover{color:#bdeeff;border-color:#5bbede7a;background:#071c32e0}',
    '.jy-flow-shell .jy-appearance-panel{width:250px;padding:14px 15px 12px;border:1px solid rgba(72,137,174,.28);border-radius:7px;background:linear-gradient(145deg,#051426f0,#030d1be0);box-shadow:0 18px 44px #00000061}',
    '.jy-flow-shell .jy-appearance-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}',
    '.jy-flow-shell .jy-appearance-head strong{display:block;color:#e0eaf5;font-size:13px}',
    '.jy-flow-shell .jy-appearance-head span{color:#66798e;font-size:9px;text-transform:uppercase}',
    '.jy-flow-shell .jy-hue-value{color:#8fa7bd;font-size:11px}',
    '.jy-flow-shell .jy-hue-control{display:flex;flex-direction:column;gap:4px;margin-top:14px;color:#91a3b7;font-size:11px}',
    '.jy-flow-shell .jy-hue{width:100%;height:30px;margin:0;appearance:none;-webkit-appearance:none;border:0;background:transparent;cursor:pointer;touch-action:none}',
    '.jy-flow-shell .jy-hue::-webkit-slider-runnable-track{height:7px;border:1px solid rgba(255,255,255,.14);border-radius:4px;background:linear-gradient(90deg,#e92020,#e9e920,#1fc11f,#19cccc,#3e3eea,#e425e4,#e92020)}',
    '.jy-flow-shell .jy-hue::-moz-range-track{height:7px;border:1px solid rgba(255,255,255,.14);border-radius:4px;background:linear-gradient(90deg,#e92020,#e9e920,#1fc11f,#19cccc,#3e3eea,#e425e4,#e92020)}',
    '.jy-flow-shell .jy-hue::-webkit-slider-thumb{width:15px;height:15px;margin-top:-5px;appearance:none;-webkit-appearance:none;border:2px solid #e7f5fb;border-radius:50%;background:#122538;box-shadow:0 0 0 2px #0000006b}',
    '.jy-flow-shell .jy-hue::-moz-range-thumb{width:12px;height:12px;border:2px solid #e7f5fb;border-radius:50%;background:#122538;}',
    '.jy-flow-shell .jy-appearance-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px}',
    '.jy-flow-shell .jy-current-color{display:flex;align-items:center;gap:7px;color:#7f91a5;font-size:10px}',
    '.jy-flow-shell .jy-swatch{width:9px;height:9px;border:1px solid rgba(255,255,255,.5);border-radius:50%;box-shadow:0 0 7px currentColor}',
    '.jy-flow-shell .jy-reset{min-height:26px;padding:3px 8px;border:0;border-radius:4px;color:#8ea2b7;background:transparent;font:inherit;font-size:10px;cursor:pointer}',
    '.jy-flow-shell .jy-reset:hover:not(:disabled){color:#c4d9e9}',
    '.jy-flow-shell .jy-reset:disabled{color:#435365;cursor:default}',
    '.jy-flow-shell .jy-tip{position:absolute;left:12px;bottom:10px;z-index:4;max-width:60%;padding:3px 9px;border-radius:6px;color:#8ea6bd;background:#03101fcc;font-size:11px;pointer-events:none}',
    '.jy-flow-shell[data-mode="full"] .jy-tip{left:auto;right:12px;bottom:52px}',
    '.jy-flow-shell.jy-fs{position:fixed!important;inset:0!important;z-index:99999!important;width:100vw!important;height:100vh!important;height:100dvh!important;min-height:0!important;border-radius:0!important;margin:0!important}',
    '@media(max-width:760px){.jy-flow-shell{min-height:300px}.jy-flow-shell .jy-brand{top:16px;left:14px;gap:10px}.jy-flow-shell .jy-brand-mark{min-height:56px}.jy-flow-shell .jy-brand h1{font-size:21px}.jy-flow-shell .jy-brand p{font-size:9.5px}.jy-flow-shell .jy-kicker{font-size:8px;margin-bottom:3px}.jy-flow-shell .jy-metrics{top:88px;left:12px;right:12px;width:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:5px 7px}.jy-flow-shell .jy-metric{min-height:54px;gap:6px;justify-content:center}.jy-flow-shell .jy-metric+.jy-metric{border-top:0;border-left:1px solid rgba(93,151,203,.17)}.jy-flow-shell .jy-metric-icon{flex-basis:26px;width:26px;height:26px}.jy-flow-shell .jy-metric-icon svg{width:13px}.jy-flow-shell .jy-metric-copy strong{font-size:15px}.jy-flow-shell .jy-metric-copy span{max-width:74px;overflow:hidden;text-overflow:ellipsis;font-size:8px}.jy-flow-shell .jy-legend{left:10px;bottom:44px;width:148px;padding:9px 10px}.jy-flow-shell .jy-legend-title{margin-bottom:8px;font-size:10.5px}.jy-flow-shell .jy-radiation{grid-template-columns:30px 1fr;gap:5px;font-size:9px}.jy-flow-shell .jy-radiation+.jy-radiation{margin-top:7px}.jy-flow-shell .jy-status{right:10px;bottom:14px;font-size:8px}.jy-flow-shell .jy-status>*:not(.jy-updated){display:none}.jy-flow-shell .jy-appearance{right:10px;bottom:40px}.jy-flow-shell .jy-appearance-panel{width:min(240px,calc(100vw - 24px))}}',
    '@media(prefers-reduced-motion:reduce){.jy-flow-shell .jy-status-dot{animation:none}}'
  ].join('\n');

  var ICON = {
    send: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 21.7a.5.5 0 0 0 .94-.03l6.5-19a.5.5 0 0 0-.63-.63l-19 6.5a.5.5 0 0 0-.03.94l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/></svg>',
    globe: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>',
    radio: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>',
    activity: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.5a2 2 0 0 0-1.9 1.5l-2.35 8.35a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>',
    reset: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
  };

  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function hueGet() {
    try {
      var v = localStorage.getItem(HUE_KEY);
      if (v === null) return DEFAULT_HUE;
      var n = Number(v);
      return isFinite(n) ? Math.min(360, Math.max(0, n)) : DEFAULT_HUE;
    } catch (e) { return DEFAULT_HUE; }
  }
  function hueSet(v) {
    try { localStorage.setItem(HUE_KEY, String(Math.round(v))); } catch (e) {}
  }

  /* 三套调色：嵌入(浅色玻璃) / 嵌入(深色玻璃) / 全屏(深色舞台)，色相共用 */
  function themeIsDark() {
    return document.documentElement.getAttribute('data-jy-theme') === 'dark';
  }

  function pal(h, mode) {
    if (mode === 'glassLight') {
      return {
        area: 'rgba(255,255,255,.42)',
        areaHover: 'hsla(' + h + ' 80% 55% / .22)',
        border: 'rgba(122,152,182,.55)',
        point: 'hsl(' + h + ' 82% 45%)',
        pointShadow: 'hsla(' + h + ' 82% 45% / .35)',
        line: 'hsl(' + h + ' 74% 46%)',
        lineSoft: 'hsl(' + h + ' 66% 56%)',
        fx: 'hsl(' + h + ' 88% 38%)',
        server: 'hsl(' + h + ' 70% 26%)',
        tipBg: 'rgba(255,255,255,.97)',
        tipBorder: 'hsla(' + h + ' 40% 55% / .35)',
        tipText: '#1e293b',
        label: '#475569',
        labelStrong: '#0f172a',
        labelBg: 'rgba(255,255,255,.78)'
      };
    }
    if (mode === 'glassDark') {
      return {
        area: 'rgba(255,255,255,.07)',
        areaHover: 'hsla(' + h + ' 88% 60% / .3)',
        border: 'rgba(148,196,232,.4)',
        point: 'hsl(' + h + ' 88% 64%)',
        pointShadow: 'hsla(' + h + ' 88% 64% / .55)',
        line: 'hsl(' + h + ' 84% 62%)',
        lineSoft: 'hsl(' + h + ' 74% 54%)',
        fx: 'hsl(' + h + ' 92% 84%)',
        server: 'hsl(' + h + ' 92% 74%)',
        tipBg: 'rgba(4,16,32,.94)',
        tipBorder: 'hsla(' + h + ' 70% 55% / .38)',
        tipText: '#e8f3ff',
        label: '#c2d6e8',
        labelStrong: '#ffffff',
        labelBg: 'rgba(4,16,32,.55)'
      };
    }
    return {
      area: 'hsl(' + h + ' 64% 8.5%)',
      areaHover: 'hsl(' + h + ' 82% 27%)',
      border: 'hsl(' + h + ' 80% 40%)',
      point: 'hsl(' + h + ' 88% 62%)',
      pointShadow: 'hsla(' + h + ' 90% 62% / .55)',
      line: 'hsl(' + h + ' 80% 55%)',
      lineSoft: 'hsl(' + h + ' 70% 44%)',
      fx: 'hsl(' + h + ' 90% 80%)',
      server: 'hsl(' + h + ' 92% 72%)',
      tipBg: 'rgba(4,16,32,.94)',
      tipBorder: 'hsla(' + h + ' 70% 55% / .38)',
      tipText: '#e8f3ff',
      label: '#a9bed3',
      labelStrong: '#eaf6ff',
      labelBg: 'rgba(10,14,22,.55)'
    };
  }

  var worldPromise = null;
  function loadWorld(url) {
    if (global.__jyFlowWorld) return Promise.resolve(global.__jyFlowWorld);
    if (worldPromise) return worldPromise;
    worldPromise = fetch(url || '/前台/world.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { global.__jyFlowWorld = j; return j; })
      .catch(function (e) { worldPromise = null; throw e; });
    return worldPromise;
  }

  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }

  function mount(host, opts) {
    if (!host) return null;
    opts = opts || {};
    ensureCss();

    var title = opts.title || '极验全球业务态势';
    var subtitle = opts.subtitle || 'JIYAN GLOBAL BUSINESS FLOW';
    var mode = opts.mode === 'full' ? 'full' : 'embed';

    host.innerHTML = '';
    var shell = document.createElement('div');
    shell.className = 'jy-flow-shell';
    shell.setAttribute('data-mode', mode);
    shell.innerHTML =
      '<div class="jy-map-host"><div class="jy-map-canvas"></div></div>' +
      '<div class="jy-vignette"></div>' +
      '<div class="jy-overlay">' +
        '<header class="jy-brand"><div class="jy-brand-mark"></div><div>' +
          '<div class="jy-kicker">' + ICON.radio + ' JIYAN NETWORK · LIVE</div>' +
          '<h1>' + title + '</h1><p>' + subtitle + '</p>' +
        '</div></header>' +
        '<aside class="jy-metrics">' +
          '<div class="jy-metric"><span class="jy-metric-icon">' + ICON.send + '</span><span class="jy-metric-copy"><strong data-k="total">0</strong><span>业务请求</span></span></div>' +
          '<div class="jy-metric"><span class="jy-metric-icon">' + ICON.globe + '</span><span class="jy-metric-copy"><strong data-k="regions">0</strong><span>覆盖国家 / 地区</span></span></div>' +
          '<div class="jy-metric"><span class="jy-metric-icon">' + ICON.layers + '</span><span class="jy-metric-copy"><strong data-k="unresolved">0</strong><span>未定位请求</span></span></div>' +
        '</aside>' +
        '<aside class="jy-legend"><div class="jy-legend-title">' + ICON.activity + '<span>全球业务辐射</span></div>' +
          '<div class="jy-radiation"><span class="jy-source-key"><span></span></span><span>业务服务节点</span></div>' +
          '<div class="jy-radiation"><span class="jy-flow-key"></span><span>单向全球业务流</span></div>' +
        '</aside>' +
        '<footer class="jy-status"><span class="jy-status-dot"></span><span>JIYAN NETWORK ONLINE</span>' +
          '<span class="jy-status-sep"></span><span class="jy-updated">等待业务数据</span></footer>' +
      '</div>' +
      '<div class="jy-tip">正在加载业务数据…</div>' +
      '<div class="jy-appearance"><section class="jy-appearance-panel" hidden>' +
        '<div class="jy-appearance-head"><div><strong>地图外观</strong><span>Map Appearance</span></div><output class="jy-hue-value">' + Math.round(hueGet()) + '°</output></div>' +
        '<label class="jy-hue-control"><span>地图颜色</span><input class="jy-hue" type="range" min="0" max="360" step="1" value="' + Math.round(hueGet()) + '"></label>' +
        '<div class="jy-appearance-actions"><span class="jy-current-color"><span class="jy-swatch"></span>当前颜色</span>' +
        '<button class="jy-reset" type="button">' + ICON.reset + ' 恢复默认</button></div>' +
      '</section><button class="jy-appearance-trigger" type="button" title="地图外观" aria-label="地图外观">' + ICON.gear + '</button></div>';

    host.appendChild(shell);

    var canvasEl = shell.querySelector('.jy-map-canvas');
    var tipEl = shell.querySelector('.jy-tip');
    var chart = null;
    var data = null;
    var visibleTimer = null;
    var hue = hueGet();

    function palMode() {
      /* 全屏/独立窗口固定深色舞台；嵌入模式跟随站点主题，只画地图不画浮层 */
      if (shell.classList.contains('jy-fs')) return 'stage';
      return themeIsDark() ? 'glassDark' : 'glassLight';
    }
    function currentPal() { return pal(hue, palMode()); }

    function setTip(txt) { if (tipEl) tipEl.textContent = txt; }

    function paint() {
      if (!data) return;
      var counts = shell.querySelectorAll('.jy-metric-copy strong');
      var vals = { total: data.total || 0, regions: (data.points || []).length, unresolved: data.unresolved || 0 };
      for (var i = 0; i < counts.length; i++) {
        var k = counts[i].getAttribute('data-k');
        counts[i].textContent = Number(vals[k] || 0).toLocaleString('en-US');
      }
      var up = shell.querySelector('.jy-updated');
      if (up) up.textContent = data.updatedAt ? ('数据更新时间：' + data.updatedAt) : ('数据更新时间：' + new Date().toLocaleString('zh-CN', { hour12: false }));
    }

    function build(p, isFs) {
      var points = (data.points || []).slice(0, 60);
      var srv = data.server || {};
      var hasServer = isFinite(Number(srv.lon)) && isFinite(Number(srv.lat));
      var maxCount = 1;
      for (var i = 0; i < points.length; i++) maxCount = Math.max(maxCount, num(points[i].count));

      var nodeData = points.map(function (pt) {
        var ratio = maxCount > 0 ? num(pt.count) / maxCount : 0;
        return {
          name: pt.name, value: [num(pt.lon), num(pt.lat), num(pt.count)], count: num(pt.count),
          symbolSize: 5 + 12 * Math.sqrt(Math.max(ratio, 0.02)),
          itemStyle: { color: p.point, shadowBlur: 8, shadowColor: p.pointShadow },
          label: { show: true, position: 'right', fontSize: isFs ? 10 : 9, color: p.label, backgroundColor: p.labelBg, padding: [2, 4], borderRadius: 3, formatter: function (o) { return o.name; } }
        };
      });

      var srvData = hasServer ? [{
        name: srv.name || '业务服务器', value: [num(srv.lon), num(srv.lat), 0], isServer: true,
        symbolSize: 12, itemStyle: { color: p.server, shadowBlur: 14, shadowColor: p.pointShadow },
        label: { show: true, position: 'bottom', fontSize: 11, fontWeight: 'bold', color: p.labelStrong, backgroundColor: p.labelBg, padding: [2, 5], borderRadius: 3, formatter: function (o) { return o.name; } }
      }] : [];

      var lineSrc = hasServer ? points.slice().sort(function (a, b) { return num(b.count) - num(a.count); }).slice(0, 26) : [];
      function tier(on) {
        return lineSrc.filter(function (pt) { return on(num(pt.count) / maxCount); }).map(function (pt) {
          return { coords: [[num(srv.lon), num(srv.lat)], [num(pt.lon), num(pt.lat)]], fromName: srv.name || '业务服务器', toName: pt.name, value: num(pt.count) };
        });
      }

      var series = [
        { name: 'flow-hi', type: 'lines', coordinateSystem: 'geo', zlevel: 2, silent: true,
          effect: { show: true, period: 3.2, trailLength: 0.5, symbol: 'circle', symbolSize: 4, color: p.fx, loop: true },
          lineStyle: { color: p.line, width: 1.5, opacity: 0.7, curveness: 0.28 }, data: tier(function (w) { return w >= 0.5; }) },
        { name: 'flow-lo', type: 'lines', coordinateSystem: 'geo', zlevel: 2, silent: true,
          effect: { show: true, period: 3.8, trailLength: 0.42, symbol: 'circle', symbolSize: 3, color: p.fx, loop: true },
          lineStyle: { color: p.lineSoft, width: 1, opacity: 0.42, curveness: 0.28 }, data: tier(function (w) { return w < 0.5; }) },
        { name: 'nodes', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 3,
          rippleEffect: { brushType: 'stroke', scale: 3, period: 3.6 }, symbolSize: 8, data: nodeData },
        { name: 'server', type: 'effectScatter', coordinateSystem: 'geo', zlevel: 4,
          rippleEffect: { brushType: 'stroke', scale: 3.4, period: 3.2 }, symbolSize: 12, data: srvData }
      ];

      return {
        animation: false,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item', confine: true,
          backgroundColor: p.tipBg, borderColor: p.tipBorder, borderWidth: 1, padding: [8, 11],
          textStyle: { color: p.tipText, fontSize: 12 },
          formatter: function (o) {
            var d = o.data || {};
            if (o.seriesType === 'lines') return '<b>' + (d.fromName || '') + ' → ' + (d.toName || '') + '</b><br/>请求 ' + (d.value || 0) + ' 次';
            if (d.isServer) return '<b>' + (d.name || '') + '</b><br/>业务服务节点';
            return '<b>' + (o.name || '') + '</b><br/>请求 ' + (d.count || 0) + ' 次';
          }
        },
        geo: {
          map: 'jyflow_world', roam: true,
          /* 不用 layoutCenter/layoutSize：百分比是按容器短边算的，宽容器里会把世界图缩成一小块，
             看起来就像点位/航线整体错位。交给 ECharts 默认 contain 适配即可。 */
          zoom: isFs ? 1.02 : 1.12, center: [-6, 10],
          scaleLimit: { min: 0.8, max: 8 },
          itemStyle: { areaColor: p.area, borderColor: p.border, borderWidth: 0.7 },
          emphasis: { itemStyle: { areaColor: p.areaHover }, label: { show: false } },
          select: { disabled: true }, label: { show: false }
        },
        series: series
      };
    }

    function draw(isFs) {
      if (!data) return;
      if (canvasEl.offsetWidth < 20 || canvasEl.offsetHeight < 20) { waitVisible(function () { draw(isFs); }); return; }
      if (!chart) {
        if (!global.echarts) { setTip('图表组件未加载'); return; }
        chart = global.echarts.init(canvasEl, null, { renderer: 'canvas' });
      }
      chart.setOption(build(currentPal(), isFs), true);
      paint();
    }

    function resize() { if (chart && canvasEl.offsetWidth > 0 && canvasEl.offsetHeight > 0) chart.resize(); }

    /* 面板未展开时容器是 0x0，此时 setOption/effect 会反复抛
       drawImage(width or height of 0)。所以只在真正有尺寸时才初始化/绘制，
       否则持续轮询等待，绝不在 0 尺寸下出图。 */
    function waitVisible(then) {
      var tries = 0;
      clearTimeout(visibleTimer);
      visibleTimer = setTimeout(function tick() {
        if (canvasEl.offsetWidth > 20 && canvasEl.offsetHeight > 20) { then(); return; }
        if (++tries > 300) return;   /* 约 36 秒后放弃，避免无限轮询 */
        visibleTimer = setTimeout(tick, 120);
      }, 30);
    }

    function update(d) {
      data = {
        points: (d && d.points) || [],
        server: (d && d.server) || {},
        total: num(d && d.total),
        unresolved: num(d && d.unresolved),
        updatedAt: (d && d.updatedAt) || ''
      };
      setTip(data.points.length ? ('窗口内 ' + data.points.length + ' 个活跃地区') : '暂无业务数据');
      if (!global.echarts) { setTip('图表组件未加载'); return; }
      loadWorld(opts.worldUrl || '/前台/world.json').then(function (geo) {
        try { global.echarts.registerMap('jyflow_world', geo); } catch (e) {}
        waitVisible(function () { draw(shell.classList.contains('jy-fs')); });
      }).catch(function () {
        setTip('地图数据加载失败');
        paint();
      });
    }

    function setMode(m) {
      mode = (m === 'full') ? 'full' : 'embed';
      shell.setAttribute('data-mode', mode);
      /* 模式切换后必须重绘：嵌入用玻璃浅/深色，全屏用深色舞台 */
      if (chart && data) {
        try { chart.setOption(build(currentPal(), isFullscreen()), true); } catch (e) {}
      }
      setTimeout(resize, 80);
    }

    function enterFullscreen() {
      if (!host.classList.contains('flow') ) { /* noop */ }
      shell.classList.add('jy-fs');
      setMode('full');
      document.body.classList.add('jy-flow-lock');
      setTimeout(resize, 60); setTimeout(resize, 260);
    }
    function exitFullscreen() {
      shell.classList.remove('jy-fs');
      setMode('embed');
      document.body.classList.remove('jy-flow-lock');
      setTimeout(resize, 60);
    }
    function isFullscreen() { return shell.classList.contains('jy-fs'); }

    /* 地图外观：色相调节 + 记忆 */
    var trigger = shell.querySelector('.jy-appearance-trigger');
    var panel = shell.querySelector('.jy-appearance-panel');
    var slider = shell.querySelector('.jy-hue');
    var hueOut = shell.querySelector('.jy-hue-value');
    var resetBtn = shell.querySelector('.jy-reset');
    var swatch = shell.querySelector('.jy-swatch');

    function syncHueUi() {
      if (slider) slider.value = String(Math.round(hue));
      if (hueOut) hueOut.textContent = Math.round(hue) + '°';
      if (swatch) { swatch.style.color = 'hsl(' + hue + ' 88% 58%)'; swatch.style.backgroundColor = 'hsl(' + hue + ' 88% 58%)'; }
      if (resetBtn) resetBtn.disabled = Math.abs(hue - DEFAULT_HUE) < 0.5;
    }
    if (trigger && panel) trigger.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    if (slider) slider.addEventListener('input', function () {
      hue = Math.min(360, Math.max(0, Number(slider.value) || 0));
      syncHueUi();
      if (chart) chart.setOption(build(currentPal(), isFullscreen()), true);
    });
    if (slider) slider.addEventListener('change', function () { hueSet(hue); });
    if (resetBtn) resetBtn.addEventListener('click', function () { hue = DEFAULT_HUE; hueSet(hue); syncHueUi(); if (chart) chart.setOption(build(currentPal(), isFullscreen()), true); });
    syncHueUi();

    if (global.ResizeObserver) { try { new ResizeObserver(function () { resize(); }).observe(shell); } catch (e) {} }
    window.addEventListener('resize', resize);

    setMode(mode);

    return {
      shell: shell,
      update: update,
      setMode: setMode,
      enterFullscreen: enterFullscreen,
      exitFullscreen: exitFullscreen,
      isFullscreen: isFullscreen,
      resize: resize,
      destroy: function () {
        clearTimeout(visibleTimer);
        window.removeEventListener('resize', resize);
        if (chart) { try { chart.dispose(); } catch (e) {} chart = null; }
        host.innerHTML = '';
      }
    };
  }

  global.JYFlowLive = { mount: mount };
})(window);
