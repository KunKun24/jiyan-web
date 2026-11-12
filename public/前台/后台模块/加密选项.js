//极验云 - JiYan V1
//加密/签名选项：统一从服务端 get_crypto_options 拉取，失败回落内置表
//依赖：请求.js 的 POSTPHP、通用.js 的 获取API链接、全局 开发者UID/开发者密码/开发者Token

(function () {
  'use strict';

  var FALLBACK_ENCRYPT = [
    { value: '0', label: '不加密', vip: false },
    { value: '1', label: 'AES-256-CBC', vip: false },
    { value: '2', label: '自定义 Base64 编码集', vip: false },
    { value: '3', label: '极验 EnvProto', vip: false },
    { value: '4', label: 'JiYan-Seal v1（HMAC 密钥流 + 完整性标签）', vip: false },
    { value: '5', label: 'AES-256-CBC + HMAC-SHA256（Encrypt-then-MAC）', vip: true },
    { value: '6', label: 'AES-256-GCM', vip: true },
    { value: '7', label: 'ChaCha20-Poly1305', vip: true },
    { value: '8', label: 'XChaCha20-Poly1305', vip: true }
  ];

  var FALLBACK_SIGN = [
    { value: '0', label: '不签名', vip: false },
    { value: '1', label: 'MD5', vip: false },
    { value: '2', label: 'SHA512', vip: false },
    { value: '3', label: 'CRC32', vip: false },
    { value: '4', label: 'SHA256', vip: false },
    { value: '5', label: 'RIPEMD-160', vip: false },
    { value: '6', label: 'SHA1', vip: false },
    { value: '7', label: 'SHA224', vip: false },
    { value: '8', label: 'SHA384', vip: false },
    { value: '9', label: 'SHA3-512', vip: false },
    { value: '10', label: 'SHA3-256', vip: false },
    { value: '11', label: 'SHA3-224', vip: false },
    { value: '12', label: 'JiYan-Sign（HMAC-SHA256）', vip: false },
    { value: '13', label: 'JiYan-Sign+（双段 HMAC）', vip: true },
    { value: '14', label: 'BLAKE2b-256（带密钥）', vip: true }
  ];

  var cache = { encrypt: null, sign: null, at: 0 };
  var loading = null;

  function isVipLocal() {
    return !!window.是否VIP;
  }

  function normalize(list, vip) {
    var out = [];
    (list || []).forEach(function (it) {
      var isVip = !!it.vip;
      out.push({
        value: String(it.value),
        label: String(it.label || ''),
        vip: isVip,
        enabled: it.enabled === undefined ? (!isVip || vip) : !!it.enabled
      });
    });
    return out;
  }

  function encryptList() {
    return normalize(cache.encrypt || FALLBACK_ENCRYPT, isVipLocal());
  }

  function signList() {
    return normalize(cache.sign || FALLBACK_SIGN, isVipLocal());
  }

  function esc(s) {
    var t = String(s === undefined || s === null ? '' : s);
    t = t.split(String.fromCharCode(38)).join(String.fromCharCode(38) + 'amp;');
    t = t.split('<').join(String.fromCharCode(38) + 'lt;');
    t = t.split('>').join(String.fromCharCode(38) + 'gt;');
    t = t.split(String.fromCharCode(34)).join(String.fromCharCode(38) + 'quot;');
    t = t.split(String.fromCharCode(39)).join(String.fromCharCode(38) + '#39;');
    return t;
  }

  function q(v) {
    return String.fromCharCode(39) + v + String.fromCharCode(39);
  }

  function optionsHTML(kind, cur) {
    var list = kind === 'sign' ? signList() : encryptList();
    var curVal = String(cur === undefined || cur === null ? '0' : cur);
    var html = '';
    list.forEach(function (it) {
      var sel = it.value === curVal ? ' selected' : '';
      var dis = it.enabled ? '' : ' disabled';
      var tag = it.vip ? ' data-vip=' + q('1') : '';
      var tip = '';
      if (!it.enabled) {
        tip = ' title=' + q(it.vip ? '开通会员后可用' : '当前不可用');
      }
      var label = it.label + (it.vip ? ' (VIP)' : '');
      html += '<option value=' + q(esc(it.value)) + tag + dis + tip + sel + '>'
        + esc(label) + '</option>';
    });
    return html;
  }

  function load(force) {
    if (!force && cache.encrypt && cache.sign && (Date.now() - cache.at) < 60000) {
      return Promise.resolve(true);
    }
    if (loading) {
      return loading;
    }
    if (typeof POSTPHP !== 'function' || typeof 获取API链接 !== 'function') {
      return Promise.resolve(false);
    }
    if (!window.开发者UID || !window.开发者密码) {
      return Promise.resolve(false);
    }
    loading = POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
      action: 'get_crypto_options',
      password: 开发者安全密码
    }).then(function (res) {
      loading = null;
      if (!res || !res.success || !res.data) {
        return false;
      }
      if (res.data.encrypt && res.data.sign) {
        cache.encrypt = res.data.encrypt;
        cache.sign = res.data.sign;
        cache.at = Date.now();
        return true;
      }
      return false;
    }).catch(function () {
      loading = null;
      return false;
    });
    return loading;
  }

  function refreshOpenSelects() {
    var ids = ['encryptionFormat', 'qmtionFormat'];
    var kinds = ['encrypt', 'sign'];
    for (var i = 0; i < ids.length; i++) {
      var sel = document.getElementById(ids[i]);
      if (!sel) {
        continue;
      }
      var cur = sel.value;
      sel.innerHTML = optionsHTML(kinds[i], cur);
      sel.value = cur;
    }
    if (typeof 应用VIP限制 === 'function') {
      应用VIP限制();
    }
  }

  window.JY_CRYPTO = {
    load: load,
    optionsHTML: optionsHTML,
    encryptList: encryptList,
    signList: signList,
    refreshOpenSelects: refreshOpenSelects,
    version: 'V1'
  };
})();
