(function () {
  'use strict';
  var key = 'jiyan.theme';
  function saved() {
    try { return localStorage.getItem(key) === 'dark'; } catch (e) { return false; }
  }
  function apply(dark) {
    document.documentElement.setAttribute('data-jy-theme', dark ? 'dark' : 'light');
    document.querySelectorAll('[data-jy-theme-toggle]').forEach(function (input) {
      input.checked = dark;
    });
    /* 通知图表模块重绘（图表颜色不能靠 CSS 改） */
    try {
      document.dispatchEvent(new CustomEvent('jy-theme-change', { detail: { dark: !!dark } }));
    } catch (e) {}
  }
  apply(saved());
  document.addEventListener('DOMContentLoaded', function () {
    apply(saved());
    document.querySelectorAll('[data-jy-theme-toggle]').forEach(function (input) {
      input.addEventListener('change', function () {
        var dark = input.checked;
        apply(dark);
        try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch (e) {}
      });
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) apply(saved());
  });
}());
