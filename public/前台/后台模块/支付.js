//极验云 - JiYan
//支付.js · 第五轮重写：易支付在线充值 + 余额转账（真实后端）

let 支付_充值金额 = null;
let 支付_方式 = 'alipay';
let 支付_配置 = null;
let 支付_轮询定时器 = null;
let 支付_当前订单 = '';

/* ==================== 配置拉取 ==================== */

async function 支付_获取配置(强制刷新) {
    if (支付_配置 && !强制刷新) return 支付_配置;
    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'get_pay_config',
            password: 开发者安全密码
        });
        if (r && r.success) {
            支付_配置 = r.data || {};
            return 支付_配置;
        }
    } catch (e) {
        console.warn('获取支付配置失败', e);
    }
    支付_配置 = { enabled: 0, ready: 0, min: 1, max: 100000, paytypes: [] };
    return 支付_配置;
}

/* ==================== 充值弹窗 ==================== */

async function 充值账号() {
    if (!开发者UID) return;
    if (document.getElementById('rechargeModal')) return;

    const cfg = await 支付_获取配置(true);
    const 可用 = Number(cfg.ready) === 1 && Number(cfg.enabled) === 1 && Array.isArray(cfg.paytypes) && cfg.paytypes.length > 0;
    const 最小 = Number(cfg.min) || 1;
    const 最大 = Number(cfg.max) || 100000;
    const 快捷金额 = [1, 5, 10, 20, 50, 100];

    const modal = document.createElement('div');
    modal.id = 'rechargeModal';
    modal.className = '弹窗遮罩';
    modal.innerHTML = `
        <div class="弹窗背景">
            <div class="弹窗头部">
                <div class="弹窗头部文字">
                    <i class="fas fa-wallet" style="color:#667eea;"></i>
                    <h4>账户充值</h4>
                </div>
                <button onclick="closeRechargeModal()" class="弹窗头部关闭按钮">&times;</button>
            </div>
            <div class="弹窗内部">
                <div style="display:flex;gap:0;margin-bottom:15px;border-bottom:2px solid #eee;">
                    <button id="tab_online" onclick="支付_切换标签('online')" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#667eea;border-bottom:2px solid #667eea;margin-bottom:-2px;cursor:pointer;">在线支付</button>
                    <button id="tab_records" onclick="支付_切换标签('records')" style="flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:#999;border-bottom:2px solid transparent;margin-bottom:-2px;cursor:pointer;">充值记录</button>
                </div>
                <div id="recharge_online_area">
                    ${可用 ? `
                    <div style="margin-bottom:18px;">
                        <div style="font-size:14px;font-weight:500;color:#333;margin-bottom:10px;">充值金额（${最小} ~ ${最大} 元）</div>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px;">
                            ${快捷金额.map(v => `
                                <button onclick="支付_选金额(${v})" class="金额按钮" data-amount="${v}"
                                    style="height:36px;border:1px solid #ddd;border-radius:8px;background:#fff;font-size:15px;font-weight:500;cursor:pointer;line-height:34px;">¥${v}</button>
                            `).join('')}
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <span style="font-size:14px;color:#666;">自定义：</span>
                            <div style="flex:1;position:relative;">
                                <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#999;">¥</span>
                                <input type="number" id="customAmount" placeholder="请输入金额" min="${最小}" step="0.01"
                                       oninput="支付_自定义金额(this)"
                                       style="width:100%;padding:9px 9px 9px 28px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;">
                            </div>
                        </div>
                    </div>
                    <div>
                        <div style="font-size:14px;font-weight:500;color:#333;margin-bottom:10px;">支付方式</div>
                        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
                            ${cfg.paytypes.map(p => `
                                <button onclick="支付_选方式('${p.code}')" class="支付方式按钮" data-pay="${p.code}"
                                    style="border:1px solid #ddd;border-radius:8px;padding:11px;background:#fff;cursor:pointer;font-size:14px;color:#333;">${p.name}</button>
                            `).join('')}
                        </div>
                    </div>
                    ` : `
                    <div style="text-align:center;padding:28px 12px;">
                        <i class="fas fa-tools" style="font-size:38px;color:#cbd5e1;margin-bottom:14px;"></i>
                        <div style="font-size:14px;color:#64748b;line-height:1.8;">
                            在线充值暂未开放<br>
                            <span style="font-size:13px;color:#94a3b8;">请联系管理员在「系统设置 → 支付配置」中完成易支付参数配置</span>
                        </div>
                    </div>
                    `}
                </div>
                <div id="recharge_records_area" style="display:none;">
                    <div id="rechargeRecordsList" style="max-height:300px;overflow-y:auto;">
                        <div style="text-align:center;padding:30px;color:#94a3b8;font-size:14px;">加载中...</div>
                    </div>
                </div>
            </div>
            <div class="弹窗底部">
                <button onclick="closeRechargeModal()" style="padding:8px 18px;background:#f8f9fa;color:#666;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:14px;">关闭</button>
                ${可用 ? `<button onclick="支付_发起充值()" id="rechargeSubmitBtn" style="padding:8px 20px;background:#667eea;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px;font-weight:600;">立即支付</button>` : ''}
            </div>
        </div>`;
    document.body.appendChild(modal);

    if (可用) {
        支付_选金额(快捷金额.includes(最小) ? 最小 : 快捷金额[0]);
        支付_选方式(cfg.paytypes[0].code);
    }

    modal.addEventListener('click', ev => { if (ev.target === modal) closeRechargeModal(); });
}

function 支付_切换标签(标签) {
    const on = document.getElementById('recharge_online_area');
    const rec = document.getElementById('recharge_records_area');
    const t1 = document.getElementById('tab_online');
    const t2 = document.getElementById('tab_records');
    const 提交 = document.getElementById('rechargeSubmitBtn');
    if (!on || !rec || !t1 || !t2) return;
    if (标签 === 'records') {
        on.style.display = 'none'; rec.style.display = 'block';
        t2.style.color = '#667eea'; t2.style.borderBottom = '2px solid #667eea';
        t1.style.color = '#999'; t1.style.borderBottom = '2px solid transparent';
        if (提交) 提交.style.display = 'none';
        支付_加载充值记录();
    } else {
        on.style.display = 'block'; rec.style.display = 'none';
        t1.style.color = '#667eea'; t1.style.borderBottom = '2px solid #667eea';
        t2.style.color = '#999'; t2.style.borderBottom = '2px solid transparent';
        if (提交) 提交.style.display = 'inline-block';
    }
}

function 支付_选金额(金额) {
    document.querySelectorAll('.金额按钮').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#333';
        b.style.border = '1px solid #ddd';
    });
    const 目标 = Array.from(document.querySelectorAll('.金额按钮')).find(b => b.dataset.amount == 金额);
    if (目标) {
        目标.style.background = '#667eea';
        目标.style.color = '#fff';
        目标.style.border = '1px solid #4f46e5';
    }
    const 自定义 = document.getElementById('customAmount');
    if (自定义) 自定义.value = '';
    支付_充值金额 = 金额;
}

function 支付_自定义金额(input) {
    let v = parseFloat(input.value);
    document.querySelectorAll('.金额按钮').forEach(b => {
        b.style.background = '#fff';
        b.style.color = '#333';
        b.style.border = '1px solid #ddd';
    });
    if (isNaN(v) || v <= 0) { 支付_充值金额 = null; return; }
    const 最大 = Number((支付_配置 || {}).max) || 100000;
    if (v > 最大) { v = 最大; input.value = v; }
    v = Math.round(v * 100) / 100;
    input.value = v;
    支付_充值金额 = v;
}

function 支付_选方式(code) {
    document.querySelectorAll('.支付方式按钮').forEach(b => {
        b.style.background = '#fff';
        b.style.border = '1px solid #ddd';
        b.style.color = '#333';
    });
    const 目标 = Array.from(document.querySelectorAll('.支付方式按钮')).find(b => b.dataset.pay === code);
    if (目标) {
        目标.style.background = '#eef2ff';
        目标.style.border = '1px solid #4f46e5';
        目标.style.color = '#4f46e5';
    }
    支付_方式 = code;
}

