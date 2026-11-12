/* 极验云 · 流量趋势图（仪表盘「今日流量」）
 * 依赖：echarts（页面已加载）
 * 数据：EnvGateway action=update_flow_series → UserFlow::series()
 *   { buckets:[{t,label,total,regions:{地区:次数}}], regions:[...], total, unresolved, max, window }
 *
 * 用法：
 *   var api = JYTrend.mount(document.getElementById('流量趋势图'));
 *   api.loading(true);
 *   api.update(series);
 */
(function (global) {
    'use strict';

    var CSS_ID = 'jyTrendCss';
    var CSS = [
        '.jy-flow-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:2px 2px 6px}',
        '.jy-flow-range{display:inline-flex;background:rgba(120,120,128,.10);border-radius:10px;padding:2px;gap:2px}',
        '.jy-flow-range button{appearance:none;border:0;background:transparent;color:#6e6e73;font:600 12px/1 -apple-system,"PingFang SC","Microsoft YaHei",sans-serif;padding:7px 11px;border-radius:8px;cursor:pointer;transition:background .16s ease,color .16s ease,box-shadow .16s ease}',
        '.jy-flow-range button:hover{color:#1d1d1f}',
        '.jy-flow-range button.on{background:#fff;color:#1d1d1f;box-shadow:0 1px 4px rgba(0,0,0,.10)}',
        '.jy-flow-kpi{display:flex;gap:26px;align-items:flex-end}',
        '.jy-flow-kpi-item.primary b{font-size:32px;letter-spacing:-1px;line-height:1}',
        '.jy-flow-kpi-item.primary i{margin-top:2px}',
        '.jy-flow-kpi-item{display:flex;flex-direction:column;gap:1px;line-height:1.15}',
        '.jy-flow-kpi-item b{font-size:20px;font-weight:700;letter-spacing:-.4px;color:#1d1d1f;font-variant-numeric:tabular-nums}',
        '.jy-flow-kpi-item i{font-style:normal;font-size:10.5px;color:#8e8e93}',
        '.jy-flow-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:6px;color:#a1a1a6;font-size:12.5px}',
        '.jy-trend-host{border-radius:14px}',
        '.jy-flow-regions{display:flex;flex-wrap:wrap;gap:7px;align-items:center;padding:10px 6px 2px}',
        '.jy-flow-regions>em{font-style:normal;font-size:11px;color:#8e8e93;margin-right:2px}',
        '.jy-flow-regions span{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;background:rgba(120,120,128,.09);font-size:11px;color:#6e6e73}',
        '.jy-flow-regions span b{font-weight:600;color:#1d1d1f;font-variant-numeric:tabular-nums}',
        'html[data-jy-theme="dark"] .jy-flow-regions span{background:rgba(255,255,255,.08);color:#a1a1a6}',
        'html[data-jy-theme="dark"] .jy-flow-regions span b{color:#f5f5f7}',
        
        '.jy-flow-empty b{font-size:15px;color:#6e6e73;font-weight:600}',
        'html[data-jy-theme="dark"] .jy-flow-range{background:rgba(255,255,255,.08)}',
        'html[data-jy-theme="dark"] .jy-flow-range button{color:#a1a1a6}',
        'html[data-jy-theme="dark"] .jy-flow-range button.on{background:#2c2c2e;color:#f5f5f7;box-shadow:0 1px 4px rgba(0,0,0,.4)}',
        'html[data-jy-theme="dark"] .jy-flow-kpi-item b{color:#f5f5f7}',
        'html[data-jy-theme="dark"] .jy-flow-kpi-item i{color:#8e8e93}'
    ].join('\n');

    var PALETTE = ['#0a84ff', '#32ade6', '#5e5ce6', '#30b0c7', '#ff9f0a', '#ff375f', '#af52de', '#8e8e93'];

    function injectCss() {
        if (document.getElementById(CSS_ID)) return;
        var st = document.createElement('style');
        st.id = CSS_ID;
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    function fmt(n) {
        n = Number(n) || 0;
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
        if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
        return String(n);
    }

    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function option(data) {
        var buckets = data.buckets || [];
        var regions = data.regions || [];
        var dark = document.documentElement.getAttribute('data-jy-theme') === 'dark'
            || document.documentElement.getAttribute('data-theme') === 'dark';
        var text = dark ? '#f5f5f7' : '#1d1d1f';
        var sub = '#8e8e93';
        var grid = dark ? 'rgba(255,255,255,.07)' : 'rgba(17,24,39,.06)';
        var accent = dark ? '#4da3ff' : '#0a84ff';

        var totals = buckets.map(function (b) { return Number(b.total) || 0; });
        var maxV = totals.length ? Math.max.apply(null, totals) : 0;
        var sum = 0;
        totals.forEach(function (v) { sum += v; });
        var avg = totals.length ? Math.round(sum / totals.length) : 0;

        var line = {
            name: '总请求量',
            type: 'line',
            smooth: 0.38,
            clip: false,
            showSymbol: false,
            symbol: 'circle',
            symbolSize: 9,
            lineStyle: { width: 2.8, color: accent },
            itemStyle: { color: accent, borderColor: dark ? '#1c1c1e' : '#fff', borderWidth: 2 },
            areaStyle: {
                color: new global.echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: dark ? 'rgba(77,163,255,.30)' : 'rgba(10,132,255,.24)' },
                    { offset: 0.6, color: dark ? 'rgba(77,163,255,.08)' : 'rgba(10,132,255,.06)' },
                    { offset: 1, color: 'rgba(10,132,255,0)' }
                ])
            },
            emphasis: { focus: 'series', scale: 1.4 },
            data: totals
        };

        if (maxV > 0) {
            line.markPoint = {
                symbol: 'circle',
                symbolSize: 8,
                silent: true,
                itemStyle: { color: accent, borderColor: dark ? '#1c1c1e' : '#fff', borderWidth: 2 },
                label: {
                    show: true, position: 'top', distance: 8, color: accent,
                    fontSize: 10.5, fontWeight: 650, formatter: function (p) { return fmt(p.value); }
                },
                data: [{ type: 'max', name: '峰值' }]
            };
            line.markLine = {
                silent: true,
                symbol: 'none',
                lineStyle: { color: dark ? 'rgba(255,255,255,.16)' : 'rgba(17,24,39,.14)', type: 'dashed', width: 1 },
                label: {
                    formatter: '平均 ' + fmt(avg), position: 'insideEndTop',
                    color: sub, fontSize: 10
                },
                data: [{ yAxis: avg }]
            };
        }

        return {
            color: [accent],
            animationDuration: 1000,
            animationDurationUpdate: 520,
            animationEasing: 'cubicOut',
            animationEasingUpdate: 'cubicOut',
            grid: { left: 6, right: 18, top: 26, bottom: 6, containLabel: true },
            tooltip: {
                trigger: 'axis',
                confine: true,
                backgroundColor: dark ? 'rgba(28,28,30,.97)' : 'rgba(255,255,255,.98)',
                borderWidth: 0,
                padding: [11, 13],
                extraCssText: 'border-radius:13px;box-shadow:0 10px 34px rgba(0,0,0,.18);backdrop-filter:blur(20px)',
                textStyle: { color: text, fontSize: 12 },
                axisPointer: {
                    type: 'line',
                    lineStyle: { color: dark ? 'rgba(255,255,255,.26)' : 'rgba(17,24,39,.22)', width: 1, type: 'dashed' },
                    label: { show: false }
                },
                formatter: function (ps) {
                    if (!ps || !ps.length) return '';
                    var b = buckets[ps[0].dataIndex] || {};
                    var rows = [];
                    var enc = b.regions || {};
                    regions.forEach(function (name, i) {
                        var v = Number(enc[name]) || 0;
                        if (v > 0) rows.push({ name: name, value: v, color: PALETTE[i % PALETTE.length] });
                    });
                    rows.sort(function (x, y) { return y.value - x.value; });
                    var h = '<div style="font-weight:650;margin-bottom:7px">' + esc(b.label || '') +
                        ' <span style="color:' + sub + ';font-weight:500">共 ' + fmt(b.total) + ' 次</span></div>';
                    rows.slice(0, 8).forEach(function (r) {
                        h += '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;min-width:170px">' +
                            '<span style="width:7px;height:7px;border-radius:50%;background:' + r.color + '"></span>' +
                            '<span style="flex:1;color:' + (dark ? '#d1d1d6' : '#3a3a3c') + '">' + esc(r.name) + '</span>' +
                            '<b style="font-variant-numeric:tabular-nums">' + fmt(r.value) + '</b></div>';
                    });
                    return h;
                }
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: buckets.map(function (b) { return b.label; }),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: {
                    color: sub, fontSize: 10.5, margin: 12,
                    interval: buckets.length > 14 ? Math.ceil(buckets.length / 7) : 'auto'
                }
            },
            yAxis: {
                type: 'value',
                minInterval: 1,
                splitNumber: 4,
                axisLabel: { show: false },
                splitLine: { lineStyle: { color: grid, type: 'dashed' } }
            },
            series: [line]
        };
    }

    function renderRegions(data) {
        var totals = data.region_totals || {};
        var order = (data.regions || []).filter(function (r) { return r !== '未知'; });
        var names = Object.keys(totals).filter(function (n) { return n !== '未知' && Number(totals[n]) > 0; });
        names.sort(function (a, b) { return Number(totals[b]) - Number(totals[a]); });
        names = names.slice(0, 5);
        if (!names.length) return '';
        var h = '<em>主要地区</em>';
        names.forEach(function (n) {
            var i = order.indexOf(n);
            var c = PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
            h += '<span><i style="width:6px;height:6px;border-radius:50%;background:' + c + '"></i>' +
                esc(n) + ' <b>' + fmt(totals[n]) + '</b></span>';
        });
        var unknown = Number(totals['未知']) || 0;
        if (unknown > 0) h += '<span><i style="width:6px;height:6px;border-radius:50%;background:#c7c7cc"></i>未知 <b>' + fmt(unknown) + '</b></span>';
        return h;
    }

    function mount(el) {
        injectCss();
        if (!el) return null;
        if (!global.echarts) {
            el.innerHTML = '<div class="jy-flow-empty"><b>图表组件未加载</b><span>请刷新页面</span></div>';
            return null;
        }

        el.style.position = 'relative';
        el.classList.add('jy-trend-host');
        var chart = global.echarts.init(el, null, { renderer: 'canvas' });
        var last = null;

        /* 空态用独立覆盖层，绝不能 el.innerHTML=...：那会把 ECharts 的 canvas 一起冲掉，
           之后再有数据时 setOption 画在一个已脱离文档的 canvas 上 → 卡片变白片 */
        var empty = document.createElement('div');
        empty.className = 'jy-flow-empty';
        empty.style.position = 'absolute';
        empty.style.inset = '0';
        empty.style.background = 'transparent';
        empty.style.pointerEvents = 'none';
        empty.style.display = 'none';
        el.appendChild(empty);

        var regionRow = document.createElement('div');
        regionRow.className = 'jy-flow-regions';
        regionRow.style.display = 'none';
        if (el.parentNode) el.parentNode.insertBefore(regionRow, el.nextSibling);

        function resize() { try { chart.resize(); } catch (e) { } }
        global.addEventListener('resize', resize);

        var api = {
            update: function (data) {
                last = data;

                if (!data || !data.buckets || !data.buckets.length || !Number(data.total)) {
                    chart.clear();
                    empty.innerHTML = '<b>这个时间段还没有流量</b><span>换个时间段，或等第一条请求进来</span>';
                    empty.style.display = 'flex';
                    regionRow.style.display = 'none';
                    return;
                }
                empty.style.display = 'none';
                regionRow.innerHTML = renderRegions(data);
                regionRow.style.display = 'flex';
                chart.resize();
                chart.setOption(option(data), true);
            },
            loading: function (on) {
                if (on) {
                    empty.style.display = 'none';
                    chart.showLoading('default', {
                        text: '', color: '#0a84ff', maskColor: 'rgba(0,0,0,0)', spinnerRadius: 9, lineWidth: 2
                    });
                } else {
                    chart.hideLoading();
                }
            },
            resize: resize,
            data: function () { return last; },
            chart: chart,
            destroy: function () {
                global.removeEventListener('resize', resize);
                chart.dispose();
            }
        };
        return api;
    }

    global.JYTrend = { mount: mount, fmt: fmt };
})(window);
