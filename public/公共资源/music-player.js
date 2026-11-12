(function(){'use strict';
if (window.__JYMusicLoaded) return;
window.__JYMusicLoaded=true;
var root=document.createElement('div');root.innerHTML="<div class=\"mp-list\" id=\"mpList\">\n  <div class=\"hd\">\n    <span class=\"t\" id=\"mpListTitle\">歌单加载中…</span>\n    <span class=\"n\" id=\"mpListCount\"></span>\n    <button id=\"mpListClose\" type=\"button\" aria-label=\"收起歌单\"><i class=\"fas fa-xmark\"></i></button>\n  </div>\n  <div class=\"bd\" id=\"mpListBody\"><div class=\"loading\">加载中…</div></div>\n</div>\n\n<div class=\"mp\" id=\"mp\" aria-label=\"音乐播放器\"><span class=\"mp-notes\" aria-hidden=\"true\">♪ ♫</span>\n  <div class=\"disc\" id=\"mpDisc\" role=\"button\" tabindex=\"0\" aria-label=\"播放 / 暂停\">\n    <span class=\"cov\" id=\"mpCov\"></span>\n    <i class=\"fas fa-music\" id=\"mpIcon\"></i>\n  </div>\n  <div class=\"meta\">\n    <div class=\"tname\"><i class=\"fas fa-headphones\"></i><span id=\"mpName\">点击播放</span></div>\n    <div class=\"tartist\" id=\"mpArtist\">网易云歌单</div>\n    <div class=\"mp-lyric\" id=\"mpLyric\" title=\"同步歌词\">歌词加载中…</div><div class=\"bar\" id=\"mpBar\"><span id=\"mpProg\"></span></div>\n  </div>\n  <div class=\"acts\">\n    <button id=\"mpPrev\" type=\"button\" title=\"上一首\"><i class=\"fas fa-backward-step\"></i></button>\n    <button id=\"mpNext\" type=\"button\" title=\"下一首\"><i class=\"fas fa-forward-step\"></i></button>\n    <button id=\"mpListBtn\" type=\"button\" title=\"歌单\"><i class=\"fas fa-list-ul\"></i></button>\n    <button id=\"mpVolBtn\" type=\"button\" title=\"音量\"><i class=\"fas fa-volume-low\"></i></button>\n  </div>\n  <div class=\"vol\" id=\"mpVol\">\n    <i class=\"fas fa-volume-off\" style=\"font-size:11px;color:var(--ink-3)\"></i>\n    <input type=\"range\" id=\"mpVolRange\" min=\"0\" max=\"100\" value=\"45\" aria-label=\"音量\">\n    <i class=\"fas fa-volume-high\" style=\"font-size:11px;color:var(--ink-3)\"></i>\n  </div>\n</div>\n\n";while(root.firstChild)document.body.appendChild(root.firstChild);
  (function () {
    var wrap = document.getElementById('mp');
    if (!wrap) return;

    var KEY   = 'jy_bgm_v2';
    var audio = new Audio();
    audio.preload = 'none';
    window.JYMusicAudio = audio;

    var disc   = document.getElementById('mpDisc');
    var cov    = document.getElementById('mpCov');
    var icon   = document.getElementById('mpIcon');
    var nameEl = document.getElementById('mpName');
    var artEl  = document.getElementById('mpArtist');
    var prog   = document.getElementById('mpProg');
    var bar    = document.getElementById('mpBar');
    var volBox = document.getElementById('mpVol');
    var volRng = document.getElementById('mpVolRange');
    var listEl = document.getElementById('mpList');
    var listBd = document.getElementById('mpListBody');
    var listTt = document.getElementById('mpListTitle');
    var listCn = document.getElementById('mpListCount');

    var songs = [], idx = 0, playing = false, wantPlay = false, fails = 0;

    var AMP = String.fromCharCode(38);
    function esc(s) {
      return String(s === undefined || s === null ? '' : s)
        .split(AMP).join(AMP + 'amp;')
        .split('<').join(AMP + 'lt;')
        .split('>').join(AMP + 'gt;')
        .split(String.fromCharCode(34)).join(AMP + 'quot;')
        .split(String.fromCharCode(39)).join(AMP + '#39;');
    }

    var lyricEl = document.getElementById('mpLyric'), lyricLines = [], lyricKey = '', lyricRequest = 0;
    function parseLrc(text) {
      var out = [], offset = 0;
      var om = /\[offset:([+-]?\d+)\]/i.exec(text); if (om) offset = Number(om[1]) / 1000;
      String(text).split(/\r?\n/).forEach(function(line) {
        var content = line.replace(/\[[^\]]*\]/g, '').trim(), rx = /\[(\d+):(\d+(?:\.\d+)?)\]/g, m;
        while ((m = rx.exec(line))) out.push({time:Number(m[1])*60+Number(m[2])+offset,text:content});
      });
      return out.sort(function(a,b){return a.time-b.time;});
    }
    function syncLyric() {
      if (!lyricEl || !lyricLines.length) return;
      var t = audio.currentTime, line = null;
      for (var i=0;i<lyricLines.length;i++) {if (lyricLines[i].time > t) break;line=lyricLines[i];}
      lyricEl.textContent = line ? (line.text || '♪') : '♪ 前奏';
      lyricEl.title = lyricEl.textContent;
    }
    function loadLyric(cur) {
      var key = cur && (cur.lrc || cur.sid || cur.name) || '';
      if (key === lyricKey) return; lyricKey=key; lyricLines=[];
      var request=++lyricRequest;
      if (!cur || !cur.lrc) {if(lyricEl) lyricEl.textContent='暂无歌词';return;}
      if(lyricEl) lyricEl.textContent='歌词加载中…';
      fetch(cur.lrc,{credentials:'same-origin'}).then(function(r){if(!r.ok)throw Error('lrc');return r.text();}).then(function(text){
        if(request!==lyricRequest)return;
        try {var j=JSON.parse(text);text=j.lrc && typeof j.lrc==='object' ? j.lrc.lyric : (j.lrc || j.lyric || '');} catch(e) {}
        lyricLines=parseLrc(String(text));
        if (!lyricLines.length) {if(lyricEl)lyricEl.textContent='暂无同步歌词';return;}syncLyric();
      }).catch(function(){if(request===lyricRequest && lyricEl)lyricEl.textContent='歌词暂不可用';});
    }
    audio.addEventListener('timeupdate',syncLyric);

    /* ---- 记忆 ---- */
    var st = null;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (st) {
      if (typeof st.vol === 'number') audio.volume = Math.max(0, Math.min(1, st.vol));
      if (st.on === true) wantPlay = true;
    } else {
      audio.volume = 0.45;
    }
    if (volRng) volRng.value = String(Math.round(audio.volume * 100));

    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ vol: audio.volume, on: wantPlay, i: idx }));
      } catch (e) {}
    }

    /* ---- 渲染 ---- */
    function paint() {
      wrap.classList.toggle('playing', playing);
      if (icon) icon.className = 'fas ' + (playing ? 'fa-pause' : 'fa-music');
      var cur = songs[idx];
      loadLyric(cur);
      if (nameEl) nameEl.textContent = cur ? cur.name : '点击播放';
      if (artEl)  artEl.textContent  = cur ? (cur.artist || '未知歌手') : '网易云歌单';
      if (cur && cur.pic) {
        if (cov) cov.style.backgroundImage = 'url("' + cur.pic + '")';
        if (disc) disc.classList.add('has-cov');
      } else if (disc) {
        disc.classList.remove('has-cov');
      }
      var items = listBd ? listBd.querySelectorAll('.it') : [];
      Array.prototype.forEach.call(items, function (el, i) {
        el.classList.toggle('on', i === idx);
      });
      var on = listBd && listBd.querySelector('.it.on');
      if (on && listEl && listEl.classList.contains('open')) {
        var r = on.offsetTop, h = listBd.clientHeight;
        if (r < listBd.scrollTop || r > listBd.scrollTop + h - 40) {
          listBd.scrollTop = Math.max(0, r - h / 2);
        }
      }
    }

    /* ---- 载入某首 ---- */
    function load(i, autoplay) {
      if (!songs.length) return;
      idx = (i + songs.length) % songs.length;
      var cur = songs[idx];
      audio.src = cur.url;
      audio.load();
      if (prog) prog.style.width = '0%';
      paint();
      if (autoplay) {
        var p = audio.play();
        if (p && p.catch) p.catch(function () { playing = false; paint(); });
      }
      save();
    }

    audio.addEventListener('play',  function () { playing = true;  fails = 0; paint(); });
    audio.addEventListener('pause', function () { playing = false; paint(); });
    audio.addEventListener('ended', function () { load(idx + 1, true); });
    audio.addEventListener('error', function () {
      playing = false; paint();
      fails++;
      if (fails <= 3 && songs.length > 1) setTimeout(function () { load(idx + 1, true); }, 700);
    });
    audio.addEventListener('timeupdate', function () {
      if (!audio.duration || !isFinite(audio.duration) || !prog) return;
      prog.style.width = Math.min(100, (audio.currentTime / audio.duration) * 100).toFixed(2) + '%';
    });

    function toggle() {
      if (!songs.length) { loadSongs(true); return; }
      if (!audio.src) { load(idx, true); wantPlay = true; save(); return; }
      if (audio.paused) {
        wantPlay = true;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { playing = false; paint(); });
      } else {
        wantPlay = false;
        audio.pause();
      }
      save();
    }

    if (disc) {
      disc.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
      disc.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    var prevB = document.getElementById('mpPrev');
    if (prevB) prevB.addEventListener('click', function (e) { e.stopPropagation(); load(idx - 1, true); });
    var nextB = document.getElementById('mpNext');
    if (nextB) nextB.addEventListener('click', function (e) { e.stopPropagation(); load(idx + 1, true); });

    /* ---- 歌单面板 ---- */
    var listBtn = document.getElementById('mpListBtn');
    var listClose = document.getElementById('mpListClose');
    function openList(v) {
      if (!listEl) return;
      listEl.classList.toggle('open', v);
      if (listBtn) listBtn.classList.toggle('on', v);
    }
    if (listBtn) listBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openList(!listEl.classList.contains('open'));
    });
    if (listClose) listClose.addEventListener('click', function () { openList(false); });
    document.addEventListener('click', function (e) {
      if (listEl && listEl.classList.contains('open') && !listEl.contains(e.target) && !wrap.contains(e.target)) {
        openList(false);
      }
      if (volBox && volBox.classList.contains('show') && !wrap.contains(e.target)) {
        volBox.classList.remove('show');
        var vb = document.getElementById('mpVolBtn');
        if (vb) vb.classList.remove('on');
      }
    });

    /* ---- 音量 ---- */
    var volBtn = document.getElementById('mpVolBtn');
    if (volBtn) volBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      volBox.classList.toggle('show');
      volBtn.classList.toggle('on', volBox.classList.contains('show'));
    });
    if (volRng) volRng.addEventListener('input', function () {
      audio.volume = Math.max(0, Math.min(1, Number(this.value) / 100));
      save();
    });
    if (bar) bar.addEventListener('click', function (e) {
      if (!audio.duration || !isFinite(audio.duration)) return;
      var r = bar.getBoundingClientRect();
      audio.currentTime = Math.max(0, Math.min(audio.duration, ((e.clientX - r.left) / r.width) * audio.duration));
    });

    /* ---- 拉歌单 ---- */
    var loaded = false;
    function loadSongs(autoplayAfter) {
      if (loaded) { if (autoplayAfter) load(idx, true); return; }
      loaded = true;
      fetch('/前台/背景音乐接口.php?type=list&_=' + Date.now(), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.success || !d.list || !d.list.length) {
            loaded = false;
            if (listBd) listBd.innerHTML = '<div class="loading">歌单为空，请在管理后台配置</div>';
            if (listTt) listTt.textContent = '未配置歌单';
            return;
          }
          if (Number(d.enabled) === 0) {
            var mpWrap = document.getElementById('mp');
            var mpListEl = document.getElementById('mpList');
            if (mpWrap) mpWrap.style.display = 'none';
            if (mpListEl) mpListEl.style.display = 'none';
            return;
          }

          // 服务端配置的默认音量（用户手动调过就以本地为准）
          if (!st && typeof d.volume === 'number') {
            audio.volume = Math.max(0, Math.min(1, d.volume / 100));
            if (volRng) volRng.value = String(d.volume);
          }

          songs = d.list;
          if (listTt) listTt.textContent = d.title || '播放列表';
          if (listCn) {
            var pvN = 0;
            songs.forEach(function (x) { if (Number(x.preview) === 1) pvN++; });
            listCn.textContent = songs.length + ' 首' + (pvN ? '（' + pvN + ' 试听）' : '');
          }

          var html = '';
          songs.forEach(function (s, i) {
            var badge = Number(s.preview) === 1
              ? '<span class="pv">试听</span>'
              : '';
            html += '<div class="it" data-i="' + i + '">' +
              '<span class="no">' + (i + 1) + '</span>' +
              '<span class="info"><span class="nm">' + esc(s.name) + badge + '</span>' +
              '<span class="ar">' + esc(s.artist || '未知歌手') + '</span></span>' +
              '<span class="eq"><i></i><i></i><i></i></span>' +
            '</div>';
          });
          if (listBd) listBd.innerHTML = html;

          if (st && typeof st.i === 'number' && st.i >= 0 && st.i < songs.length) idx = st.i;
          paint();

          var serverAuto = Number(d.autoplay) === 1;
          if (autoplayAfter || wantPlay || serverAuto) {
            load(idx, true);
          } else {
            audio.src = songs[idx].url;
            paint();
          }
        })
        .catch(function () {
          loaded = false;
          if (listBd) listBd.innerHTML = '<div class="loading">歌单加载失败，请稍后重试</div>';
        });
    }

    if (listBd) listBd.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('.it') : null;
      if (!it) return;
      var i = parseInt(it.getAttribute('data-i'), 10);
      if (isNaN(i)) return;
      wantPlay = true;
      load(i, true);
    });

    /* 首屏先把歌单抓下来（不自动播，避免被浏览器拦） */
    loadSongs(false);

    /* 有历史播放记录：首次交互后续播 */
    if (wantPlay) {
      var kick = function () {
        document.removeEventListener('click', kick);
        document.removeEventListener('touchstart', kick);
        if (!audio.paused || !songs.length) return;
        audio.play().then(function () { playing = true; paint(); }).catch(function () {});
      };
      document.addEventListener('click', kick, { once: true });
      document.addEventListener('touchstart', kick, { once: true });
    }
  })();