async function 支付_发起充值() {
    const 金额 = 支付_充值金额;
    const cfg = 支付_配置 || {};
    const 最小 = Number(cfg.min) || 1;
    const 最大 = Number(cfg.max) || 100000;
    if (!金额 || 金额 <= 0) { alert('请选择或输入充值金额'); return; }
    if (金额 < 最小) { alert('单笔充值不能小于 ' + 最小 + ' 元'); return; }
    if (金额 > 最大) { alert('单笔充值不能超过 ' + 最大 + ' 元'); return; }
    if (!支付_方式) { alert('请选择支付方式'); return; }

    const btn = document.getElementById('rechargeSubmitBtn');
    const 原 = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 下单中...'; }

    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'create_recharge',
            password: 开发者安全密码,
            amount: 金额,
            paytype: 支付_方式
        });
        if (!r || !r.success) {
            alert('下单失败：' + ((r && r.message) || '未知错误'));
            return;
        }
        const url = r.data && r.data.pay_url;
        if (!url) { alert('支付网关未返回收银台地址'); return; }
        支付_当前订单 = (r.data && r.data.order_no) || '';
        window.open(url, '_blank');
        支付_开始轮询(支付_当前订单, 金额);
    } catch (e) {
        alert('请求失败：' + e.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = 原 || '立即支付'; }
    }
}

/** 轮询查单：每 3 秒一次，最多 100 次（5 分钟） */
function 支付_开始轮询(订单号, 金额) {
    if (!订单号) return;
    if (支付_轮询定时器) { clearInterval(支付_轮询定时器); 支付_轮询定时器 = null; }
    let 次数 = 0;
    const 提示 = document.createElement('div');
    提示.id = 'rechargePollingTip';
    提示.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99999;background:#1e293b;color:#e2e8f0;padding:14px 18px;border-radius:12px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.35);max-width:280px;line-height:1.7;';
    提示.innerHTML = `等待支付···<br><span style="color:#94a3b8;font-size:12px;">订单号 ${订单号}<br>金额 ¥${Number(金额).toFixed(2)}</span><br><span style="color:#94a3b8;font-size:12px;">付款完成后本提示会自动消失</span>`;
    document.body.appendChild(提示);

    const 清理 = () => {
        if (支付_轮询定时器) { clearInterval(支付_轮询定时器); 支付_轮询定时器 = null; }
        const el = document.getElementById('rechargePollingTip');
        if (el) el.remove();
    };

    支付_轮询定时器 = setInterval(async () => {
        次数++;
        if (次数 > 100) { 清理(); return; }
        try {
            const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
                action: 'query_recharge',
                password: 开发者安全密码,
                order_no: 订单号
            });
            if (r && r.success && r.data && r.data.status === 'paid') {
                清理();
                if (r.data.balance !== undefined) 支付_刷新余额显示(r.data.balance);
                alert('充值成功，¥' + Number(金额).toFixed(2) + ' 已到账');
                closeRechargeModal();
                if (typeof updateinfo === 'function') updateinfo();
            }
        } catch (e) { /* 网络抖动忽略，继续轮询 */ }
    }, 3000);
}

function 支付_刷新余额显示(余额) {
    // 千分位 + 固定两位小数，和 开发者信息.js 保持一致的口径
    const n = Number(余额);
    const 文本 = isNaN(n) ? ('¥' + 余额)
        : '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const a = document.getElementById('balanceDisplay');
    if (a) { a.textContent = 文本; a.title = '账户余额 ' + 文本 + '（点击充值）'; }
    const b = document.getElementById('balanceField');
    if (b) b.textContent = (isNaN(n) ? 余额 : n.toFixed(2)) + ' 元';
}

