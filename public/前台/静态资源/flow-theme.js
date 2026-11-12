/* 流向图共享调色板（用户端 / 管理端同引）
 * 只负责颜色与线宽计算，不碰任何原始 CSS。
 * 深色判定读 <html data-jy-theme>，与 theme.js 同一套标记。
 */
(function (w) {
  'use strict';
  function isDark() {
    return document.documentElement.getAttribute('data-jy-theme') === 'dark';
  }
  function on(fn) {
    document.addEventListener('jy-theme-change', function (e) {
      fn(!!(e && e.detail && e.detail.dark));
    });
  }
  var LIGHT = {
    dark: false,
    areaColor: '#eaf0f8',
    areaHover: '#d8e8fb',
    borderColor: 'rgba(120,140,165,.55)',
    borderWidth: 0.6,
    label: '#475569',
    labelStrong: '#0f172a',
    point: '#1e90ff',
    pointShadow: 'rgba(30,144,255,.4)',
    serverColor: '#0f172a',
    serverShadow: 'rgba(15,23,42,.45)',
    tipBg: 'rgba(255,255,255,.97)',
    tipBorder: 'rgba(148,163,184,.35)',
    tipText: '#1e293b',
    globeArea: '#0e2038',
    globeAreaHover: '#17304f',
    globeBorder: 'rgba(61,139,255,.55)',
    globeAtmos: '#1b6bff',
    globeGlow: 2.4,
    globeAmbient: 0.55,
    globeMain: 0.65
  };
  var DARK = {
    dark: true,
    areaColor: '#131b28',
    areaHover: '#1b2a42',
    borderColor: 'rgba(90,160,255,.28)',
    borderWidth: 0.7,
    label: '#b9bcc4',
    labelStrong: '#e9eaee',
    point: '#4da3ff',
    pointShadow: 'rgba(77,163,255,.5)',
    serverColor: '#ffd24d',
    serverShadow: 'rgba(255,210,77,.45)',
    tipBg: 'rgba(20,22,27,.92)',
    tipBorder: 'rgba(255,255,255,.13)',
    tipText: '#e9eaee',
    globeArea: '#070f1c',
    globeAreaHover: '#0f1d31',
    globeBorder: 'rgba(90,160,255,.7)',
    globeAtmos: '#2f7dff',
    globeGlow: 1.8,
    globeAmbient: 0.42,
    globeMain: 0.55
  };
  function palette() { return isDark() ? DARK : LIGHT; }
  /* 线宽按权重（0~1） */
  function lineWidth(weight, base) {
    var w = Number(weight);
    if (!isFinite(w) || w < 0) w = 0;
    if (w > 1) w = 1;
    base = Number(base) || 1;
    return +(base * (0.6 + 1.2 * Math.sqrt(w))).toFixed(2);
  }
  /* 流向线三档配色：高金 / 中蓝 / 低青 */
  function lineColor(weight) {
    var w = Number(weight);
    if (!isFinite(w)) w = 0;
    if (w >= 0.6) return '#f59e0b';
    if (w >= 0.25) return '#3b82f6';
    return '#22d3ee';
  }
  function lineOpacity(weight) {
    var w = Number(weight);
    if (!isFinite(w)) w = 0;
    if (w >= 0.6) return 0.72;
    if (w >= 0.25) return 0.55;
    return 0.38;
  }
  /* 弧线弯曲度按经纬度直线距离动态 */
  function curveness(lon1, lat1, lon2, lat2) {
    var dx = Number(lon2) - Number(lon1);
    var dy = Number(lat2) - Number(lat1);
    var d = Math.sqrt(dx * dx + dy * dy);
    if (!isFinite(d)) return 0.25;
    if (d < 30) return 0.15;
    if (d < 90) return 0.25;
    return 0.35;
  }
  w.JYFlowTheme = {
    isDark: isDark,
    on: on,
    palette: palette,
    light: LIGHT,
    dark: DARK,
    lineWidth: lineWidth,
    lineColor: lineColor,
    lineOpacity: lineOpacity,
    curveness: curveness
  };
}(window));
