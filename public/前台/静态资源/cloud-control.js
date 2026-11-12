(function () {
  'use strict';

  function start() {
    var root = document.getElementById('cloud-root');
    var modalRoot = document.getElementById('cloud-modal-root');
    var toastRoot = document.getElementById('cloud-toast');
    if (!root || !modalRoot || !toastRoot) return;
    var config = window.JY_CLOUD || {};
    var app = config.app || {};
    var model = null;
    var usersData = null;
    var usersError = '';
    var view = 'global';
    var search = '';
    var page = 1;
    var stateSequence = 0;
    var usersSequence = 0;
    var stateLoading = false;
    var stateWaiters = [];
    var writesPending = 0;
    var usersLoading = false;
    var activeModal = null;
    var toastTimer;
    var drafts = new Map();
    var lastUpdated = 0;
    var alive = true;

    function node(tag, className, text) {
      var result = document.createElement(tag);
      if (className) result.className = className;
      if (text !== undefined && text !== null) result.textContent = String(text);
      return result;
    }
    function append(parent) {
      Array.prototype.slice.call(arguments, 1).forEach(function (child) {
        if (child) parent.appendChild(child);
      });
      return parent;
    }
    function icon(name) {
      var result = node('i', 'fas fa-' + name);
      result.setAttribute('aria-hidden', 'true');
      return result;
    }
    function button(text, name, className, handler) {
      var result = node('button', 'cc-button' + (className ? ' ' + className : ''));
      result.type = 'button';
      if (name) result.appendChild(icon(name));
      if (text) result.appendChild(node('span', '', text));
      result.addEventListener('click', handler || function () {});
      return result;
    }
    function iconButton(label, name, handler, danger) {
      var result = button('', name, 'cc-icon-button' + (danger ? ' cc-danger' : ''), handler);
      result.title = label;
      result.setAttribute('aria-label', label);
      return result;
    }
    function field(type, value) {
      var result = node('input', 'cc-field');
      result.type = type;
      if (value !== undefined && value !== null) result.value = String(value);
      return result;
    }
    function select(options, selected) {
      var result = node('select', 'cc-field');
      options.forEach(function (item) {
        var option = node('option', '', item[1]);
        option.value = String(item[0]);
        result.appendChild(option);
      });
      result.value = String(selected);
      return result;
    }
    function time(value) {
      var n = Number(value);
      if (!Number.isFinite(n)) {
        var databaseDate = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
        return databaseDate && !value.startsWith('0000-') ? value : '—';
      }
      if (n <= 0) return '—';
      var date = new Date(n * 1000);
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false });
    }
    function count(value) {
      var n = Number(value);
      return Number.isFinite(n) && n >= 0 ? String(Math.floor(n)) : '—';
    }
    function bool(value) { return value === true || value === 1 || value === '1'; }
    function toast(message, error) {
      clearTimeout(toastTimer);
      toastRoot.textContent = message;
      toastRoot.dataset.kind = error ? 'error' : 'success';
      toastRoot.classList.add('cc-show');
      toastTimer = setTimeout(function () { toastRoot.classList.remove('cc-show'); }, error ? 6500 : 4200);
    }
    function notice(message, warning) {
      return append(node('div', 'cc-notice' + (warning ? ' cc-warning' : '')), icon(warning ? 'exclamation-circle' : 'info-circle'), node('span', '', message));
    }
    function empty(message, name) {
      return append(node('div', 'cc-empty'), icon(name || 'sliders-h'), node('div', '', message));
    }
    function table(headers, className) {
      var scroll = node('div', 'cc-table-scroll');
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', headers.join('、'));
      var tab = node('table', 'cc-table ' + className);
      var head = node('thead');
      var tr = node('tr');
      headers.forEach(function (text) {
        var th = node('th', '', text);
        th.scope = 'col';
        tr.appendChild(th);
      });
      head.appendChild(tr);
      var body = node('tbody');
      append(tab, head, body);
      scroll.appendChild(tab);
      return { scroll: scroll, body: body };
    }
    function td(row, value, className) {
      var cell = node('td', className, value === undefined || value === null || value === '' ? '—' : value);
      row.appendChild(cell);
      return cell;
    }
    async function api(action, payload) {
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 20000);
      var writing = !['state', 'users', 'target'].includes(action);
      if (writing) writesPending += 1;
      try {
        var response = await fetch('/api/env/cloud-control.php', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(Object.assign({}, payload || {}, { app_id: app.id, action: action, csrf: config.csrf })),
          signal: controller.signal
        });
        var result;
        try { result = await response.json(); } catch (error) { throw new Error('服务器返回了无效响应，请检查登录状态后刷新。'); }
        if (!response.ok || !result || result.success !== true) {
          throw new Error(result && typeof result.message === 'string' ? result.message : '请求失败（HTTP ' + response.status + '）');
        }
        return result.data || {};
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('请求超时，结果尚未确认。请刷新状态后再操作，避免重复下发。');
        throw error;
      } finally { clearTimeout(timeout); if (writing) writesPending -= 1; }
    }
    function applyTheme(dark) {
      document.documentElement.setAttribute('data-jy-theme', dark ? 'dark' : 'light');
      themeInput.checked = dark;
      try { document.dispatchEvent(new CustomEvent('jy-theme-change', { detail: { dark: dark } })); } catch (error) {}
    }
    function savedTheme() {
      try { return localStorage.getItem('jiyan.theme') === 'dark'; } catch (error) { return false; }
    }
    function toggleControl(label, checked) {
      var wrap = node('label', 'cc-toggle');
      var input = field('checkbox');
      input.className = '';
      input.checked = checked;
      input.setAttribute('aria-label', label);
      append(wrap, input, node('span', 'cc-switch'));
      return { wrap: wrap, input: input };
    }

    document.body.classList.add('cc-body');
    var shell = node('div', 'cc-shell');
    var sidebar = node('aside', 'cc-sidebar');
    var brand = node('div', 'cc-brand');
    var logo = node('img', 'cc-logo');
    logo.src = '/前台/后台模块/image/jiyan-logo.png';
    logo.alt = '极验云验证';
    var brandCopy = node('div', 'cc-brand-copy');
    append(brandCopy, node('div', 'cc-brand-title', '极验云验证-云控面板'), node('div', 'cc-brand-subtitle', 'APPLICATION CONTROL'));
    append(brand, logo, brandCopy);
    var appSummary = node('div', 'cc-app-summary');
    var appName = node('strong', 'cc-app-name', app.name || '应用信息加载中');
    var appId = node('span', 'cc-app-id', 'APPID ' + (app.id || '—'));
    append(appSummary, node('span', 'cc-eyebrow', '当前应用'), appName, appId);
    var nav = node('nav', 'cc-nav');
    nav.setAttribute('aria-label', '云控导航');
    var navButtons = {};
    var viewInfo = {
      global: ['全局控制', 'sliders-h', '全局配置仅影响跟随全局的用户'],
      users: ['用户列表', 'users', '查找用户并配置独立功能'],
      commands: ['下发记录', 'paper-plane', '客户端回执以服务端返回状态为准'],
      catalog: ['功能目录', 'layer-group', '管理此应用的云控功能定义']
    };
    Object.keys(viewInfo).forEach(function (key) {
      var item = button(viewInfo[key][0], viewInfo[key][1], '', function () {
        view = key;
        renderView();
        if (key === 'users' || key === 'global') loadUsers(false);
        else loadState(false);
      });
      item.className = 'cc-nav-button';
      navButtons[key] = item;
      nav.appendChild(item);
    });
    var bottom = node('div', 'cc-sidebar-bottom');
    var themeRow = node('div', 'cc-theme-row');
    var theme = toggleControl('深色模式', false);
    var themeInput = theme.input;
    append(themeRow, node('span', '', '深色模式'), theme.wrap);
    themeInput.addEventListener('change', function () {
      applyTheme(themeInput.checked);
      try { localStorage.setItem('jiyan.theme', themeInput.checked ? 'dark' : 'light'); } catch (error) {}
    });
    var sessionLabel = node('div', 'cc-session');
    var rotateButton = button('重置访问链接', 'link', '', rotateLink);
    rotateButton.title = '重置访问链接';
    rotateButton.setAttribute('aria-label', '重置访问链接');
    append(bottom, themeRow, sessionLabel);
    append(sidebar, brand, appSummary, nav, bottom);
    var main = node('main', 'cc-main');
    var inner = node('div', 'cc-main-inner');
    var topbar = node('header', 'cc-topbar');
    var titleWrap = node('div');
    var title = node('h1', 'cc-title');
    var subtitle = node('p', 'cc-subtitle');
    append(titleWrap, title, subtitle);
    var refreshButton = button('刷新', 'sync-alt', '', async function () {
      refreshButton.disabled = true;
      await Promise.all([loadState(false), loadUsers(false)]);
      refreshButton.disabled = false;
    });
    refreshButton.title = '刷新服务端状态';
    refreshButton.setAttribute('aria-label', '刷新服务端状态');
    append(topbar, titleWrap, node('div', 'cc-actions'));
    append(topbar.lastChild, rotateButton, refreshButton);
    var errorBox = node('div', 'cc-error');
    errorBox.setAttribute('role', 'alert');
    errorBox.hidden = true;
    var stats = node('div', 'cc-stats');
    var statValues = {};
    [['total', 'users', '应用用户'], ['online', 'signal', '当前在线'], ['independent', 'user-shield', '独立配置']].forEach(function (item) {
      var stat = node('div', 'cc-stat');
      var symbol = icon(item[1]);
      symbol.classList.add('cc-stat-icon');
      var copy = node('div');
      var value = node('strong', '', '—');
      statValues[item[0]] = value;
      append(copy, value, node('span', '', item[2]));
      append(stat, symbol, copy);
      stats.appendChild(stat);
    });
    var content = node('section', 'cc-panel');
    content.setAttribute('aria-live', 'off');
    var footer = node('footer', 'cc-footer');
    var updatedLabel = node('span', '', '尚未连接');
    append(footer, node('span', '', '极验云验证 · 应用云控'), updatedLabel);
    append(inner, topbar, errorBox, stats, content, footer);
    main.appendChild(inner);
    append(shell, sidebar, main);
    root.replaceChildren(shell);
    applyTheme(savedTheme());
    window.addEventListener('storage', function (event) {
      if (event.key === 'jiyan.theme' || event.key === null) applyTheme(savedTheme());
    });

    function showError(message) {
      errorBox.textContent = message;
      errorBox.hidden = false;
    }
    function updateMeta() {
      var currentApp = model && model.app ? model.app : app;
      appName.textContent = '(' + String(currentApp.id || app.id || '—') + ' ' + String(currentApp.name || '未命名应用') + ')';
      appId.textContent = 'APPID ' + String(currentApp.id || app.id || '—');
      document.title = '极验云验证-云控面板 (' + String(currentApp.id || app.id || '') + ' ' + String(currentApp.name || '') + ')';
      var currentStats = model && model.stats ? model.stats : {};
      Object.keys(statValues).forEach(function (key) { statValues[key].textContent = count(currentStats[key]); });
      var expires = model && model.expires_at !== undefined ? model.expires_at : config.expires_at;
      sessionLabel.textContent = Number(expires) > 0 ? '访问链接有效至 ' + time(expires) : '访问链接有效期以服务端为准';
      updatedLabel.textContent = lastUpdated ? '最近同步 ' + time(lastUpdated) : '尚未连接';
    }
    function panelHead(label, description, action) {
      var head = node('div', 'cc-panel-head');
      var copy = node('div');
      append(copy, node('h2', '', label), description ? node('p', '', description) : null);
      append(head, copy, action);
      return head;
    }
    function features() { return model && Array.isArray(model.features) ? model.features : []; }
    function renderView() {
      Object.keys(navButtons).forEach(function (key) {
        if (view === key) navButtons[key].setAttribute('aria-current', 'page');
        else navButtons[key].removeAttribute('aria-current');
      });
      title.textContent = viewInfo[view][0];
      subtitle.textContent = viewInfo[view][2];
      content.replaceChildren();
      if (!model) {
        content.appendChild(empty(errorBox.hidden ? '正在连接应用云控…' : '暂未取得云控数据，请点击刷新重试。', 'cloud'));
        return;
      }
      if (view === 'global') renderGlobal();
      if (view === 'users') renderUsers();
      if (view === 'commands') renderCommands();
      if (view === 'catalog') renderCatalog();
    }
    async function loadState(quiet) {
      if (stateLoading) {
        if (quiet) return;
        await new Promise(function (resolve) { stateWaiters.push(resolve); });
        return loadState(false);
      }
      stateLoading = true;
      var sequence = ++stateSequence;
      try {
        var data = await api('state');
        if (!alive || sequence !== stateSequence) return;
        model = data;
        lastUpdated = Math.floor(Date.now() / 1000);
        errorBox.hidden = true;
        updateMeta();
        var editing = content.contains(document.activeElement) && /^(INPUT|SELECT)$/.test(document.activeElement.tagName);
        if (!quiet || (!editing && !writesPending && view !== 'users' && !activeModal)) renderView();
      } catch (error) {
        if (!alive) return;
        showError(error.message || '连接失败，请刷新重试。');
        if (!quiet) renderView();
      } finally {
        stateLoading = false;
        var waiting = stateWaiters.splice(0);
        waiting.forEach(function (resolve) { resolve(); });
      }
    }
    async function loadUsers(quiet) {
      if (!model) return;
      if (quiet && usersLoading) return;
      usersLoading = true;
      if (!quiet) usersError = '';
      var sequence = ++usersSequence;
      var requestedSearch = search;
      var requestedPage = page;
      try {
        var data = await api('users', { search: requestedSearch, page: requestedPage, page_size: 20 });
        if (!alive || sequence !== usersSequence || requestedSearch !== search || requestedPage !== page) return;
        usersData = data;
        usersError = '';
        if ((view === 'users' || view === 'global') && !activeModal) {
          var editing = content.contains(document.activeElement) && document.activeElement.tagName === 'INPUT';
          if (!quiet || !editing) renderUsers();
        }
      } catch (error) {
        if (sequence === usersSequence && !quiet) {
          usersError = error.message || '用户列表加载失败。';
          toast(usersError, true);
          if ((view === 'users' || view === 'global') && !activeModal) renderUsers();
        }
      } finally { if (sequence === usersSequence) usersLoading = false; }
    }
    function makeDuration(draft) {
      var wrap = node('div', 'cc-duration');
      var label = node('label', '', '配置有效期');
      var choice = select([['0', '永久'], ['600', '10分钟'], ['1800', '30分钟'], ['3600', '60分钟'], ['custom', '自定义分钟']], draft.duration || '0');
      choice.setAttribute('aria-label', '配置有效期');
      var custom = field('number', draft.custom || '10');
      custom.classList.add('cc-custom-duration');
      custom.min = '1';
      custom.max = '525600';
      custom.step = '1';
      custom.placeholder = '分钟';
      custom.setAttribute('aria-label', '自定义有效期（分钟）');
      custom.hidden = choice.value !== 'custom';
      choice.addEventListener('change', function () {
        draft.duration = choice.value;
        custom.hidden = choice.value !== 'custom';
        draft.onchange();
      });
      custom.addEventListener('input', function () { draft.custom = custom.value; draft.onchange(); });
      append(wrap, label, choice, custom);
      return {
        wrap: wrap,
        value: function () {
          if (choice.value !== 'custom') return Number(choice.value);
          var minutes = Number(custom.value);
          if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 525600) throw new Error('有效期必须为1至525600分钟（最多365天）。');
          return minutes * 60;
        },
        valid: function () { return choice.value !== 'custom' || (custom.value.trim() !== '' && custom.checkValidity() && Number.isSafeInteger(Number(custom.value)) && Number(custom.value) >= 1 && Number(custom.value) <= 525600); }
      };
    }
    function selectValues(feature) {
      if (!feature || !Array.isArray(feature.options)) return [];
      return feature.options.map(function (option) {
        return option && typeof option === 'object' ? String(option.value) : String(option);
      }).filter(function (value) { return value !== ''; });
    }
    function valueText(feature, value) {
      if (feature.type === 'toggle') return bool(value) ? '开启' : '关闭';
      if (feature.type === 'select') {
        var hit = (feature.options || []).find(function (option) { return option && String(option.value) === String(value); });
        return value === undefined || value === null ? '—' : (hit && hit.label ? String(hit.label) : String(value));
      }
      return value === undefined || value === null ? '—' : String(value);
    }
    function savedText(feature, record) {
      if (feature.type === 'button') return '单次指令 · 接收有效期5分钟';
      if (!record) return '默认配置：' + valueText(feature, feature.default_value);
      var source = { global: '全局', default: '默认', independent: '独立', user: '独立', target: '独立' }[record.source] || '当前';
      var exp = Number(record.expires_at);
      var expiry = exp > 0 ? (exp <= Date.now() / 1000 ? '已到期，等待同步' : '至 ' + time(exp)) : '永久';
      return source + '配置：' + valueText(feature, record.value) + ' · ' + expiry;
    }
    function validRange(feature, raw) {
      if (String(raw).trim() === '') return false;
      var n = Number(raw);
      var min = Number(feature.min);
      var max = Number(feature.max);
      var step = Number(feature.step);
      if (![n, min, max, step].every(Number.isFinite) || Math.abs(min) > 1e9 || Math.abs(max) > 1e9 || step > 1e9 || min >= max || step <= 0 || step > max - min || n < min || n > max) return false;
      var offset = (n - min) / step;
      return Math.abs(offset - Math.round(offset)) <= 1e-7;
    }
    function controlList(target, values, independent, cache, afterSave) {
      var list = node('div', 'cc-control-list');
      if (!features().length) {
        list.appendChild(empty('还没有功能，请先在功能目录中新增。'));
        return list;
      }
      features().forEach(function (feature) {
        if (!feature || !['toggle', 'range', 'select', 'button'].includes(feature.type) || typeof feature.key !== 'string') return;
        var record = values && values[feature.key];
        var initial = record ? record.value : feature.default_value;
        var draft = cache.get(feature.key);
        if (!draft || !draft.dirty || draft.type !== feature.type) {
          draft = { type: feature.type, value: initial, duration: '0', custom: '10', dirty: false };
          cache.set(feature.key, draft);
        }
        var row = node('div', 'cc-control-row' + (feature.type === 'button' ? ' cc-button-row' : ''));
        var label = node('div', 'cc-control-title');
        append(label, node('strong', 'cc-control-label', feature.label || feature.key), node('span', 'cc-control-key', feature.key), node('span', 'cc-control-saved', savedText(feature, record)));
        var editor = node('div', 'cc-control-editor');
        var dirtyLabel = node('div', 'cc-dirty');
        var actions = node('div', 'cc-control-actions');
        var busy = false;
        var saveButton;
        var duration;
        var toggle;
        var numeric;
        function refreshValidation() {
          if (!saveButton) return;
          var valid = feature.type !== 'range' || validRange(feature, draft.value);
          if (feature.type === 'select' && !selectValues(feature).includes(String(draft.value))) valid = false;
          if (duration) valid = valid && duration.valid();
          saveButton.disabled = busy || !independent || !valid;
          if (feature.type !== 'button') {
            dirtyLabel.textContent = !valid ? '请输入合法的数值及有效期' : draft.dirty ? '尚未保存' : '';
          }
        }
        draft.onchange = function () { draft.dirty = true; refreshValidation(); };
        function setBusy(value) {
          busy = value;
          row.querySelectorAll('input,select,button').forEach(function (control) { control.disabled = value || !independent; });
          refreshValidation();
        }
        async function save() {
          try {
            var seconds = duration.value();
            var value = feature.type === 'toggle' ? bool(draft.value) : feature.type === 'select' ? String(draft.value) : Number(draft.value);
            if (feature.type === 'range' && !validRange(feature, draft.value)) throw new Error('数值必须在范围内并符合步长。');
            setBusy(true);
            await api('set_value', { target: target, key: feature.key, value: value, duration: seconds });
            draft.dirty = false;
            toast('配置已保存，等待客户端同步。');
            await afterSave();
          } catch (error) { toast(error.message || '保存失败。', true); }
          finally { setBusy(false); }
        }
        if (feature.type === 'toggle') {
          toggle = toggleControl(feature.label || feature.key, bool(draft.value));
          var status = node('span', 'cc-toggle-text', toggle.input.checked ? '开启' : '关闭');
          toggle.wrap.appendChild(status);
          toggle.input.addEventListener('change', function () {
            draft.value = toggle.input.checked;
            status.textContent = toggle.input.checked ? '开启' : '关闭';
            draft.onchange();
          });
          editor.appendChild(toggle.wrap);
        } else if (feature.type === 'range') {
          var pair = node('div', 'cc-range-pair');
          var slider = field('range', draft.value);
          slider.className = '';
          numeric = field('number', draft.value);
          [slider, numeric].forEach(function (input) {
            input.min = String(feature.min);
            input.max = String(feature.max);
            input.step = String(feature.step);
            input.setAttribute('aria-label', (feature.label || feature.key) + (input === slider ? '滑动值' : '数值'));
          });
          slider.addEventListener('input', function () { numeric.value = slider.value; draft.value = slider.value; draft.onchange(); });
          numeric.addEventListener('input', function () {
            draft.value = numeric.value;
            if (validRange(feature, numeric.value)) slider.value = numeric.value;
            draft.onchange();
          });
          append(pair, slider, numeric);
          editor.appendChild(pair);
        } else if (feature.type === 'select') {
          var choices = selectValues(feature);
          var combo = select(choices.map(function (value) { return [value, value]; }), draft.value);
          combo.setAttribute('aria-label', feature.label || feature.key);
          combo.addEventListener('change', function () { draft.value = combo.value; draft.onchange(); });
          editor.appendChild(combo);
          if (!choices.length) editor.appendChild(notice('该下拉框还没有配置选项，请先在功能目录中补齐。'));
        } else {
          saveButton = button('下发一次', 'paper-plane', 'cc-primary', async function () {
            if (!window.confirm('向' + (target ? '此用户' : '当前跟随全局的用户') + '下发一次“' + String(feature.label || feature.key) + '”？指令可能立即被客户端接收。')) return;
            try {
              var requestId = uuid();
              setBusy(true);
              var result = await api('execute', { target: target, key: feature.key, ttl: 300, request_id: requestId });
              toast('已提交指令 #' + String(result.id || '—') + '，待客户端接收 ' + count(result.pending) + ' / ' + count(result.total) + '。');
              await loadState(true);
            } catch (error) { toast(error.message || '指令提交失败。', true); }
            finally { setBusy(false); }
          });
          editor.appendChild(saveButton);
        }
        if (feature.type !== 'button') {
          editor.appendChild(dirtyLabel);
          duration = makeDuration(draft);
          saveButton = button('保存', 'check', 'cc-primary', save);
          var releaseButton = iconButton('释放覆盖，恢复' + (target ? '独立模式默认值' : '默认值'), 'undo', async function () {
            if (!window.confirm('释放“' + String(feature.label || feature.key) + '”的当前覆盖配置？实际回退值以服务端为准。')) return;
            try {
              setBusy(true);
              await api('release_value', { target: target, key: feature.key });
              cache.delete(feature.key);
              toast('覆盖已释放，等待客户端同步。');
              await afterSave();
            } catch (error) { toast(error.message || '释放配置失败。', true); }
            finally { setBusy(false); }
          });
          append(actions, saveButton, releaseButton);
        }
        append(row, label, editor, duration ? duration.wrap : null, feature.type !== 'button' ? actions : null);
        row.querySelectorAll('input,select,button').forEach(function (control) { control.disabled = !independent; });
        refreshValidation();
        list.appendChild(row);
      });
      return list;
    }
    function renderGlobal() {
      content.replaceChildren();
      append(content, panelHead('全局功能配置', '每项单独保存，不覆盖其他功能。', button('新增功能', 'plus', '', openFeature)), notice('全局配置只作用于跟随全局的用户；独立模式用户不受全局配置及全局指令影响。配置保存不代表客户端已执行。'));
      content.appendChild(controlList('', model.global && model.global.values || {}, true, drafts, function () { return loadState(false); }));
      content.appendChild(node('section', 'cc-inline-users'));
      renderUsers();
    }
    function renderUsers() {
      if (view !== 'users' && view !== 'global') return;
      var host = view === 'global' ? content.querySelector('.cc-inline-users') : content;
      if (!host) return;
      host.replaceChildren();
      var form = node('form', 'cc-search');
      var query = field('search', search);
      query.placeholder = '搜索 UID / 昵称 / 卡密 / IP';
      query.maxLength = 100;
      query.setAttribute('aria-label', '搜索用户');
      var submit = button('搜索', 'search', 'cc-primary');
      submit.type = 'submit';
      append(form, query, submit);
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        search = query.value.trim();
        page = 1;
        usersData = null;
        loadUsers(false);
        renderUsers();
      });
      host.appendChild(panelHead('应用用户', '在线状态及登录信息由客户端上报。', form));
      var tab = table(['序号', '游戏UID', '游戏昵称', '绑定卡密', 'IP', '最近一次登录', '在线状态', '功能管理'], 'cc-user-table');
      var rows = usersData && Array.isArray(usersData.users) ? usersData.users : [];
      var pagination = usersData && usersData.pagination || {};
      var currentPage = Math.max(1, Number(pagination.page) || page);
      var size = Math.max(1, Number(pagination.page_size) || 20);
      if (!rows.length) {
        var blank = node('tr');
        var blankCell = td(blank, usersError || (usersData ? (search ? '未找到匹配用户。' : '暂无客户端用户数据。') : '正在读取用户列表…'), 'cc-empty');
        blankCell.colSpan = 8;
        tab.body.appendChild(blank);
      }
      rows.forEach(function (user, index) {
        var row = node('tr');
        td(row, (currentPage - 1) * size + index + 1);
        var uid = td(row, user.game_uid, 'cc-mono');
        if (!user.game_uid && user.device_id) uid.appendChild(node('span', 'cc-cell-sub', '设备 ' + String(user.device_id)));
        td(row, user.game_nick);
        var cardCell = td(row, user.card_no || '未关联卡密', 'cc-mono');
        if (user.card_status) cardCell.appendChild(node('span', 'cc-cell-sub', user.card_status));
        td(row, user.ip, 'cc-mono');
        td(row, time(user.last_login_at));
        var online = td(row, '');
        online.textContent = '';
        online.appendChild(node('span', 'cc-badge' + (bool(user.is_online) ? ' cc-online' : ''), bool(user.is_online) ? '在线' : '离线'));
        var management = td(row, '');
        management.textContent = '';
        var manage = button('功能管理', 'sliders-h', '', function () { openTarget(user); });
        manage.disabled = typeof user.target !== 'string' || user.target === '';
        management.appendChild(manage);
        management.appendChild(node('span', 'cc-cell-sub', bool(user.independent) ? '独立模式' : '跟随全局'));
        tab.body.appendChild(row);
      });
      host.appendChild(tab.scroll);
      var pager = node('div', 'cc-pagination');
      var totalPages = Math.max(1, Number(pagination.pages) || 1);
      var previous = iconButton('上一页', 'chevron-left', function () { page = currentPage - 1; usersData = null; loadUsers(false); renderUsers(); });
      var next = iconButton('下一页', 'chevron-right', function () { page = currentPage + 1; usersData = null; loadUsers(false); renderUsers(); });
      previous.disabled = !usersData || currentPage <= 1;
      next.disabled = !usersData || currentPage >= totalPages;
      var controls = node('div', 'cc-actions');
      append(controls, previous, node('span', 'cc-page-label', currentPage + ' / ' + totalPages), next);
      append(pager, node('span', '', '共 ' + count(pagination.total) + ' 位用户'), controls);
      host.appendChild(pager);
    }
    function renderCommands() {
      append(content, panelHead('最近下发记录', '客户端每 2 秒轮询一次；待接收不等于执行成功。'), notice('成功 / 失败来自客户端回执；“待接收”只表示指令已入库但该用户尚未回执，离线或未声明该功能的用户会一直待接收，直到有效期结束或被取消。'));
      var tab = table(['指令', '功能', '目标', '下发时间', '有效至', '总数', '成功', '失败', '已取消', '待接收', '客户端回执说明'], 'cc-command-table');
      var commands = Array.isArray(model.commands) ? model.commands : [];
      if (!commands.length) {
        var blank = node('tr');
        td(blank, '暂无下发记录。', 'cc-empty').colSpan = 11;
        tab.body.appendChild(blank);
      }
      commands.forEach(function (command) {
        var row = node('tr');
        td(row, command.id, 'cc-mono');
        var name = td(row, command.label || command.feature_key);
        name.appendChild(node('span', 'cc-cell-sub cc-mono', command.feature_key || ''));
        td(row, command.target_label);
        td(row, time(command.created_at));
        td(row, time(command.expires_at));
        ['total', 'success', 'failed', 'cancelled'].forEach(function (key) { td(row, count(command[key])); });
        var pending = td(row, count(command.pending));
        if (Number(command.pending_offline) > 0) {
          pending.appendChild(node('span', 'cc-cell-sub', count(command.pending_offline) + ' 个离线未回执'));
        } else if (Number(command.pending) > 0 && Number(command.expires_at) > 0 && Number(command.expires_at) <= Date.now() / 1000) {
          pending.appendChild(node('span', 'cc-cell-sub', '已过期，未回执'));
        }
        var detail = td(row, command.last_result || '—', command.last_result ? '' : 'cc-empty');
        if (command.last_result) detail.title = String(command.last_result);
        tab.body.appendChild(row);
      });
      content.appendChild(tab.scroll);
    }
    function renderCatalog() {
      content.appendChild(panelHead('功能目录', '目录变更会影响此应用的控制项。', button('新增功能', 'plus', 'cc-primary', openFeature)));
      var tab = table(['功能名称', 'KEY', '类型', '默认值', '范围 / 步长', '管理'], 'cc-catalog-table');
      if (!features().length) {
        var blank = node('tr');
        td(blank, '暂无功能定义。', 'cc-empty').colSpan = 6;
        tab.body.appendChild(blank);
      }
      features().forEach(function (feature) {
        var row = node('tr');
        td(row, feature.label);
        td(row, feature.key, 'cc-mono');
        td(row, { toggle: '开关', range: '滑动数值', select: '下拉框', button: '单次指令' }[feature.type] || feature.type);
        td(row, feature.type === 'button' ? '—' : valueText(feature, feature.default_value));
        td(row, feature.type === 'range' ? String(feature.min) + ' ~ ' + String(feature.max) + ' / ' + String(feature.step) : feature.type === 'select' ? (selectValues(feature).join(' / ') || '—') : '—');
        var actions = td(row, '');
        actions.textContent = '';
        var remove = iconButton('删除功能 ' + String(feature.label || feature.key), 'trash-alt', async function () {
          if (!window.confirm('删除功能“' + String(feature.label || feature.key) + '”（' + String(feature.key) + '）？此操作将影响该功能的现有配置，无法撤销。')) return;
          remove.disabled = true;
          try {
            await api('delete_feature', { key: feature.key });
            drafts.delete(feature.key);
            toast('功能已删除。');
            await loadState(false);
          } catch (error) { toast(error.message || '删除失败。', true); }
          finally { remove.disabled = false; }
        }, true);
        actions.appendChild(remove);
        tab.body.appendChild(row);
      });
      content.appendChild(tab.scroll);
    }
    function openModal(label, wide) {
      closeModal();
      var previousFocus = document.activeElement;
      var context = { active: true, previousFocus: previousFocus, busy: false };
      var backdrop = node('div', 'cc-modal-backdrop');
      var dialog = node('div', 'cc-modal' + (wide ? ' cc-modal-wide' : ''));
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      var header = node('div', 'cc-modal-head');
      var heading = node('h2', '', label);
      heading.id = 'cloud-modal-title';
      dialog.setAttribute('aria-labelledby', heading.id);
      var close = iconButton('关闭弹窗', 'times', function () { if (!context.busy) closeModal(); });
      append(header, heading, close);
      var body = node('div', 'cc-modal-body');
      append(dialog, header, body);
      backdrop.appendChild(dialog);
      backdrop.addEventListener('click', function (event) { if (event.target === backdrop && !context.busy) closeModal(); });
      context.dialog = dialog;
      context.body = body;
      context.heading = heading;
      context.close = close;
      activeModal = context;
      modalRoot.replaceChildren(backdrop);
      document.body.classList.add('cc-modal-open');
      requestAnimationFrame(function () { if (context.active) close.focus(); });
      return context;
    }
    function closeModal() {
      if (!activeModal) return;
      var old = activeModal;
      old.active = false;
      activeModal = null;
      modalRoot.replaceChildren();
      document.body.classList.remove('cc-modal-open');
      if (old.previousFocus && old.previousFocus.isConnected) old.previousFocus.focus();
    }
    document.addEventListener('keydown', function (event) {
      if (!activeModal) return;
      if (event.key === 'Escape') { if (!activeModal.busy) closeModal(); event.preventDefault(); }
      if (event.key === 'Tab') {
        var elements = Array.from(activeModal.dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]')).filter(function (el) { return el.getClientRects().length > 0; });
        if (!elements.length) { event.preventDefault(); return; }
        var first = elements[0];
        var last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || !activeModal.dialog.contains(document.activeElement))) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && (document.activeElement === last || !activeModal.dialog.contains(document.activeElement))) { first.focus(); event.preventDefault(); }
      }
    });
    function formLabel(text, control) {
      var label = node('label', 'cc-form-label');
      append(label, node('span', '', text), control);
      return label;
    }
    function openFeature() {
      var context = openModal('新增功能', false);
      var form = node('form', 'cc-form');
      var key = field('text');
      key.required = true;
      key.maxLength = 64;
      key.pattern = '[A-Za-z][A-Za-z0-9_]{0,63}';
      key.placeholder = '例如 auto_aim';
      key.autocomplete = 'off';
      key.title = '英文字母开头，仅包含英文字母、数字和下划线，最多64位';
      var label = field('text');
      label.required = true;
      label.maxLength = 64;
      label.placeholder = '功能显示名称';
      var type = select([['toggle', '开关 toggle'], ['range', '滑动条 range'], ['select', '下拉框 select'], ['button', '单次指令 button']], 'toggle');
      var defaultWrap = node('div');
      var defaults = field('number', 0);
      var defaultToggle = select([['false', '关闭'], ['true', '开启']], 'false');
      var defaultSelect = field('text', '');
      defaultSelect.maxLength = 64;
      defaultSelect.placeholder = '默认选中的选项值';
      var optionsArea = node('textarea', 'cc-field');
      optionsArea.rows = 5;
      optionsArea.maxLength = 4000;
      optionsArea.placeholder = '每行一个选项，例如：\n关闭\n开启\n仅自瞄';
      optionsArea.title = '1至100项，每项1至64字，不能重复；顺序即下拉框顺序';
      var optionsWrap = node('div');
      var min = field('number', 0);
      var max = field('number', 100);
      var step = field('number', 1);
      [min, max, step, defaults].forEach(function (input) { input.step = 'any'; input.required = true; });
      var bounds = node('div', 'cc-form-grid');
      append(bounds, formLabel('最小值 min', min), formLabel('最大值 max', max), formLabel('步长 step', step));
      var errorLabel = node('p', 'cc-form-error');
      errorLabel.setAttribute('role', 'alert');
      var submit = button('创建功能', 'plus', 'cc-primary');
      submit.type = 'submit';
      var footer = node('div', 'cc-modal-foot');
      append(footer, button('取消', '', '', closeModal), submit);
      function typeChange() {
        defaultWrap.replaceChildren();
        if (type.value === 'toggle') defaultWrap.appendChild(formLabel('默认值 default_value', defaultToggle));
        if (type.value === 'range') defaultWrap.appendChild(formLabel('默认值 default_value', defaults));
        if (type.value === 'select') append(defaultWrap, formLabel('选项 options', optionsArea), formLabel('默认值 default_value', defaultSelect));
        if (type.value === 'button') defaultWrap.appendChild(notice('按钮为一次下发指令，不保存持续开关值。'));
        bounds.hidden = type.value !== 'range';
        [min, max, step, defaults].forEach(function (input) { input.disabled = type.value !== 'range'; });
        validate();
      }
      function validationMessage() {
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key.value)) return 'KEY须以英文字母开头，使用字母、数字或下划线。';
        if (!label.value.trim() || label.value.trim().length > 64) return '请输入1至64字的功能名称。';
        if (features().some(function (feature) { return feature.key === key.value; })) return '该KEY已存在。';
        if (type.value === 'range' && !validRange({ min: min.value, max: max.value, step: step.value }, defaults.value)) return '请检查范围、正步长及默认值，默认值必须对齐步长。';
        if (type.value === 'range' && [min, max, step, defaults].some(function (input) { return input.value.trim() === '' || !input.checkValidity(); })) return '请填写有效的范围、步长与默认值。';
        if (type.value === 'select') {
          var list = selectOptions();
          if (list.error) return list.error;
          if (!list.items.includes(defaultSelect.value.trim())) return '默认值必须是选项中的一项。';
        }
        return '';
      }
      function selectOptions() {
        var lines = optionsArea.value.split(/\r?\n/).map(function (line) { return line.trim(); }).filter(function (line) { return line !== ''; });
        if (!lines.length) return { error: '请至少填写一个下拉选项。' };
        if (lines.length > 100) return { error: '下拉选项最多100项。' };
        for (var i = 0; i < lines.length; i++) {
          if (Array.from(lines[i]).length > 64) return { error: '第' + (i + 1) + '项超过64字。' };
        }
        if (new Set(lines).size !== lines.length) return { error: '下拉选项不能重复。' };
        return { items: lines };
      }
      function validate() { submit.disabled = !!validationMessage() || context.busy; }
      type.addEventListener('change', typeChange);
      form.addEventListener('input', validate);
      form.addEventListener('change', validate);
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var message = validationMessage();
        if (message) { errorLabel.textContent = message; return; }
        context.busy = true;
        context.close.disabled = true;
        form.querySelectorAll('button').forEach(function (control) { control.disabled = true; });
        try {
          await api('save_feature', {
            key: key.value,
            label: label.value.trim(),
            type: type.value,
            default_value: type.value === 'toggle' ? defaultToggle.value === 'true' : type.value === 'range' ? Number(defaults.value) : type.value === 'select' ? defaultSelect.value.trim() : null,
            options: type.value === 'select' ? selectOptions().items.map(function (value) { return { value: value, label: value }; }) : null,
            min: type.value === 'range' ? Number(min.value) : null,
            max: type.value === 'range' ? Number(max.value) : null,
            step: type.value === 'range' ? Number(step.value) : null
          });
          closeModal();
          toast('功能已创建。');
          await loadState(false);
        } catch (error) { if (context.active) errorLabel.textContent = error.message || '创建失败。'; }
        finally {
          context.busy = false;
          context.close.disabled = false;
          form.querySelectorAll('button').forEach(function (control) { control.disabled = false; });
          validate();
        }
      });
      append(form, formLabel('功能KEY key', key), formLabel('显示名称 label', label), formLabel('类型 type', type), defaultWrap, bounds, errorLabel, footer);
      context.body.appendChild(form);
      typeChange();
    }
    async function openTarget(user) {
      var context = openModal('用户功能管理', true);
      context.body.classList.add('cc-target-body');
      context.cache = new Map();
      context.target = user.target;
      async function reload() {
        var data = await api('target', { target: context.target });
        if (!context.active) return;
        context.data = data;
        renderTarget(context, reload);
      }
      context.body.appendChild(empty('正在读取用户配置…', 'user-cog'));
      try { await reload(); }
      catch (error) { if (context.active) context.body.replaceChildren(notice(error.message || '读取用户配置失败。', true), button('重试', 'sync-alt', '', function () { reload().catch(function (failure) { toast(failure.message, true); }); })); }
    }
    function renderTarget(context, reload) {
      var data = context.data;
      var user = data.user || {};
      var independent = bool(data.independent);
      context.body.replaceChildren();
      context.heading.textContent = '用户功能管理 · ' + String(user.game_nick || user.game_uid || '未上报昵称');
      var summary = node('div', 'cc-target-summary');
      var info = node('div');
      append(info, node('strong', '', user.game_nick || '未上报昵称'), node('p', '', '游戏UID ' + String(user.game_uid || '—') + ' · 设备 ' + String(user.device_id || '—')), node('p', '', '最近客户端同步 ' + time(data.client_seen_at)));
      var actions = node('div', 'cc-actions');
      var independentSwitch = toggleControl('独立模式', independent);
      independentSwitch.wrap.classList.add('cc-target-toggle');
      independentSwitch.wrap.appendChild(node('span', 'cc-toggle-text', '独立模式'));
      independentSwitch.input.addEventListener('change', async function () {
        var enabled = independentSwitch.input.checked;
        independentSwitch.input.checked = independent;
        var message = enabled ? '启用此用户的独立模式？启用后该用户不受全局配置和全局指令影响，独立值以服务端返回为准。' : '关闭此用户的独立模式？该用户将重新跟随全局配置。';
        if (!window.confirm(message)) return;
        context.busy = true;
        context.close.disabled = true;
        context.body.querySelectorAll('input,select,button').forEach(function (control) { control.disabled = true; });
        try {
          await api('set_independent', { target: context.target, enabled: enabled });
          context.cache.clear();
          await reload();
          toast(enabled ? '已启用独立模式，等待客户端同步。' : '已恢复跟随全局，等待客户端同步。');
          await loadState(true);
          await loadUsers(true);
        } catch (error) { toast(error.message || '模式切换失败。', true); if (context.active) renderTarget(context, reload); }
        finally { context.busy = false; context.close.disabled = false; }
      });
      var refresh = iconButton('刷新此用户配置', 'sync-alt', async function () {
        refresh.disabled = true;
        try { await reload(); } catch (error) { toast(error.message || '刷新失败。', true); }
        finally { refresh.disabled = false; }
      });
      append(actions, independentSwitch.wrap, refresh);
      append(summary, info, actions);
      append(context.body, summary, notice(independent ? '此用户处于独立模式。单用户配置完全独立，不受全局变更影响。' : '此用户正在跟随全局。启用独立模式后才能编辑单用户功能，切换前请确认。', !independent), controlList(context.target, data.values || {}, independent, context.cache, async function () { await reload(); await loadState(true); }));
    }
    function uuid() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') throw new Error('当前浏览器不支持安全请求标识，请使用HTTPS或更新浏览器。');
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      var hex = Array.from(bytes).map(function (byte) { return byte.toString(16).padStart(2, '0'); }).join('');
      return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
    }
    async function rotateLink() {
      if (!window.confirm('重置此应用的云控访问链接？旧链接将立即失效，并跳转到新链接。')) return;
      rotateButton.disabled = true;
      try {
        var data = await api('rotate_link');
        var url = new URL(data.url, window.location.href);
        if (typeof data.url !== 'string' || !data.url || url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) throw new Error('服务端返回的访问链接无效，未执行跳转。请通过应用后台获取新链接。');
        window.location.replace(url.href);
      } catch (error) { toast(error.message || '链接重置失败。', true); }
      finally { rotateButton.disabled = false; }
    }
    updateMeta();
    renderView();
    if (!app.id || typeof config.csrf !== 'string' || !config.csrf) {
      showError('缺少应用身份或CSRF令牌，无法连接云控。请通过应用后台重新打开此页面。');
      refreshButton.disabled = true;
      rotateButton.disabled = true;
      return;
    }
    loadState(false).then(function () { if (model) loadUsers(true); });
    var poll = setInterval(function () {
      if (!alive || document.hidden || writesPending || activeModal && activeModal.busy) return;
      loadState(true);
      if (view === 'users' || view === 'global') loadUsers(true);
    }, 15000);
    window.addEventListener('pagehide', function () { alive = false; clearInterval(poll); clearTimeout(toastTimer); });
    window.addEventListener('pageshow', function (event) { if (event.persisted) window.location.reload(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && alive) { loadState(true); if (view === 'users' || view === 'global') loadUsers(true); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