async function 支付_加载充值记录() {
    const box = document.getElementById('rechargeRecordsList');
    if (!box) return;
    box.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;font-size:14px;">加载中...</div>';
    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'recharge_records',
            password: 开发者安全密码,
            limit: 20
        });
        if (!r || !r.success) { box.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;font-size:14px;">加载失败</div>'; return; }
        const list = (r.data && r.data.list) || [];
        if (!list.length) {
            box.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">暂无充值记录</div>';
            return;
        }
        box.innerHTML = list.map(it => {
            const 成功 = it.status === 'paid';
            const 色 = 成功 ? '#16a34a' : (it.status === 'pending' ? '#f59e0b' : '#94a3b8');
            return `<div style="padding:12px;border:1px solid #eef2f7;border-radius:10px;margin-bottom:10px;font-size:13px;background:#fff;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                    <span style="color:#0f172a;font-weight:600;">¥${it.amount}</span>
                    <span style="color:${色};font-weight:600;">${it.status_cn}</span>
                </div>
                <div style="color:#64748b;font-size:12px;line-height:1.7;">
                    订单 ${it.order_no}<br>
                    ${it.pay_name} · ${it.created_at}${it.paid_at ? '<br>到账 ' + it.paid_at : ''}
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        box.innerHTML = '<div style="text-align:center;padding:30px;color:#ef4444;font-size:14px;">网络错误</div>';
    }
}

function closeRechargeModal() {
    if (支付_轮询定时器) { clearInterval(支付_轮询定时器); 支付_轮询定时器 = null; }
    const tip = document.getElementById('rechargePollingTip');
    if (tip) tip.remove();
    const m = document.getElementById('rechargeModal');
    if (m) m.remove();
}

/* ==================== 余额转账 ==================== */

let 支付_转账状态 = null;
let 支付_转账打开中 = false;
let 支付_对方信息 = null;

async function 支付_转账() {
    if (!开发者UID || 支付_转账打开中) return;
    if (document.getElementById('transferModal')) return;
    支付_转账打开中 = true;
    等待动画('正在获取转账与收款信息...');
    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'get_transfer_key',
            password: 开发者安全密码
        });
        if (r && r.success) {
            支付_打开转账弹窗(r.data || {});
        } else {
            alert('获取失败：' + ((r && r.message) || '未知错误'));
        }
    } catch (e) {
        alert('请求失败：' + (e.message || '网络错误'));
    } finally {
        删除等待动画();
        支付_转账打开中 = false;
    }
}

function 支付_打开转账弹窗(data) {
    // 已有弹窗必须经撤销流程关闭，不能直接移除并丢失收款码所有者凭据。
    if (document.getElementById('transferModal') || 支付_转账状态) return;
    支付_对方信息 = null;
    const modal = document.createElement('div');
    modal.id = 'transferModal';
    modal.className = '弹窗遮罩';
    modal.innerHTML = '<style>'
        + '#transferModal{padding:12px;overflow:auto;}'
        + '#transferModal *,#transferModal *::before,#transferModal *::after{box-sizing:border-box;}'
        + '#transferModal>.弹窗背景{width:100%;max-width:560px;min-width:0;max-height:90vh;max-height:90dvh;display:flex;flex-direction:column;overflow:hidden;}'
        + '#transferModal>.弹窗背景>.弹窗头部,#transferModal>.弹窗背景>.弹窗底部{width:100%;min-width:0;flex-shrink:0;}'
        + '#transferModal>.弹窗背景>.弹窗内部{display:block;width:100%;max-width:none;min-width:0;min-height:0;max-height:none;flex:1 1 auto;overflow-y:auto;overflow-x:hidden;text-align:left;overscroll-behavior:contain;}'
        + '#transferModal .弹窗内部>div{width:100%;min-width:0;}'
        + '#transferModal .弹窗底部{flex-wrap:wrap;}'
        + '@media(max-width:600px){#transferModal>.弹窗背景>.弹窗内部{padding:10px 14px;}#transferModal .弹窗底部{padding-right:14px;padding-left:14px;}}'
        + '</style><div class="弹窗背景">'
        + '<div class="弹窗头部"><div class="弹窗头部文字">'
        + '<i class="fas fa-exchange-alt" style="color:#16a34a;"></i><h4>转账与收款</h4>'
        + '</div><button data-transfer-close onclick="支付_关闭转账()" class="弹窗头部关闭按钮" aria-label="关闭">&times;</button></div>'
        + '<div class="弹窗内部" style="text-align:left;overflow-y:auto;min-height:0;">'
        + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:14px;">'
        + '<div style="font-size:12px;color:#15803d;margin-bottom:6px;">账户余额</div>'
        + '<div id="transferBalanceInfo" style="font-size:12px;color:#15803d;line-height:1.8;"></div></div>'
        + '<div style="display:flex;gap:0;margin-bottom:14px;border-bottom:2px solid #eee;">'
        + '<button id="transferTabReceive" onclick="支付_切换转账标签(\'receive\')" style="flex:1;padding:10px 6px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;">收款二维码</button>'
        + '<button id="transferTabNew" onclick="支付_切换转账标签(\'new\')" style="flex:1;padding:10px 6px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;">扫码转账</button>'
        + '<button id="transferTabRecords" onclick="支付_切换转账标签(\'records\')" style="flex:1;padding:10px 6px;border:none;background:none;font-size:13px;font-weight:600;cursor:pointer;">转账记录 / 待收款</button></div>'
        + '<div id="transferNotice" role="status" aria-live="polite" style="display:none;font-size:13px;line-height:1.7;margin-bottom:12px;overflow-wrap:anywhere;"></div>'
        + '<div id="transferReceiveArea" style="display:none;text-align:center;">'
        + '<p style="font-size:13px;color:#64748b;line-height:1.8;">仅在此页面前台展示时有效，最长5分钟。离开收款视图或切到后台会撤销；保存的截图也会随租期失效。</p>'
        + '<div id="transferQRFrame" style="position:relative;margin:12px auto;width:260px;max-width:100%;aspect-ratio:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">'
        + '<canvas id="transferQRCanvas" aria-label="临时收款二维码" style="display:none;width:100%;height:100%;"></canvas>'
        + '<div id="transferQRCover" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;background:#f8fafc;color:#64748b;font-size:14px;line-height:1.8;">点击下方按钮生成临时收款二维码</div></div>'
        + '<div id="transferQRTime" aria-live="polite" style="font-size:13px;color:#15803d;min-height:24px;margin-bottom:10px;"></div>'
        + '<button id="transferQRCreate" onclick="支付_生成收款码()" style="padding:10px 18px;border:0;border-radius:12px;background:#16a34a;color:white;cursor:pointer;"><i class="fas fa-qrcode"></i> 生成收款二维码</button> '
        + '<button id="transferQRRevoke" onclick="支付_重试撤销收款码()" style="display:none;padding:10px 14px;border:1px solid #cbd5e1;border-radius:12px;background:white;color:#475569;cursor:pointer;">撤销二维码 / 重试</button></div>'
        + '<div id="transferNewArea" style="display:none;">'
        + '<div id="transferDisabledTip" style="display:none;padding:14px 0;color:#64748b;font-size:13px;line-height:1.8;">当前暂停发起新转账，待收款仍可确认或拒收，已发起的待确认款仍可撤销。</div>'
        + '<div id="transferNewForm">'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'
        + '<button id="transferCameraBtn" onclick="支付_开始扫码()" style="padding:9px 13px;border:0;border-radius:10px;background:#4f46e5;color:white;cursor:pointer;"><i class="fas fa-camera"></i> 摄像头扫码</button>'
        + '<button id="transferCameraStop" onclick="支付_停止扫码(支付_转账状态)" style="padding:9px 13px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;">停止摄像头</button>'
        + '<label style="padding:9px 13px;border:1px solid #cbd5e1;border-radius:10px;background:white;cursor:pointer;font-size:13px;"><i class="fas fa-image"></i> 上传二维码图片<input id="transferQRFile" type="file" accept="image/*" onchange="支付_识别图片(this)" style="display:none;"></label></div>'
        + '<div id="transferScanStatus" role="status" style="font-size:12px;color:#64748b;line-height:1.8;margin-bottom:10px;">扫描本系统临时收款二维码后核对收款方，输入金额并确认才会转账。</div>'
        + '<video id="transferScanVideo" muted playsinline style="display:none;width:100%;max-height:260px;object-fit:cover;border-radius:10px;background:#0f172a;margin-bottom:12px;"></video>'
        + '<div id="transferTargetInfo" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px;font-size:13px;color:#334155;line-height:1.9;overflow-wrap:anywhere;"></div>'
        + '<div id="transferAmountBox" style="display:none;margin-bottom:6px;">'
        + '<label for="transferAmount" style="display:block;font-size:13px;color:#334155;margin-bottom:6px;">转账金额</label>'
        + '<div style="position:relative;"><span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;">¥</span>'
        + '<input type="number" id="transferAmount" step="0.01" placeholder="请输入金额" style="width:100%;padding:11px 12px 11px 28px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;outline:none;box-sizing:border-box;"></div></div>'
        + '<div id="transferLimitInfo" style="font-size:12px;color:#64748b;margin-top:10px;line-height:1.8;"></div>'
        + '<div style="font-size:12px;color:#64748b;margin-top:8px;line-height:1.8;">发起即扣除你的可转账余额并暂存，接收方确认后才到账；24小时未领取自动原路退回，拒收或撤销也会退回发送方。</div>'
        + '</div></div>'
        + '<div id="transferRecordsArea">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;"><div id="transferPendingSummary" style="font-size:12px;color:#475569;line-height:1.8;">正在查询待确认款项...</div>'
        + '<button id="transferRefreshBtn" onclick="支付_刷新转账记录()" style="flex-shrink:0;padding:7px 10px;border:1px solid #ddd;background:#fff;border-radius:8px;color:#475569;cursor:pointer;"><i class="fas fa-sync-alt"></i> 刷新</button></div>'
        + '<div id="transferRecordsList" style="font-size:13px;">加载中...</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap;">'
        + '<button id="transferPrevBtn" onclick="支付_加载转账记录(支付_转账状态.page - 1)" style="padding:7px 12px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">上一页</button>'
        + '<span id="transferPageInfo" style="font-size:12px;color:#64748b;"></span>'
        + '<button id="transferNextBtn" onclick="支付_加载转账记录(支付_转账状态.page + 1)" style="padding:7px 12px;border:1px solid #ddd;background:#fff;border-radius:8px;cursor:pointer;">下一页</button></div></div>'
        + '</div><div class="弹窗底部"><button data-transfer-close onclick="支付_关闭转账()" style="padding:8px 18px;background:#f8f9fa;color:#666;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:14px;">关闭</button>'
        + '<button id="transferSubmitBtn" onclick="支付_确认转账()" style="display:none;padding:8px 20px;background:#16a34a;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px;font-weight:600;">发起转账</button></div></div>';
    支付_转账状态 = {
        modal: modal, data: {}, enabled: false, page: 1, pages: 1, size: 20,
        records: new Map(), recordsRequest: 0, detailsRequest: 0, queryRequest: 0,
        queryPayload: '', queryClock: null, queryLoading: false, recordsLoading: false, recordsValid: false, busy: false, tab: 'records',
        serverTime: null, serverTimeTick: null, expiryTimer: null,
        qr: null, qrBusy: false, qrCreate: null, qrRevoke: null, qrGeneration: 0, qrTimer: null, leaving: false,
        scanGeneration: 0, stream: null, scanFrame: null, scanStarting: false, imageRequest: 0
    };
    document.body.appendChild(modal);
    modal.addEventListener('click', function (ev) { if (ev.target === modal) 支付_关闭转账(); });
    支付_更新转账资料(data);
    支付_切换转账标签('records');
    支付_加载转账记录(1);
}

function 支付_转账仍有效(状态) {
    return !!状态 && 支付_转账状态 === 状态 && document.getElementById('transferModal') === 状态.modal;
}

function 支付_转账到期时间(记录) {
    const 时间戳 = Number(记录.expires_at_ts);
    if (Number.isSafeInteger(时间戳) && 时间戳 > 0) return 时间戳 * 1000;
    const 文本 = String(记录.expires_at || '').trim();
    // 接口的 MySQL DATETIME 为北京时间，不能按浏览器所在时区解析。
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(文本)) return null;
    const 时间 = Date.parse(文本.replace(' ', 'T') + '+08:00');
    return Number.isFinite(时间) ? 时间 : null;
}

function 支付_转账时间显示(记录) {
    const 时间 = 支付_转账到期时间(记录);
    return 时间 == null ? String(记录.expires_at || '')
        : new Date(时间 + 8 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

function 支付_同步转账时间(状态, data) {
    const 时间戳 = Number(data.server_time_ts);
    状态.serverTime = Number.isSafeInteger(时间戳) && 时间戳 > 0 ? 时间戳 * 1000 : null;
    状态.serverTimeTick = 状态.serverTime != null && typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : null;
}

function 支付_转账服务端时间(状态) {
    if (状态.serverTime == null) return null;
    // 以服务端返回的秒为基准，仅用单调时钟计算经过时长，不依赖设备日期。
    const 经过 = 状态.serverTimeTick == null ? 0 : Math.max(0, performance.now() - 状态.serverTimeTick);
    return 状态.serverTime + 经过;
}

function 支付_转账已到期(记录, 状态) {
    if (记录.status === 'expired') return true;
    const 到期 = 支付_转账到期时间(记录);
    const 现在 = 支付_转账服务端时间(状态);
    return 到期 != null && 现在 != null && 到期 <= 现在;
}

function 支付_安排转账到期检查(状态) {
    if (状态.expiryTimer != null) clearTimeout(状态.expiryTimer);
    状态.expiryTimer = null;
    if (!支付_转账仍有效(状态) || 状态.recordsLoading || !状态.recordsValid) return;
    const 现在 = 支付_转账服务端时间(状态);
    if (现在 == null || 状态.serverTimeTick == null) return;
    let 最近 = Infinity;
    状态.records.forEach(function (记录) {
        const 到期 = 支付_转账到期时间(记录);
        if (记录.status === 'pending' && 到期 != null && 到期 > 现在) 最近 = Math.min(最近, 到期);
    });
    if (!Number.isFinite(最近)) return;
    状态.expiryTimer = setTimeout(function () {
        状态.expiryTimer = null;
        if (支付_转账仍有效(状态)) 支付_更新转账控件();
    }, Math.min(2147483647, Math.max(1, Math.ceil(最近 - 现在))));
}

function 支付_更新转账资料(data) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    状态.data = data;
    状态.enabled = data.enabled === true || data.enabled === 1;
    const 可转 = Number(data.transferable_balance);
    状态.transferable = Number.isFinite(可转) ? Math.max(0, 可转) : 0;
    const 最小 = Number(data.min);
    const 最大 = Number(data.max);
    状态.min = Number.isFinite(最小) && 最小 > 0 ? 最小 : 0.01;
    状态.max = Number.isFinite(最大) && 最大 > 0 ? 最大 : 50000;
    document.getElementById('transferBalanceInfo').innerHTML = '总余额：<b>¥' + 支付_转义(data.balance ?? '0.00')
        + '</b>　可转账：<b>¥' + 支付_转义(状态.transferable.toFixed(2))
        + '</b><br>注册赠送余额：¥' + 支付_转义(data.bonus_balance ?? '0.00') + '（仅限消费）';
    document.getElementById('transferLimitInfo').textContent = '单笔限额：' + 状态.min.toFixed(2) + ' ~ ' + 状态.max.toFixed(2) + ' 元；可转账余额 ' + 状态.transferable.toFixed(2) + ' 元。';
    const 金额框 = document.getElementById('transferAmount');
    金额框.min = 状态.min;
    金额框.max = Math.min(状态.max, 状态.transferable);
    document.getElementById('transferDisabledTip').style.display = 状态.enabled ? 'none' : 'block';
    document.getElementById('transferNewForm').style.display = 状态.enabled ? 'block' : 'none';
    if (!状态.enabled) 支付_重置转账对象();
    if (data.balance !== undefined) 支付_刷新余额显示(data.balance);
    支付_更新转账控件();
}

function 支付_更新转账控件() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    document.getElementById('transferCameraBtn').disabled = 状态.busy || 状态.queryLoading || 状态.scanStarting || !状态.enabled;
    document.getElementById('transferCameraStop').disabled = !状态.stream && !状态.scanStarting;
    document.getElementById('transferQRFile').disabled = 状态.busy || 状态.queryLoading || !状态.enabled;
    document.getElementById('transferQRCreate').disabled = 状态.busy || 状态.qrBusy || !状态.enabled || 状态.leaving;
    document.getElementById('transferQRRevoke').disabled = 状态.busy || 状态.qrBusy;
    document.getElementById('transferQRRevoke').style.display = 状态.qr ? 'inline-block' : 'none';
    document.getElementById('transferQRCreate').textContent = 状态.qrBusy ? '正在处理...' : (状态.qr ? '生成新二维码（替换旧码）' : '生成收款二维码');
    document.getElementById('transferAmount').disabled = 状态.busy || !状态.enabled;
    const 提交 = document.getElementById('transferSubmitBtn');
    提交.disabled = 状态.busy || !状态.enabled || !支付_对方信息;
    提交.style.display = 状态.tab === 'new' && 状态.enabled && 支付_对方信息 ? 'inline-block' : 'none';
    document.getElementById('transferRefreshBtn').disabled = 状态.busy || 状态.recordsLoading;
    document.getElementById('transferPrevBtn').disabled = 状态.busy || 状态.recordsLoading || !状态.recordsValid || 状态.page <= 1;
    document.getElementById('transferNextBtn').disabled = 状态.busy || 状态.recordsLoading || !状态.recordsValid || 状态.page >= 状态.pages;
    document.getElementById('transferTabReceive').disabled = 状态.busy || 状态.qrBusy;
    document.getElementById('transferTabNew').disabled = 状态.busy || 状态.qrBusy;
    document.getElementById('transferTabRecords').disabled = 状态.busy || 状态.qrBusy;
    状态.modal.querySelectorAll('[data-transfer-mutation], [data-transfer-close]').forEach(function (按钮) {
        const id = Number(按钮.getAttribute('data-transfer-id'));
        const 记录 = 状态.records.get(id);
        const 到期 = !!记录 && 支付_转账已到期(记录, 状态);
        按钮.disabled = 状态.busy || 到期;
        if (到期) 按钮.title = '已到领取期限，请刷新查看自动退款结果';
    });
    支付_安排转账到期检查(状态);
}

async function 支付_切换转账标签(标签) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.qrBusy) return;
    const 目标 = ['receive', 'new', 'records'].includes(标签) ? 标签 : 'records';
    if (目标 !== 状态.tab && 状态.tab === 'receive') {
        if (!await 支付_撤销当前收款码(状态) || !支付_转账仍有效(状态)) return;
    }
    if (目标 !== 状态.tab) {
        支付_停止扫码(状态);
        状态.imageRequest++;
        支付_重置转账对象();
    }
    状态.tab = 目标;
    document.getElementById('transferReceiveArea').style.display = 状态.tab === 'receive' ? 'block' : 'none';
    document.getElementById('transferNewArea').style.display = 状态.tab === 'new' ? 'block' : 'none';
    document.getElementById('transferRecordsArea').style.display = 状态.tab === 'records' ? 'block' : 'none';
    [['transferTabReceive', 'receive'], ['transferTabNew', 'new'], ['transferTabRecords', 'records']].forEach(function (项) {
        const 按钮 = document.getElementById(项[0]);
        const 选中 = 状态.tab === 项[1];
        按钮.style.color = 选中 ? '#15803d' : '#64748b';
        按钮.style.borderBottom = '2px solid ' + (选中 ? '#16a34a' : 'transparent');
        按钮.setAttribute('aria-pressed', String(选中));
    });
    支付_更新转账控件();
}

function 支付_转账提示(文案, 错误) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    const 提示 = document.getElementById('transferNotice');
    提示.textContent = 文案;
    提示.style.color = 错误 ? '#dc2626' : '#15803d';
    提示.style.display = 文案 ? 'block' : 'none';
}

async function 支付_关闭转账() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.busy || 状态.leaving) return;
    状态.leaving = true;
    状态.qrGeneration++;
    支付_遮住收款码(状态, '正在向服务器确认撤销…');
    支付_停止扫码(状态);
    状态.imageRequest++;
    支付_重置转账对象();
    try {
        // 创建请求已发出时，必须等到拿到该实例的所有者凭据再精确撤销。
        if (状态.qrCreate) await 状态.qrCreate;
        if (!支付_转账仍有效(状态) || !await 支付_撤销当前收款码(状态)) return;
        if (状态.expiryTimer != null) clearTimeout(状态.expiryTimer);
        支付_对方信息 = null;
        支付_转账状态 = null;
        状态.modal.remove();
    } finally {
        if (支付_转账仍有效(状态)) { 状态.leaving = false; 支付_更新转账控件(); }
    }
}

function 支付_二维码请求(action, params) {
    return POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: action, ...params, password: 开发者安全密码
    });
}

function 支付_二维码时钟(data, 开始时刻, 固定截止) {
    const 服务 = Number(data.server_time_ts);
    const 固定 = Number(data.expires_at_ts);
    const 租期 = Number(data.lease_expires_at_ts);
    if (![服务, 固定, 租期].every(Number.isSafeInteger) || 服务 <= 0 || 固定 <= 服务 || 租期 <= 服务) return null;
    const tick = performance.now();
    // 扣除整次请求时长，宁可提前遮码，不能因慢响应延长服务端授权。
    const 网络耗时 = Math.max(0, tick - 开始时刻);
    const 最晚 = 固定截止 == null ? tick + Math.min(300, 固定 - 服务) * 1000 - 网络耗时 : 固定截止;
    return { fixed: Math.min(最晚, tick + (固定 - 服务) * 1000 - 网络耗时), lease: tick + Math.min(35, 租期 - 服务) * 1000 - 网络耗时 };
}

function 支付_遮住收款码(状态, 文案) {
    if (状态.qrTimer != null) clearInterval(状态.qrTimer);
    状态.qrTimer = null;
    if (状态.qr) 状态.qr.stopped = true;
    if (!支付_转账仍有效(状态)) return;
    const canvas = document.getElementById('transferQRCanvas');
    canvas.style.display = 'none';
    canvas.width = canvas.width; // 清除像素，不把已过期码留在隐藏画布。
    const cover = document.getElementById('transferQRCover');
    cover.textContent = 文案 || '收款二维码已隐藏，请重新生成';
    cover.style.display = 'flex';
    document.getElementById('transferQRTime').textContent = '';
}

function 支付_收款码可用(qr) {
    return !!qr && !qr.stopped && !!qr.clock && performance.now() < Math.min(qr.clock.fixed, qr.clock.lease);
}

async function 支付_撤销二维码实例(qr) {
    // 不读取全局当前码，旧请求的清理永远只撤销自身实例。
    if (qr.revoked) return true;
    const r = await 支付_二维码请求('revoke_transfer_qr', { qr_id: qr.id, owner_secret: qr.secret });
    if (!r || !r.success || !r.data || r.data.qr_id !== qr.id || !['revoked', 'used', 'expired'].includes(r.data.status)) throw new Error('撤销未获服务器确认');
    qr.revoked = true;
    qr.payload = '';
    qr.secret = '';
    return true;
}

async function 支付_撤销当前收款码(状态) {
    // 关闭与重建必须等待同一笔撤销，不能把正在撤销误判成失败。
    if (状态.qrRevoke) return 状态.qrRevoke;
    if (!状态.qr) return true;
    if (状态.qrBusy) return false;
    const operation = 支付_执行收款码撤销(状态);
    状态.qrRevoke = operation;
    try { return await operation; }
    finally { if (状态.qrRevoke === operation) 状态.qrRevoke = null; }
}

async function 支付_执行收款码撤销(状态) {
    const qr = 状态.qr;
    状态.qrBusy = true;
    支付_遮住收款码(状态, '正在向服务器确认撤销…');
    if (支付_转账仍有效(状态)) 支付_更新转账控件();
    let timeout;
    try {
        await Promise.race([
            支付_撤销二维码实例(qr),
            new Promise(function (_, reject) { timeout = setTimeout(function () { reject(new Error('请求超时')); }, 12000); })
        ]);
        if (状态.qr === qr) 状态.qr = null;
        if (支付_转账仍有效(状态)) 支付_遮住收款码(状态, '服务器已确认此二维码不可再收款，可重新生成');
        return true;
    } catch (e) {
        if (支付_转账仍有效(状态)) {
            支付_遮住收款码(状态, '失效未确认，二维码已隐藏。请重试撤销');
            支付_转账提示('失效未确认：未获得服务器撤销确认，已停止续租并遮住二维码。请点击“撤销二维码 / 重试”，成功后才能离开。', true);
        }
        return false;
    } finally {
        clearTimeout(timeout);
        状态.qrBusy = false;
        if (支付_转账仍有效(状态)) 支付_更新转账控件();
    }
}

async function 支付_重试撤销收款码() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.busy) return;
    if (await 支付_撤销当前收款码(状态)) 支付_转账提示('服务器已确认二维码不可再收款。', false);
}

async function 支付_生成收款码() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.tab !== 'receive' || !状态.enabled || 状态.busy || 状态.qrBusy || 状态.leaving || document.hidden) return;
    if (typeof qrcode !== 'function') { 支付_转账提示('本地二维码生成库未加载，请刷新页面。', true); return; }
    // 没有旧码时不要先让出执行权，避免连续点击同时越过忙碌检查。
    if (状态.qr && !await 支付_撤销当前收款码(状态)) return;
    if (!支付_转账仍有效(状态) || 状态.tab !== 'receive' || !状态.enabled || 状态.busy || 状态.qrBusy || 状态.leaving || document.hidden) return;
    const generation = ++状态.qrGeneration;
    状态.qrBusy = true;
    支付_更新转账控件();
    const 开始 = performance.now();
    状态.qrCreate = (async function () {
        try {
            const r = await 支付_二维码请求('create_transfer_qr', {});
            if (!r || !r.success) throw new Error('服务器未确认生成，请稍后重试');
            const d = r.data || {};
            // 先保存可撤销凭据，即使其余数据不完整也能清理本次创建。
            if (!/^[a-f0-9]{32}$/.test(d.qr_id || '') || !/^[a-f0-9]{64}$/.test(d.owner_secret || '')) throw new Error('收款二维码凭据不完整，请等待服务端租期失效');
            const qr = { id: d.qr_id, secret: d.owner_secret, payload: d.qr_payload, clock: 支付_二维码时钟(d, 开始), stopped: true, heartbeat: false, revoked: false };
            状态.qr = qr;
            if (!支付_转账仍有效(状态) || generation !== 状态.qrGeneration || 状态.leaving || document.hidden) {
                支付_后台撤销(qr);
                await 支付_撤销二维码实例(qr);
                if (状态.qr === qr) 状态.qr = null;
                return;
            }
            if (d.status !== 'active' || Number(d.heartbeat_seconds) !== 10 || !/^jiyan-transfer:v1:[a-f0-9]{64}$/.test(qr.payload || '') || !qr.clock) throw new Error('收款二维码数据无效，请撤销后重试');
            qr.stopped = false;
            if (!支付_收款码可用(qr)) throw new Error('收款二维码响应过慢，请撤销后重新生成');
            const code = qrcode(0, 'M');
            code.addData(qr.payload, 'Byte'); code.make();
            const canvas = document.getElementById('transferQRCanvas');
            const count = code.getModuleCount(), scale = 6, margin = 4;
            canvas.width = canvas.height = (count + margin * 2) * scale;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#111827';
            for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (code.isDark(row, col)) ctx.fillRect((col + margin) * scale, (row + margin) * scale, scale, scale);
            canvas.style.display = 'block';
            document.getElementById('transferQRCover').style.display = 'none';
            qr.nextHeartbeat = performance.now() + 10000;
            const 检查 = function () {
                if (!支付_转账仍有效(状态) || 状态.qr !== qr || document.hidden || 状态.tab !== 'receive' || !支付_收款码可用(qr)) {
                    支付_遮住收款码(状态, '二维码租期已结束或心跳未获确认，请撤销后重新生成');
                    return;
                }
                const 剩余 = Math.max(0, Math.floor((qr.clock.fixed - performance.now()) / 1000));
                const 租期 = Math.max(0, Math.floor((Math.min(qr.clock.fixed, qr.clock.lease) - performance.now()) / 1000));
                document.getElementById('transferQRTime').textContent = '固定有效期剩余 ' + Math.floor(剩余 / 60) + ':' + String(剩余 % 60).padStart(2, '0') + ' · 已确认租期剩余 ' + 租期 + ' 秒';
                if (!qr.heartbeat && performance.now() >= qr.nextHeartbeat) 支付_续租收款码(状态, qr);
            };
            状态.qrTimer = setInterval(检查, 250); 检查();
            支付_转账提示('请让对方扫码并核对账号，收款仍需在记录中确认。', false);
        } catch (e) {
            if (支付_转账仍有效(状态)) {
                支付_遮住收款码(状态, 状态.qr ? '失效未确认，请撤销此二维码后重试' : '未能生成二维码，请重试');
                支付_转账提示('二维码未展示。' + (状态.qr ? '失效未确认，请重试撤销。' : '请稍后重试；未确认的请求不会继续续租。'), true);
            }
        }
    })();
    try { await 状态.qrCreate; }
    finally {
        状态.qrCreate = null;
        状态.qrBusy = false;
        if (支付_转账仍有效(状态)) 支付_更新转账控件();
    }
}

async function 支付_续租收款码(状态, qr) {
    if (!支付_收款码可用(qr) || qr.heartbeat) return;
    qr.heartbeat = true;
    qr.nextHeartbeat = performance.now() + 10000;
    const 开始 = performance.now();
    try {
        const r = await 支付_二维码请求('heartbeat_transfer_qr', { qr_id: qr.id, owner_secret: qr.secret });
        if (!支付_转账仍有效(状态) || 状态.qr !== qr || qr.stopped) return;
        if (!r || !r.success || !r.data || r.data.qr_id !== qr.id || r.data.status !== 'active') throw new Error('心跳未确认');
        const clock = 支付_二维码时钟(r.data, 开始, qr.clock.fixed);
        if (!clock || !支付_收款码可用(qr)) throw new Error('租期已结束');
        qr.clock = clock;
    } catch (e) {
        if (支付_转账仍有效(状态) && 状态.qr === qr) {
            支付_遮住收款码(状态, '心跳未获确认，已停止展示与续租，请撤销后重试');
            支付_转账提示('心跳未获服务器确认，失效未确认；请撤销此二维码后重新生成。', true);
        }
    } finally { qr.heartbeat = false; }
}

function 支付_后台撤销(qr) {
    if (!qr || qr.revoked) return;
    try {
        const url = new URL(获取API链接('api.php'), window.location.href);
        if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return;
        const params = { action: 'revoke_transfer_qr', qr_id: qr.id, owner_secret: qr.secret, password: 开发者安全密码 };
        const body = JSON.stringify({ developer_username: 开发者UID, data: encryptRequestParams(params, 开发者UID, 开发者密码, 开发者Token) });
        if (navigator.sendBeacon && navigator.sendBeacon(url.href, new Blob([body], { type: 'application/json' }))) return;
        fetch(url.href, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: body }).catch(function () {});
    } catch (e) { /* 离页仅尽力投递，不宣称服务器已确认撤销。 */ }
}

function 支付_转账切到后台() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    状态.qrGeneration++;
    支付_停止扫码(状态);
    状态.imageRequest++;
    支付_重置转账对象();
    支付_遮住收款码(状态, '页面已离开前台，失效未确认；返回后请撤销旧码并重新生成');
    if (状态.qr) 支付_后台撤销(状态.qr);
}

window.addEventListener('pagehide', 支付_转账切到后台);
document.addEventListener('visibilitychange', function () { if (document.hidden) 支付_转账切到后台(); });

function 支付_重置转账对象() {
    支付_对方信息 = null;
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    状态.queryRequest++;
    状态.queryPayload = '';
    状态.queryClock = null;
    状态.queryLoading = false;
    const 信息 = document.getElementById('transferTargetInfo');
    信息.textContent = '';
    信息.style.display = 'none';
    document.getElementById('transferAmountBox').style.display = 'none';
    document.getElementById('transferAmount').value = '';
    支付_更新转账控件();
}

function 支付_停止扫码(状态) {
    if (!状态) return;
    状态.scanGeneration++;
    状态.scanStarting = false;
    if (状态.scanFrame != null) cancelAnimationFrame(状态.scanFrame);
    状态.scanFrame = null;
    if (状态.stream) 状态.stream.getTracks().forEach(function (track) { track.stop(); });
    状态.stream = null;
    if (!支付_转账仍有效(状态)) return;
    const video = document.getElementById('transferScanVideo');
    video.pause(); video.srcObject = null; video.style.display = 'none';
    支付_更新转账控件();
}

async function 支付_开始扫码() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.tab !== 'new' || 状态.busy || !状态.enabled || 状态.queryLoading || document.hidden) return;
    状态.imageRequest++; // 启动相机使尚未完成的图片识别失效。
    支付_停止扫码(状态);
    支付_重置转账对象();
    const tip = document.getElementById('transferScanStatus');
    if (typeof jsQR !== 'function') { tip.textContent = '本地二维码识别库未加载，请刷新页面。'; return; }
    if (!window.isSecureContext) { tip.textContent = '摄像头需要 HTTPS 安全连接，请改用上传二维码图片。'; return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { tip.textContent = '浏览器不支持摄像头，请上传二维码图片识别。'; return; }
    const generation = ++状态.scanGeneration;
    状态.scanStarting = true;
    支付_更新转账控件();
    tip.textContent = '正在请求摄像头权限…';
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!支付_转账仍有效(状态) || generation !== 状态.scanGeneration || 状态.tab !== 'new' || document.hidden) {
            stream.getTracks().forEach(function (track) { track.stop(); }); return;
        }
        状态.stream = stream;
        const video = document.getElementById('transferScanVideo');
        video.srcObject = stream; video.style.display = 'block';
        await video.play();
        if (!支付_转账仍有效(状态) || generation !== 状态.scanGeneration) return;
        tip.textContent = '将对方临时收款二维码置于画面内；识别仅查询，不会自动转账。';
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
        let last = -Infinity;
        const frame = function (tick) {
            if (!支付_转账仍有效(状态) || generation !== 状态.scanGeneration || !状态.stream || document.hidden) return;
            if (tick - last >= 180 && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
                last = tick;
                const ratio = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
                canvas.width = Math.max(1, Math.round(video.videoWidth * ratio)); canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
                try {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
                    if (result) { 支付_停止扫码(状态); 支付_查二维码对方(result.data); return; }
                } catch (e) { 支付_停止扫码(状态); tip.textContent = '摄像头画面无法识别，请上传二维码图片。'; return; }
            }
            状态.scanFrame = requestAnimationFrame(frame);
        };
        状态.scanFrame = requestAnimationFrame(frame);
    } catch (e) {
        if (支付_转账仍有效(状态) && generation === 状态.scanGeneration) {
            支付_停止扫码(状态);
            const messages = { NotAllowedError: '摄像头权限被拒绝，请在浏览器允许访问或上传二维码图片。', NotFoundError: '未发现可用摄像头，请上传二维码图片。', NotReadableError: '摄像头被占用或无法启动，请关闭其他应用或上传图片。', SecurityError: '浏览器安全策略禁止摄像头，请使用 HTTPS 或上传图片。' };
            tip.textContent = messages[e.name] || '摄像头无法启动，请改用上传二维码图片。';
        }
    } finally {
        if (支付_转账仍有效(状态) && generation === 状态.scanGeneration) { 状态.scanStarting = false; 支付_更新转账控件(); }
    }
}

async function 支付_识别图片(input) {
    const 状态 = 支付_转账状态, file = input.files && input.files[0];
    input.value = '';
    if (!file || !支付_转账仍有效(状态) || 状态.tab !== 'new' || 状态.busy || !状态.enabled) return;
    支付_停止扫码(状态);
    支付_重置转账对象();
    const request = ++状态.imageRequest;
    const tip = document.getElementById('transferScanStatus');
    if (typeof jsQR !== 'function') { tip.textContent = '本地二维码识别库未加载，请刷新页面。'; return; }
    if (file.size > 15 * 1024 * 1024 || !/^image\//.test(file.type)) { tip.textContent = '请选择15MB以内的二维码图片。'; return; }
    const url = URL.createObjectURL(file);
    tip.textContent = '正在本地识别二维码图片…';
    try {
        const image = new Image();
        await new Promise(function (resolve, reject) { image.onload = resolve; image.onerror = reject; image.src = url; });
        if (!支付_转账仍有效(状态) || request !== 状态.imageRequest || 状态.tab !== 'new' || document.hidden) return;
        if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('图片尺寸过大');
        const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
        let result = null;
        for (const edge of [1600, 2400]) {
            const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'attemptBoth' });
            if (result) break;
        }
        if (!result) { tip.textContent = '未识别到二维码，请上传清晰、完整的二维码图片。'; return; }
        await 支付_查二维码对方(result.data);
    } catch (e) {
        if (支付_转账仍有效(状态) && request === 状态.imageRequest) tip.textContent = '图片无法读取或尺寸过大，请换一张清晰的二维码图片。';
    } finally { URL.revokeObjectURL(url); }
}

async function 支付_查二维码对方(payload) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.tab !== 'new' || 状态.busy || 状态.queryLoading || !状态.enabled || document.hidden) return;
    支付_重置转账对象();
    // 只接受专用协议内容。任何 URL/其他二维码都不导航、不请求。
    if (typeof payload !== 'string' || !/^jiyan-transfer:v1:[a-f0-9]{64}$/.test(payload)) {
        document.getElementById('transferScanStatus').textContent = '这不是本系统临时收款二维码，请重新扫码或上传图片。'; return;
    }
    const 请求 = ++状态.queryRequest, 开始 = performance.now();
    状态.queryLoading = true;
    支付_转账提示('', false);
    支付_更新转账控件();
    document.getElementById('transferScanStatus').textContent = '正在向服务器核对收款方…';
    try {
        const r = await 支付_二维码请求('get_user_by_transfer_qr', { qr_payload: payload });
        if (!支付_转账仍有效(状态) || 请求 !== 状态.queryRequest || 状态.tab !== 'new' || document.hidden) return;
        if (!r || !r.success) throw new Error((r && r.message) || '二维码无效或已失效');
        const 对方 = r.data || {}, clock = 支付_二维码时钟(对方, 开始);
        if (!Number.isSafeInteger(Number(对方.uid)) || Number(对方.uid) <= 0 || !/^[a-f0-9]{32}$/.test(对方.qr_id || '') || !clock || performance.now() >= Math.min(clock.fixed, clock.lease)) throw new Error('收款方信息不完整或租期已结束，请重新扫码');
        支付_对方信息 = 对方;
        状态.queryPayload = payload;
        状态.queryClock = clock;
        const info = document.getElementById('transferTargetInfo');
        info.style.display = 'block';
        info.innerHTML = '<div>收款方：<b>' + 支付_转义(对方.name || '') + '</b></div>'
            + '<div style="color:#64748b;font-size:12px;">账号 ' + 支付_转义(对方.username || '') + ' · uid#' + 支付_转义(对方.uid) + '</div>';
        document.getElementById('transferAmountBox').style.display = 'block';
        document.getElementById('transferScanStatus').textContent = '已识别收款方。请核对账号并输入金额，再点击发起转账确认。';
    } catch (e) {
        if (支付_转账仍有效(状态) && 请求 === 状态.queryRequest) {
            支付_重置转账对象();
            支付_转账提示('查询失败：' + (e.message || '网络错误'), true);
        }
    } finally {
        if (支付_转账仍有效(状态) && 请求 === 状态.queryRequest) 状态.queryLoading = false;
        if (支付_转账仍有效(状态)) 支付_更新转账控件();
    }
}

async function 支付_刷新转账资料(状态) {
    const 请求 = ++状态.detailsRequest;
    const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
        action: 'get_transfer_key', password: 开发者安全密码
    });
    if (!支付_转账仍有效(状态) || 请求 !== 状态.detailsRequest) return;
    if (!r || !r.success) throw new Error((r && r.message) || '获取余额失败');
    支付_更新转账资料(r.data || {});
}

async function 支付_刷新转账记录() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.busy || 状态.recordsLoading) return;
    支付_转账提示('', false);
    await Promise.all([
        支付_加载转账记录(状态.page),
        支付_刷新转账资料(状态).catch(function (e) {
            if (支付_转账仍有效(状态)) 支付_转账提示('余额刷新失败：' + (e.message || '网络错误'), true);
        })
    ]);
}

async function 支付_加载转账记录(页码) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态)) return;
    const page = Math.max(1, Math.floor(Number(页码) || 1));
    const 请求 = ++状态.recordsRequest;
    状态.recordsLoading = true;
    状态.recordsValid = false;
    状态.records.clear();
    const 列表 = document.getElementById('transferRecordsList');
    列表.innerHTML = '<div style="text-align:center;padding:26px;color:#64748b;">正在加载转账记录...</div>';
    document.getElementById('transferPendingSummary').textContent = '正在查询待确认款项...';
    document.getElementById('transferPageInfo').textContent = '';
    支付_更新转账控件();
    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'transfer_records', password: 开发者安全密码, page: page, size: 状态.size
        });
        if (!支付_转账仍有效(状态) || 请求 !== 状态.recordsRequest) return;
        if (!r || !r.success) throw new Error((r && r.message) || '未知错误');
        const data = r.data || {};
        if (!Array.isArray(data.list)) throw new Error('记录数据格式错误');
        支付_同步转账时间(状态, data);
        const 数量 = function (v) { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; };
        const 总数 = 数量(data.total);
        状态.pages = Math.max(1, 数量(data.pages) || Math.ceil(总数 / 状态.size));
        状态.page = Math.max(1, Math.min(状态.pages, 数量(data.page) || page));
        if (page > 状态.pages && !data.list.length) {
            await 支付_加载转账记录(状态.pages);
            return;
        }
        const 待收数 = 数量(data.pending_incoming_count);
        document.getElementById('transferTabRecords').textContent = '转账记录 / 待收款' + (待收数 ? '（' + 待收数 + '）' : '');
        document.getElementById('transferPendingSummary').textContent = '待收款 ' + 待收数 + ' 笔 / ¥' + String(data.pending_incoming_amount ?? '0.00')
            + '；待对方确认 ' + 数量(data.pending_outgoing_count) + ' 笔 / ¥' + String(data.pending_outgoing_amount ?? '0.00');
        列表.innerHTML = data.list.length ? data.list.map(function (it) {
            if (!it || typeof it !== 'object') return '';
            const id = Number(it.id);
            if (Number.isSafeInteger(id) && id > 0) 状态.records.set(id, it);
            const 收入 = it.direction === 'incoming';
            const 已到期 = 支付_转账已到期(it, 状态);
            const 状态文字 = { pending: '待确认（暂存）', success: '已到账', fail: '失败', cancelled: '已撤销（退回）', rejected: '已拒收（退回）', expired: '超时已退回' };
            const 显示状态 = it.status === 'pending' && 已到期 ? '已到期（待刷新退款结果）' : (状态文字[it.status] || it.status_cn || '未知状态');
            const 说明 = it.status === 'expired' ? '24小时未领取，系统已自动原路退回发送方。'
                : (it.status === 'pending' ? (已到期 ? '已超过领取期限，不能继续收款；请刷新查看自动退款结果。' : (收入 ? '款项暂存中，确认收款后才计入你的余额；24小时未领取自动原路退回，拒收也会退回发送方。' : '款项已从你的可转账余额扣除并暂存；对方确认后到账，24小时未领取自动原路退回，撤销或被拒收也会退回。'))
                : (it.status === 'cancelled' || it.status === 'rejected' ? '款项已退回发送方。' : (it.status === 'success' ? (it.confirmed_at ? '接收方已确认，款项已入账。' : '历史转账已入账；旧记录未保存接收确认信息。') : '本次转账未完成，请查看记录详情。')));
            let 操作 = '';
            if (Number.isSafeInteger(id) && id > 0 && it.status === 'pending' && !已到期) {
                if (收入 && (it.can_accept === true || it.can_accept === 1)) 操作 += '<button data-transfer-mutation data-transfer-id="' + id + '" onclick="支付_处理转账(' + id + ',\'accept\')" style="padding:7px 12px;border:0;border-radius:8px;background:#16a34a;color:#fff;cursor:pointer;">确认收款</button>';
                if (收入 && (it.can_reject === true || it.can_reject === 1)) 操作 += '<button data-transfer-mutation data-transfer-id="' + id + '" onclick="支付_处理转账(' + id + ',\'reject\')" style="padding:7px 12px;border:1px solid #fca5a5;border-radius:8px;background:#fff;color:#dc2626;cursor:pointer;">拒收</button>';
                if (it.direction === 'outgoing' && (it.can_cancel === true || it.can_cancel === 1)) 操作 += '<button data-transfer-mutation data-transfer-id="' + id + '" onclick="支付_处理转账(' + id + ',\'cancel\')" style="padding:7px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;">撤销转账</button>';
            }
            const 颜色 = it.status === 'success' ? '#15803d' : (it.status === 'pending' && !已到期 ? '#b45309' : '#64748b');
            return '<div style="padding:12px 0;border-bottom:1px solid #e2e8f0;overflow-wrap:anywhere;">'
                + '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:7px;"><b>' + (收入 ? '收款' : '转出') + ' ¥' + 支付_转义(it.amount) + '</b>'
                + '<span style="color:' + 颜色 + ';font-weight:600;">' + 支付_转义(显示状态) + '</span></div>'
                + '<div style="font-size:12px;color:#475569;line-height:1.8;">发送账号：' + 支付_转义(it.from_username || '未命名') + '（UID ' + 支付_转义(it.from_uid) + '）'
                + '<br>收款账号：' + 支付_转义(it.to_username || '未命名') + '（UID ' + 支付_转义(it.to_uid) + '）'
                + '<br>发起：' + 支付_转义(it.created_at || '—')
                + (支付_转账时间显示(it) ? '<br>领取截止：' + 支付_转义(支付_转账时间显示(it)) + '（北京时间）' : '')
                + (it.status !== 'expired' && it.confirmed_at ? '<br>确认：' + 支付_转义(it.confirmed_at) : '')
                + (it.settled_at ? '<br>' + (it.status === 'expired' ? '自动退款' : '结算') + '：' + 支付_转义(it.settled_at) : '')
                + '<br>记录 #' + 支付_转义(it.id) + (it.detail ? '<br>详情：' + 支付_转义(it.detail) : '')
                + '<br><span style="color:#64748b;">' + 说明 + '</span></div>'
                + (操作 ? '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' + 操作 + '</div>' : '') + '</div>';
        }).join('') : '<div style="text-align:center;padding:30px;color:#64748b;">暂无转账记录</div>';
        document.getElementById('transferPageInfo').textContent = '第 ' + 状态.page + ' / ' + 状态.pages + ' 页，共 ' + 总数 + ' 笔';
        状态.recordsValid = true;
    } catch (e) {
        if (支付_转账仍有效(状态) && 请求 === 状态.recordsRequest) {
            列表.innerHTML = '<div role="alert" style="padding:20px 0;color:#dc2626;">记录加载失败：' + 支付_转义(e.message || '网络错误') + '。请点击刷新重试。</div>';
            document.getElementById('transferPendingSummary').textContent = '待确认统计暂不可用';
            document.getElementById('transferTabRecords').textContent = '转账记录 / 待收款';
        }
    } finally {
        if (支付_转账仍有效(状态) && 请求 === 状态.recordsRequest) {
            状态.recordsLoading = false;
            支付_更新转账控件();
        }
    }
}

async function 支付_操作后刷新(状态, 页码) {
    const 错误 = [];
    await Promise.all([
        支付_加载转账记录(页码),
        支付_刷新转账资料(状态).catch(function (e) { 错误.push('余额刷新失败：' + (e.message || '网络错误')); }),
        (async function () {
            try { if (typeof updateinfo === 'function') await updateinfo(); }
            catch (e) { 错误.push('账户信息刷新失败：' + (e.message || '网络错误')); }
        })()
    ]);
    if (支付_转账仍有效(状态) && !状态.recordsValid) 错误.push('转账记录未能刷新，请点击刷新重试');
    return 错误.join('；');
}

async function 支付_处理转账(转账ID, 操作) {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.busy || 状态.recordsLoading) return;
    const id = Number(转账ID);
    const 记录 = 状态.records.get(id);
    const 定义 = {
        accept: { action: 'accept_transfer', label: '确认收款', flag: 'can_accept', direction: 'incoming', tip: '确认后款项计入你的余额，本次确认的 IP 将由服务器记录。', done: '已确认收款，款项已到账。' },
        reject: { action: 'reject_transfer', label: '拒收', flag: 'can_reject', direction: 'incoming', tip: '拒收后款项将退回发送方。', done: '已拒收，款项已退回发送方。' },
        cancel: { action: 'cancel_transfer', label: '撤销转账', flag: 'can_cancel', direction: 'outgoing', tip: '撤销后暂存款项将退回你的可转账余额。', done: '已撤销，款项已退回你的可转账余额。' }
    }[操作];
    if (!定义 || !Number.isSafeInteger(id) || id <= 0 || !记录 || 记录.status !== 'pending' || 记录.direction !== 定义.direction || !(记录[定义.flag] === true || 记录[定义.flag] === 1)) return;
    if (支付_转账已到期(记录, 状态)) {
        支付_转账提示('已到领取期限，不能继续操作；请刷新查看自动退款结果。', true);
        支付_更新转账控件();
        return;
    }
    状态.busy = true;
    状态.detailsRequest++;
    支付_更新转账控件();
    try {
        const 文案 = 定义.label + '这笔 ¥' + String(记录.amount) + ' 的转账？\n发送账号：' + String(记录.from_username || '')
            + '\n收款账号：' + String(记录.to_username || '') + '\n' + 定义.tip;
        if (!await 支付_二次确认(文案) || !支付_转账仍有效(状态)) return;
        if (支付_转账已到期(记录, 状态)) {
            支付_转账提示('确认期间已到领取期限，不能继续操作；请刷新查看自动退款结果。', true);
            return;
        }
        let 结果 = '';
        let 失败 = false;
        try {
            const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
                action: 定义.action, password: 开发者安全密码, transfer_id: id
            });
            if (!r || !r.success) throw new Error((r && r.message) || '未知错误');
            const 实际状态 = r.data && r.data.status;
            const 完成状态 = { accept: 'success', reject: 'rejected', cancel: 'cancelled' }[操作];
            if (实际状态 === 'expired') {
                结果 = '转账已超过24小时未领取，款项已自动退回发送方。';
            } else if (实际状态 === 完成状态) {
                结果 = r.message || 定义.done;
            } else {
                结果 = r.message || '转账状态已变化，请以刷新后的记录为准。';
            }
            支付_重置转账对象();
        } catch (e) {
            失败 = true;
            结果 = 定义.label + '失败：' + (e.message || '网络错误') + '。请刷新记录确认当前状态后再操作。';
        }
        const 刷新错误 = await 支付_操作后刷新(状态, 状态.page);
        if (支付_转账仍有效(状态)) 支付_转账提示(结果 + (刷新错误 ? ' ' + 刷新错误 : ''), 失败 || !!刷新错误);
    } finally {
        if (支付_转账仍有效(状态)) { 状态.busy = false; 支付_更新转账控件(); }
    }
}

async function 支付_确认转账() {
    const 状态 = 支付_转账状态;
    if (!支付_转账仍有效(状态) || 状态.busy) return;
    if (!状态.enabled) { 支付_转账提示('当前暂停发起新转账，已有款项仍可处理。', true); return; }
    const payload = 状态.queryPayload;
    const 对方 = 支付_对方信息;
    if (!对方 || !payload || !状态.queryClock || performance.now() >= Math.min(状态.queryClock.fixed, 状态.queryClock.lease)) {
        支付_重置转账对象();
        支付_转账提示('二维码信息已失效，请重新扫码并核对收款方。', true);
        return;
    }
    const 输入 = document.getElementById('transferAmount');
    const 原金额 = 输入.value.trim();
    const 金额 = Number(原金额);
    if (!/^\d+(?:\.\d{1,2})?$/.test(原金额) || !Number.isFinite(金额) || 金额 < 状态.min) {
        支付_转账提示('请输入有效金额，最多两位小数，且不小于 ' + 状态.min.toFixed(2) + ' 元。', true);
        return;
    }
    if (金额 > 状态.max || 金额 > 状态.transferable) {
        支付_转账提示('金额不能超过单笔限额或可转账余额（¥' + Math.min(状态.max, 状态.transferable).toFixed(2) + '）。', true);
        return;
    }
    状态.busy = true;
    状态.detailsRequest++;
    支付_更新转账控件();
    try {
        const 文案 = '向 ' + (对方.name || '') + '（账号 ' + (对方.username || '') + '）发起 ¥' + 金额.toFixed(2)
            + ' 的转账？\n发起即扣除可转账余额并暂存，须对方确认后到账；24小时未领取自动原路退回，拒收或撤销也会退回。';
        if (!await 支付_二次确认(文案) || !支付_转账仍有效(状态)) return;
        if (支付_对方信息 !== 对方 || 状态.queryPayload !== payload || !状态.queryClock || performance.now() >= Math.min(状态.queryClock.fixed, 状态.queryClock.lease)) {
            支付_重置转账对象();
            支付_转账提示('收款方信息已变化或二维码租期已结束，请重新扫码后发起。', true);
            return;
        }
        let 结果 = '';
        let 失败 = false;
        try {
            const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
                action: 'transfer_money', password: 开发者安全密码, qr_payload: payload, amount: 金额
            });
            if (!r || !r.success) throw new Error((r && r.message) || '未知错误');
            const data = r.data || {};
            if (data.balance !== undefined) 支付_刷新余额显示(data.balance);
            结果 = r.message || '转账已发起，等待对方确认';
            结果 += '。款项已扣除并暂存，对方确认后才到账；24小时未领取自动原路退回，拒收或撤销也会退回。';
        } catch (e) {
            失败 = true;
            结果 = '转账请求未完成确认：' + (e.message || '网络错误') + '。请先查看记录，避免重复发起。';
        }
        支付_重置转账对象();
        支付_切换转账标签('records');
        const 刷新错误 = await 支付_操作后刷新(状态, 1);
        if (支付_转账仍有效(状态)) 支付_转账提示(结果 + (刷新错误 ? ' ' + 刷新错误 : ''), 失败 || !!刷新错误);
    } finally {
        if (支付_转账仍有效(状态)) { 状态.busy = false; 支付_更新转账控件(); }
    }
}

function 支付_二次确认(文案) {
    return new Promise(function (resolve) {
        if (typeof window.envConfirm === 'function') {
            Promise.resolve(window.envConfirm(支付_转义(文案))).then(function (v) { resolve(!!v); }).catch(function () { resolve(false); });
            return;
        }
        resolve(window.confirm(文案));
    });
}

function 支付_转义(s) {
    const DQ = String.fromCharCode(34);
    const SQ = String.fromCharCode(39);
    return String(s == null ? '' : s)
        .split(String.fromCharCode(38)).join(String.fromCharCode(38,97,109,112,59))
        .split(String.fromCharCode(60)).join(String.fromCharCode(38,108,116,59))
        .split(String.fromCharCode(62)).join(String.fromCharCode(38,103,116,59))
        .split(DQ).join(String.fromCharCode(38,113,117,111,116,59))
        .split(SQ).join(String.fromCharCode(38,35,51,57,59))
}

function startVipCountdown() {
    if (window._vipCountdownTimer) { clearInterval(window._vipCountdownTimer); window._vipCountdownTimer = null; }
}