/* Floating controls: isolated from playback, playlist and lyric logic. */
(function () {
  'use strict';
  var el=document.getElementById('mp');
  if(!el || el.dataset.floatingReady) return;
  el.dataset.floatingReady='1';
  var disc=document.getElementById('mpDisc'),list=document.getElementById('mpList');
  var grip=document.createElement('button');
  grip.type='button';grip.className='mp-grip';grip.id='mpDrag';
  grip.title='拖动播放器（方向键微调）';grip.setAttribute('aria-label','拖动播放器，方向键移动');
  grip.innerHTML='<i class="fas fa-grip-vertical" aria-hidden="true"></i>';
  el.insertBefore(grip,disc);
  var fold=document.createElement('button');fold.type='button';fold.id='mpCollapse';
  fold.title='收起为悬浮球';fold.setAttribute('aria-label','收起播放器');
  fold.innerHTML='<i class="fas fa-minus" aria-hidden="true"></i>';
  el.querySelector('.acts').appendChild(fold);
  var KEY='jy_music_float_v1',state={},drag=null,suppressUntil=0,positioned=false;
  try{state=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(e){}
  function viewport(){return {w:document.documentElement.clientWidth,h:window.innerHeight};}
  function clamp(x,y){
    var v=viewport(),r=el.getBoundingClientRect(),pad=8;
    return {x:Math.max(pad,Math.min(x,Math.max(pad,v.w-r.width-pad))),y:Math.max(pad,Math.min(y,Math.max(pad,v.h-r.height-pad)))};
  }
  function panel(){
    if(!list)return;
    var r=el.getBoundingClientRect(),v=viewport(),width=Math.min(360,v.w-16);
    list.style.width=width+'px';list.style.right='auto';
    list.style.left=Math.max(8,Math.min(r.left,v.w-width-8))+'px';
    list.style.maxHeight=Math.min(460,Math.max(120,v.h-100))+'px';
    var h=list.getBoundingClientRect().height;
    var above=r.top-10-h;
    list.style.bottom='auto';
    list.style.top=Math.max(8,Math.min(above>=8?above:r.bottom+10,v.h-h-8))+'px';
    var volume=document.getElementById('mpVol');
    if(volume){volume.style.bottom=r.top>75?'calc(100% + 9px)':'auto';volume.style.top=r.top>75?'auto':'calc(100% + 9px)';}
  }
  function place(x,y){var p=clamp(x,y);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.right='auto';el.style.bottom='auto';positioned=true;panel();}
  function save(){
    var r=el.getBoundingClientRect(),v=viewport();
    state={collapsed:el.classList.contains('is-collapsed'),x:r.left/Math.max(1,v.w-r.width),y:r.top/Math.max(1,v.h-r.height)};
    try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
  }
  function collapsed(on){
    var r=el.getBoundingClientRect();
    el.classList.toggle('is-collapsed',on);
    disc.setAttribute('aria-label',on?'展开音乐播放器；按住拖动':'播放 / 暂停');
    disc.title=on?'点击展开，按住拖动':'播放 / 暂停';
    if(on){
      list.classList.remove('open');document.getElementById('mpVol').classList.remove('show');
      document.getElementById('mpListBtn').classList.remove('on');
      document.getElementById('mpVolBtn').classList.remove('on');
    }
    place(r.left,r.top);save();
    if(on)disc.focus({preventScroll:true});
  }
  el.classList.toggle('is-collapsed',state.collapsed===true);
  disc.setAttribute('aria-label',state.collapsed?'展开音乐播放器；按住拖动':'播放 / 暂停');
  requestAnimationFrame(function(){
    var v=viewport(),r=el.getBoundingClientRect();
    if(Number.isFinite(state.x)&&Number.isFinite(state.y))place(state.x*(v.w-r.width),state.y*(v.h-r.height));
    else place(r.left,r.top);
  });
  fold.addEventListener('click',function(e){e.stopPropagation();collapsed(true);});
  el.addEventListener('click',function(e){
    if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();return;}
    if(el.classList.contains('is-collapsed')){e.preventDefault();e.stopImmediatePropagation();collapsed(false);}
  },true);
  el.addEventListener('keydown',function(e){
    if(el.classList.contains('is-collapsed')&&(e.key==='Enter'||e.key===' ')){
      e.preventDefault();e.stopImmediatePropagation();collapsed(false);
    }
  },true);
  el.addEventListener('pointerdown',function(e){
    if(e.button!==0 || !e.isPrimary)return;
    if(!el.classList.contains('is-collapsed')&&!e.target.closest('.mp-grip'))return;
    var r=el.getBoundingClientRect();drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,x:r.left,y:r.top,moved:false};
    try{el.setPointerCapture(e.pointerId);}catch(ignore){}
    e.preventDefault();
  });
  el.addEventListener('pointermove',function(e){
    if(!drag||drag.id!==e.pointerId)return;
    var dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
    if(!drag.moved&&Math.hypot(dx,dy)<6)return;
    drag.moved=true;el.classList.add('is-dragging');place(drag.x+dx,drag.y+dy);e.preventDefault();
  });
  function finish(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.moved){suppressUntil=Date.now()+450;save();}
    drag=null;el.classList.remove('is-dragging');
    try{el.releasePointerCapture(e.pointerId);}catch(ignore){}
  }
  el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
  grip.addEventListener('keydown',function(e){
    var delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];
    if(!delta)return;e.preventDefault();e.stopPropagation();var r=el.getBoundingClientRect();place(r.left+delta[0],r.top+delta[1]);save();
  });
  window.addEventListener('resize',function(){
    if(!positioned)return;var v=viewport(),r=el.getBoundingClientRect();
    place((Number.isFinite(state.x)?state.x:0)*(v.w-r.width),(Number.isFinite(state.y)?state.y:1)*(v.h-r.height));
  });
  if(window.visualViewport)window.visualViewport.addEventListener('resize',function(){var r=el.getBoundingClientRect();place(r.left,r.top);});
  new MutationObserver(panel).observe(list,{attributes:true,attributeFilter:['class']});
})();
})();
