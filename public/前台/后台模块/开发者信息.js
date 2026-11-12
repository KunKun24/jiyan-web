async function 设置头像(avatarUrl, qqNumber) {
    const box = document.getElementById('eNVAvatar1');
    if (!box) return;
    const img = box.querySelector('img');
    const icon = box.querySelector('i');

    let url = '';
    if (avatarUrl && /^(https?:\/\/|\/(?!\/))/.test(avatarUrl)) {
        url = avatarUrl;
    } else if (qqNumber && qqNumber !== '未设置') {
        url = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqNumber}&spec=640&img_type=jpg`;
    }

    if (!url) {
        // [avatar-fix] 无第三方头像时用站内默认图兜底，不再留空框
        url = '后台模块/image/jiyan-logo.png';
    }
    box.style.display = 'flex';
    if (img) {
        img.referrerPolicy = 'no-referrer';
        img.src = url;
        img.style.display = '';
        img.onerror = function () {
            img.onerror = null;
            img.src = '/公共资源/jiyan-logo-192.png';
        };
    }
    if (icon) icon.style.display = 'none';
}

async function 设置QQ头像(qqNumber) {
    const avatarImg1 = document.getElementById('eNVAvatar1');
    
    if (!qqNumber || qqNumber === '未设置') {
        avatarImg1.style.display = 'none';
        return;
    }

    const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${qqNumber}&spec=640&img_type=jpg`;
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        let timeoutId;

        const cleanup = () => {
            clearTimeout(timeoutId);
            img.onload = null;
            img.onerror = null;
        };

        img.onload = function() {
            cleanup();
            
            try {
                const innerImg = avatarImg1.querySelector('img');
                if (innerImg) {
                    innerImg.src = avatarUrl;
                } else {
                    avatarImg1.style.backgroundImage = `url(${avatarUrl})`;
                }
                avatarImg1.style.display = 'block';
                
                resolve(true);
            } catch (error) {
                avatarImg1.style.display = 'none';
                reject(new Error('设置头像时出错: ' + error.message));
            }
        };

        img.onerror = function() {
            cleanup();
            avatarImg1.style.display = 'none';
            const isNetworkError = !navigator.onLine;
            const errorMessage = isNetworkError 
                ? '网络连接失败，无法加载QQ头像' 
                : 'QQ头像加载失败，请检查QQ号码是否正确';
            reject(new Error(errorMessage));
        };

        timeoutId = setTimeout(() => {
            cleanup();
            avatarImg1.style.display = 'none';
            reject(new Error('QQ头像加载超时'));
        }, 10000);

        try {
            img.src = avatarUrl;
            if (img.complete) {
                img.onload();
            }
        } catch (error) {
            cleanup();
            reject(new Error('设置图片源时出错: ' + error.message));
        }
    });
}

async function 修改密码() {
    if(!开发者UID){return;}

    const 新密码 = prompt('输入新的密码');
    
    if (新密码 === null) {
        return;
    }
    
    if (!新密码.trim()) {
        alert('密码不能为空');
        return;
    }

    const 旧密码 = prompt('输入旧密码让我们确认安全性');
    
    if (旧密码 === null) {
        return;
    }

    try {
        const params = {
            action: 'update_password',
            password: 旧密码,
            new_password: 新密码
        };
        
        const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), params);
        
        if (result.success) {
           alert('密码修改成功！');
           开发者密码 = 新密码;
        } else {
            alert('修改失败：' + result.message );
        }
    } catch (error) {
        alert('修改失败，请检查网络连接或稍后重试');
    }
}

async function 修改名称() {
    if(!开发者UID){return;}
    
    const 新名称 = prompt('输入新的名称');
    
    if (新名称 === null) {
        return;
    }
    
    if (!新名称.trim()) {
        alert('密码不能为空');
        return;
    }

    try {
        const params = {
            action: 'update_user_name',
            password: 开发者安全密码,
            new_user_name: 新名称
        };
        
        const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), params);
        
        if (result.success) {
           alert('名称修改成功！');
            开发者名称 = result.data.user_name || 新名称;
            document.getElementById('displayUsername').textContent = 开发者名称;
        } else {
            alert('修改失败：' + result.message );
        }
    } catch (error) {
        alert('修改失败，请检查网络连接或稍后重试');
    }
}



async function 账号签到() {
    const existingModal = document.querySelector('.大转盘弹窗');
    if (existingModal) existingModal.remove();
    
    const 奖励列表 = [
        { 名称: '谢谢惠顾', 金额: 0.00, 颜色: '#f5f5f5' },
        { 名称: '0.01元',   金额: 0.01, 颜色: '#e8f4f8' },
        { 名称: '0.05元',   金额: 0.05, 颜色: '#fdf5e6' },
        { 名称: '0.1元',    金额: 0.1,  颜色: '#e8f8f5' },
        { 名称: '0.2元',    金额: 0.2,  颜色: '#fef9e7' },
        { 名称: '0.3元',    金额: 0.3,  颜色: '#f5eef8' },
        { 名称: '0.4元',    金额: 0.4,  颜色: '#eaf2f8' },
        { 名称: '0.5元',    金额: 0.5,  颜色: '#fef5e7' },
        { 名称: '1.0元',    金额: 1.0,  颜色: '#ebf5fb' },
        { 名称: '5.2元',    金额: 5.2,  颜色: '#e0f7fa' },
        { 名称: '8.8元',    金额: 8.8,  颜色: '#fff3e0' }
    ];
    
    let 当前旋转角度 = 0;
    let 是否正在旋转 = false;
    
    const modal = document.createElement('div');
    modal.className = '大转盘弹窗';
    modal.classList.add('弹窗遮罩');
    
    modal.innerHTML = `
        <div class="弹窗背景">
            <div class="弹窗头部">
                <div class="弹窗头部文字">
                    <i class="fas fa-circle-info" style="color: #f39c12;"></i>
                    <h4>签到抽奖大转盘</h4>
                </div>
                <button id="大转盘关闭X" 
                    style="
                        background: none;
                        border: none;
                        font-size: 18px;
                        cursor: pointer;
                        color: #999;
                        padding: 4px 8px;
                        border-radius: 20px;
                        transition: all 0.2s;
                    " 
                    onmouseover="this.style.backgroundColor='#f0f0f0'; this.style.color='#666'" 
                    onmouseout="this.style.backgroundColor='transparent'; this.style.color='#999'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="弹窗内部" style="text-align: center;">
                <div style="position: relative; margin: 0 auto 20px;">
                    <canvas id="大转盘canvas"style="
                        width: 250px;
                        height: 250px;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    "></canvas>
                    <div style="
                        position: absolute;
                        top: -12px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 0;
                        height: 0;
                        border-left: 12px solid transparent;
                        border-right: 12px solid transparent;
                        border-top: 24px solid #f39c12;
                        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.2));
                        z-index: 10;
                    "></div>
                </div>
                
                <div id="抽奖结果提示" style="
                    background: #f8f9fa;
                    padding: 10px 12px;
                    border-radius: 10px;
                    margin-bottom: 12px;
                    line-height: 1.5;
                    color: #666;
                    font-size: 13px;
                    text-align: center;
                    border: 1px solid #eee;
                ">
                    <i class="fas fa-gift" style="color: #f39c12; margin-right: 6px;"></i>
                    点击下方按钮开始抽奖
                </div>
                
            </div>
            
            <div class="弹窗底部" style="display: flex; gap: 10px;">
                <button id="大转盘抽奖按钮" 
                    style="
                        flex: 2;
                        padding: 10px 16px;
                        background: #f39c12;
                        color: white;
                        border: none;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                    " 
                    onmouseover="this.style.backgroundColor='#e67e22'; this.style.transform='translateY(-1px)'" 
                    onmouseout="this.style.backgroundColor='#f39c12'; this.style.transform='translateY(0)'">
                    开始抽奖
                </button>
                <button id="大转盘关闭按钮" 
                    style="
                        flex: 1;
                        padding: 10px 16px;
                        background: #f5f5f5;
                        color: #666;
                        border: 1px solid #ddd;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                        transition: all 0.2s;
                    " 
                    onmouseover="this.style.backgroundColor='#eeeeee'" 
                    onmouseout="this.style.backgroundColor='#f5f5f5'">
                    关闭
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const canvas = document.getElementById('大转盘canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = 280;
    canvas.height = 280;
    canvas.style.width = '250px';
    canvas.style.height = '250px';
    
    function 绘制转盘(旋转角度) {
        const 中心X = 140;
        const 中心Y = 140;
        const 半径 = 130;
        const 角度步长 = 360 / 奖励列表.length;
        
        ctx.clearRect(0, 0, 280, 280);
        
        奖励列表.forEach((奖励, 索引) => {
            const 起始角度 = (索引 * 角度步长 + 旋转角度) * Math.PI / 180;
            const 结束角度 = ((索引 + 1) * 角度步长 + 旋转角度) * Math.PI / 180;
            
            ctx.beginPath();
            ctx.moveTo(中心X, 中心Y);
            ctx.arc(中心X, 中心Y, 半径, 起始角度, 结束角度);
            ctx.closePath();
            
            ctx.fillStyle = 奖励.颜色;
            ctx.fill();
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            ctx.save();
            ctx.translate(中心X, 中心Y);
            ctx.rotate(起始角度 + (角度步长 * Math.PI / 360));
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 12px "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif';
            ctx.fillStyle = '#555';
            ctx.shadowBlur = 0;
            
            const 文字X = 半径 * 0.68;
            const 文字Y = 0;
            ctx.fillText(奖励.名称, 文字X, 文字Y);
            ctx.restore();
        });
        
        ctx.beginPath();
        ctx.arc(中心X, 中心Y, 20, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(中心X, 中心Y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#f39c12';
        ctx.fill();
    }
    
    async function 执行抽奖() {
        if (是否正在旋转) {
            return;
        }
        
        是否正在旋转 = true;
        const 抽奖按钮 = document.getElementById('大转盘抽奖按钮');
        抽奖按钮.disabled = true;
        抽奖按钮.style.opacity = '0.6';
        抽奖按钮.style.cursor = 'not-allowed';
        
        const params = {
            action: 'sign_in',
            password: 开发者安全密码
        };
        
        try {
            const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('签到.php'), params);
            if (!result.success) {
                alert(result.message, false);
                是否正在旋转 = false;
                抽奖按钮.disabled = false;
                抽奖按钮.style.opacity = '1';
                抽奖按钮.style.cursor = 'pointer';
                return;
            }
            
            updateinfo();
            let 中奖索引 = result.data.prize_index;
            let 中奖金额 = result.data.prize_amount;

            const 中奖奖励 = 奖励列表[中奖索引];
            
            const 每项角度 = 360 / 奖励列表.length;
            const 箭头方向角度 = -90;
            const 奖品中间角度 = 中奖索引 * 每项角度 + 每项角度 / 2;
            let 目标旋转 = (箭头方向角度 - 奖品中间角度 + 360) % 360;
            const 当前模 = ((当前旋转角度 % 360) + 360) % 360;
            let 增加度数 = 目标旋转 - 当前模;
            if (增加度数 <= 0) 增加度数 += 360;
            const 圈数 = 3 + Math.floor(Math.random() * 4);
            const 总增加度数 = 圈数 * 360 + 增加度数;
            const 目标总角度 = 当前旋转角度 + 总增加度数;
            
            const 开始时间 = performance.now();
            const 动画时长 = 2000;
            const 起始角度 = 当前旋转角度;
            
            function 动画(当前时间) {
                const 已过时间 = 当前时间 - 开始时间;
                let 进度 = Math.min(1, 已过时间 / 动画时长);
                // 缓动效果：easeOutCubic
                const 缓动进度 = 1 - Math.pow(1 - 进度, 3);
                
                当前旋转角度 = 起始角度 + 总增加度数 * 缓动进度;
                绘制转盘(当前旋转角度 % 360);
                
                if (进度 < 1) {
                    requestAnimationFrame(动画);
                } else {
                    当前旋转角度 = 目标总角度;
                    绘制转盘(当前旋转角度 % 360);
                    
                    const 结果提示 = document.getElementById('抽奖结果提示');
                    if (中奖奖励.金额 > 0) {
                        结果提示.innerHTML = `<i class="fas fa-trophy" style="color: #f39c12; margin-right: 6px;"></i>
                                              恭喜获得：${中奖奖励.名称}<br>`;
                    } else {
                        结果提示.innerHTML = `<i class="fas fa-frown" style="color: #999; margin-right: 6px;"></i>
                                               ${中奖奖励.名称},明天再来碰碰运气<br>`;
                    }
                    
                    是否正在旋转 = false;
                    抽奖按钮.disabled = false;
                    抽奖按钮.style.opacity = '1';
                    抽奖按钮.style.cursor = 'pointer';
                }
            }
            
            requestAnimationFrame(动画);
            
        } catch (error) {
            alert('签到失败：' + error.message, false);
            是否正在旋转 = false;
            抽奖按钮.disabled = false;
            抽奖按钮.style.opacity = '1';
            抽奖按钮.style.cursor = 'pointer';
        }
    }
    
    const 关闭弹窗 = () => {
        const modalElement = document.querySelector('.大转盘弹窗');
        if (modalElement) modalElement.remove();
    };
    
    绘制转盘(0);
    
    const closeXBtn = document.getElementById('大转盘关闭X');
    if (closeXBtn) closeXBtn.onclick = 关闭弹窗;
    
    const 关闭按钮 = document.getElementById('大转盘关闭按钮');
    if (关闭按钮) 关闭按钮.onclick = 关闭弹窗;
    
    const 抽奖按钮 = document.getElementById('大转盘抽奖按钮');
    if (抽奖按钮) 抽奖按钮.onclick = 执行抽奖;
    
    modal.onclick = (e) => {
        if (e.target === modal) 关闭弹窗();
    };
}


let 统计项目名称 = '卡密接口请求数量';

/* 当前统计通道（后端 ApiLog::channelFromLabel 解析 name 得到） */
function 当前统计通道键() {
    /* 用户端只有三个下拉项：卡密 / 用户 / 云更新 */
    if (统计项目名称.indexOf('用户请求') === 0) return 'user';
    if (统计项目名称.indexOf('云更新') === 0) return 'cloud';
    return 'key';
}

var 当前统计通道 = 当前统计通道键();

/* 当前时间窗口：1h / 24h / 7d / month */
var 当前流量窗口 = '24h';



function 刷新流量数据(name) {
统计项目名称 = name;
当前统计通道 = 当前统计通道键();
updateinfo();
}










/**
 * 渲染用户等级徽章 + VIP 徽章 + 升级进度
 *
 * 后端 EnvGateway::updateInfo() 返回：
 *   tier = { tier:{level,key,name,icon,color,color2,ring,spend,threshold,
 *                  next_name,next_threshold,next_need,progress,is_max,total_tiers},
 *            vip:{is_vip,text,name,color,color2}, tiers_all:[...] }
 */
function 渲染用户等级(data) {
    var wrap = data && data.tier;
    if (!wrap || !wrap.tier) return;
    var t = wrap.tier;
    var v = wrap.vip || {};

    var 等级徽章 = document.getElementById('Userlevel');
    if (等级徽章) {
        等级徽章.style.display = 'inline-flex';
        等级徽章.className = 'jy-badge jy-badge-' + (t.key || 'L0');
        等级徽章.style.background = 'linear-gradient(135deg,' + t.color + ',' + t.color2 + ')';
        等级徽章.innerHTML = '<i class="fas ' + (t.icon || 'fa-user') + '"></i><span>' + t.name + '</span>';
        等级徽章.title = '累计消费 ¥' + t.spend + ' / 本级门槛 ¥' + t.threshold
            + (t.is_max ? '（已达最高等级）' : '，距 ' + t.next_name + ' 还差 ¥' + t.next_need);
    }

    var VIP徽章 = document.getElementById('Viplevel');
    if (VIP徽章) {
        if (Number(v.is_vip) === 1) {
            VIP徽章.style.display = 'inline-flex';
            VIP徽章.innerHTML = '<i class="fas fa-crown"></i><span>' + (v.text || 'VIP') + '</span>';
        } else {
            VIP徽章.style.display = 'none';
        }
    }

    var 进度盒 = document.getElementById('TierProgress');
    var 进度条 = document.getElementById('TierBarFill');
    var 进度字 = document.getElementById('TierProgressText');
    if (进度盒 && 进度条 && 进度字) {
        if (t.is_max) {
            进度盒.style.display = 'flex';
            进度条.style.width = '100%';
            进度条.style.background = 'linear-gradient(90deg,' + t.color + ',' + t.color2 + ')';
            进度字.textContent = '已达最高等级';
        } else {
            进度盒.style.display = 'flex';
            进度条.style.width = Math.max(0, Math.min(100, Number(t.progress) || 0)) + '%';
            进度条.style.background = 'linear-gradient(90deg,' + t.color + ',' + t.color2 + ')';
            进度字.textContent = '累计 ¥' + t.spend + ' · 再消费 ¥' + t.next_need + ' 升 ' + t.next_name;
        }
    }

    window.用户等级 = t;
    window.用户VIP徽章 = v;
}

async function updateinfo() {
    /* 下拉项 name 决定统计通道；window 决定时间窗口
       后端 EnvGateway::updateInfo() 两个都透传给 UserFlow::forUser() */
    当前统计通道 = 当前统计通道键();
    const params = {
        action: 'update_info',
        password: 开发者安全密码,
        name: 统计项目名称,
        window: 当前流量窗口
    };
    
    
    
    
    
    const trendEl = document.getElementById('流量趋势图');
    const totalEl = document.getElementById('流量统计_总量');
    const unknownEl = document.getElementById('流量统计_未知');
    
    



    const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), params);
    
    if (result.success) {
document.getElementById('displayUsername').textContent = result.data.user_name;
document.getElementById('usernameField').textContent = result.data.username;
document.getElementById('huiyuanField').textContent = String(result.data.vip_info.vip_status || '').replace(/[（(]至[^）)]*[）)]/g, '').trim();

    // 同步全局会员状态（卡密定价、VIP 选项开关都依赖它）
    会员状态 = result.data.vip_info.vip_status || '未开通';
    window.会员状态 = 会员状态;
    window.是否VIP = !!result.data.vip_info.is_vip;
    window.VIP加密签名矩阵 = result.data.vip_info.matrix || null;
// 余额格式化：固定 2 位小数 + 千分位，避免 389053.6144488 这种超长串把按钮撑爆
        var __bal = Number(result.data.balance);
        var __balTxt = isNaN(__bal) ? String(result.data.balance)
            : '¥' + __bal.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        var __bd = document.getElementById('balanceDisplay');
        if (__bd) { __bd.textContent = __balTxt; __bd.title = '账户余额 ' + __balTxt + '（点击充值）'; }
        var __bf = document.getElementById('balanceField');
        if (__bf) { __bf.textContent = __balTxt; }
document.getElementById('qiandaoField').textContent = result.data.签到;
// 等级 / 标签体系：按累计消费渲染徽章 + VIP 叠加徽章 + 升级进度
    渲染用户等级(result.data);
document.getElementById('accompanyDays').textContent = result.data.days_since_created;
document.getElementById('lastLoginField').textContent = result.data.last_login_time;


    await 设置头像(result.data.avatar_url, result.data.qq);




        /* ===== 流量趋势图（JYTrend / ECharts 堆叠面积） =====
           数据另走 update_flow_series（时间桶 × 地区），与上面的聚合口径一致 */
        const httpData = result.data.http || {};
        if (totalEl) totalEl.textContent = Number(httpData.total) || 0;
        if (unknownEl) unknownEl.textContent = Number(httpData.unresolved) || 0;
        流量趋势_初始化();
        await 流量趋势_加载();




    } else {
        alert('刷新失败:' + result.message);
    }
    
    return result;
}
async function 充值会员() {
    if(!开发者UID){return;}
    if (document.getElementById('membershipModal')) return;
    
    const modal = document.createElement('div');
    modal.id = 'membershipModal';
    modal.classList.add('弹窗遮罩');
    
    // 套餐从后端 vip_plans 拉取，失败时回退内置默认
    let 会员类型 = [];
    try {
        const r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), { action: 'get_vip_plans', password: 开发者安全密码 });
        if (r && r.success && r.data && Array.isArray(r.data.plans) && r.data.plans.length) {
            会员类型 = r.data.plans.map(x => ({ name: x.name, days: x.days, price: Number(x.price) }));
            window.当前会员余额 = r.data.balance;
            window.当前是否VIP = !!r.data.is_vip;
            window.当前VIP状态文案 = r.data.vip_status || '未开通';
        }
    } catch (e) {}
    if (!会员类型.length) {
        会员类型 = [
            { name: '一个月', days: 30, price: 25.00 },
            { name: '三个月', days: 90, price: 60.00 },
            { name: '半年', days: 180, price: 100.00 },
            { name: '一年', days: 365, price: 180.00 }
        ];
    }
    window.当前会员套餐表 = 会员类型;
    
    modal.innerHTML = `
        <div class="弹窗背景">
            <div class="弹窗头部">
                <div class="弹窗头部文字">
                    <i class="fas fa-crown" style="color: #FFD700;"></i>
                    <h4>获取会员</h4>
                </div>
                <button onclick="closeMembershipModal()" 
                        class="弹窗头部关闭按钮">
                    &times;
                </button>
            </div>
            
            <div class="弹窗内部">
                <div style="font-size:13px;font-weight:500;color:#333;margin-bottom:10px;">选择会员时长：</div>
                <div style="margin-bottom:15px;">
                    ${会员类型.map((type, index) => `
                        <div onclick="selectMembershipType('${type.name}')" 
                             id="membershipType${index}"
                             style="border:1px solid #ddd;border-radius:6px;padding:12px 15px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <div>
                                    <div style="font-weight:bold;color:#333;">${type.name}</div>
                                    <div style="font-size:12px;color:#666;margin-top:2px;">${type.days}天有效期</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:18px;font-weight:bold;color:#f59e0b;">¥${type.price}</div>
                                    <div style="font-size:11px;color:#999;">平均每月¥${(type.price / (type.days/30)).toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="弹窗底部">
                <button onclick="closeMembershipModal()" 
                        style="padding:8px 16px;background:#f8f9fa;color:#666;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;">
                    取消
                </button>
                <button onclick="confirmMembershipPurchase()" 
                        id="confirmMembershipBtn"
                        style="padding:8px 16px;background:#667eea;color:white;border:none;border-radius:20px;cursor:pointer;font-size:13px;font-weight:500;">
                    确认开通
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.当前选中会员类型 = 会员类型[0].name;
    window.当前选中会员信息 = 会员类型[0];
    const firstOption = document.getElementById('membershipType0');
    if (firstOption) {
        firstOption.style.borderColor = '#667eea';
        firstOption.style.background = '#f0f5ff';
    }
}

function selectMembershipType(typeName) {
    const 会员类型 = window.当前会员套餐表 || [];
    
    const index = 会员类型.findIndex(t => t.name === typeName);
    if (index === -1) return;
    
    for (let i = 0; i < 会员类型.length; i++) {
        const el = document.getElementById('membershipType' + i);
        if (el) {
            el.style.borderColor = '#ddd';
            el.style.background = '';
        }
    }
    
    const selected = document.getElementById('membershipType' + index);
    if (selected) {
        selected.style.borderColor = '#667eea';
        selected.style.background = '#f0f5ff';
    }
    
    window.当前选中会员类型 = typeName;
    window.当前选中会员信息 = 会员类型[index];
}

function closeMembershipModal() {
    const modal = document.getElementById('membershipModal');
    if (modal) modal.remove();
}

async function confirmMembershipPurchase() {
    if (!window.当前选中会员类型) {
        alert('请选择会员时长');
        return;
    }
    if (!confirm('确定购买此会员服务吗？')) {
        alert('操作取消');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmMembershipBtn');
    if (!confirmBtn) return;
    
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 开通中...';
    confirmBtn.disabled = true;
    
    try {
        const info = window.当前选中会员信息 || {};
        const params = {
            action: 'recharge_member',
            duration_type: window.当前选中会员类型,
            days: info.days || 0,
            password: 开发者安全密码
        };
        
        const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), params);
        
        if (result.success) {
            alert(result.message, true);
            closeMembershipModal();
            await updateinfo();
            // 同步全局 VIP 标记，立即解禁高级选项
            是否VIP = true;
            window.是否VIP = true;
            会员状态 = (result.data && result.data.vip_status) || '会员有效';
            window.会员状态 = 会员状态;
            if (typeof 应用VIP限制 === 'function') 应用VIP限制();
        } else {
            alert(result.message, false);
        }
    } catch (error) {
        alert('网络错误，请重试');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function closeMembershipModal() {
    const modal = document.getElementById('membershipModal');
    if (modal) {
        modal.remove();
    }
    delete window.当前选中会员类型;
    delete window.当前选中会员信息;
}


/* 本站信息：创站时间 / 运行天数 / 周年倒计时 / 备案号 全部由后端下发
   数据源 /前台/站点信息.php → admin_settings.site_build_date / site_icp
   管理员在「站点设置」里改，这里立刻生效，不再硬编码 */
function 刷新本站信息() {
    const render = function (d) {
        const setTxt = function (id, v) {
            const el = document.getElementById(id);
            if (el) el.innerText = v;
        };
        setTxt('buildDateText', d.build_date_text || '—');
        setTxt('runDays', d.days);
        setTxt('runYears', d.years);
        setTxt('daysToNextYear', d.days_to_next);
        const icpElement = document.getElementById('icpNumber');
        if (icpElement) {
            icpElement.innerText = (d.icp && d.icp.length) ? d.icp : '未备案';
        }
    };

    const domainElement = document.getElementById('websiteDomain');
    if (domainElement) {
        domainElement.innerText = window.location.hostname;
    }

    fetch('/前台/站点信息.php?_=' + Date.now(), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (d && d.success) { render(d); return; }
            throw new Error('bad payload');
        })
        .catch(function () {
            /* 后端不可达时退回本地推算，日期与后端默认值保持一致 */
            const startDate = new Date(2025, 9, 21);
            const now = new Date();
            const daysRunning = Math.floor((now - startDate) / 86400000);
            let yearsRunning = now.getFullYear() - startDate.getFullYear();
            if (now < new Date(now.getFullYear(), startDate.getMonth(), startDate.getDate())) yearsRunning--;
            let nextAnn = new Date(now.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (now >= nextAnn) nextAnn = new Date(now.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
            render({
                build_date_text: startDate.getFullYear() + '年' + (startDate.getMonth() + 1) + '月' + startDate.getDate() + '日',
                days: daysRunning >= 0 ? daysRunning : 0,
                years: yearsRunning < 0 ? 0 : yearsRunning,
                days_to_next: Math.max(0, Math.ceil((nextAnn - now) / 86400000)),
                icp: ''
            });
        });
}
/* =====================================================================
 * 流量趋势图（仪表盘「今日流量」）
 * 数据：action=update_flow_series → UserFlow::series()
 * 交互：时间段切换（24 小时 / 7 天 / 本月）、悬停看地区明细
 * ===================================================================*/
var 流量趋势api = null;
var 流量趋势seq = 0;
var 流量趋势_已回退 = false;

function 流量趋势_同步时间段() {
    var tabs = document.querySelectorAll('#流量趋势_时间段 button');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('on', tabs[i].getAttribute('data-window') === 当前流量窗口);
    }
}

function 流量趋势_初始化() {
    var el = document.getElementById('流量趋势图');
    if (!el || !window.JYTrend) return;
    if (!流量趋势api) {
        流量趋势api = window.JYTrend.mount(el);
    } else {
        流量趋势api.resize();
    }
}

async function 流量趋势_加载() {
    if (!document.getElementById('流量趋势图')) return;
    if (!window.JYTrend) return;
    if (!流量趋势api) 流量趋势_初始化();
    if (!流量趋势api) return;

    var seq = ++流量趋势seq;
    流量趋势api.loading(true);
    try {
        var r = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
            action: 'update_flow_series',
            password: 开发者安全密码,
            name: 统计项目名称,
            window: 当前流量窗口
        });
        if (seq !== 流量趋势seq) return;

        /* 第一次进来如果 24 小时没数据、近 7 天有，就自动切到「7 天」，
           免得一打开就是空态像坏了（只自动切一次，之后完全听用户的） */
        if (r && r.success && r.data && !Number(r.data.total)
            && 当前流量窗口 === '24h' && !流量趋势_已回退) {
            流量趋势_已回退 = true;
            var r7 = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('api.php'), {
                action: 'update_flow_series',
                password: 开发者安全密码,
                name: 统计项目名称,
                window: '7d'
            });
            if (seq !== 流量趋势seq) return;
            if (r7 && r7.success && r7.data && Number(r7.data.total) > 0) {
                r = r7;
                当前流量窗口 = '7d';
                var tabs7 = document.querySelectorAll('#流量趋势_时间段 button');
                for (var i7 = 0; i7 < tabs7.length; i7++) {
                    tabs7[i7].classList.toggle('on', tabs7[i7].getAttribute('data-window') === '7d');
                }
            }
        }

        if (r && r.success && r.data && r.data.window) {
            当前流量窗口 = r.data.window;
            流量趋势_同步时间段();
        }
        if (r && r.success && r.data) {
            var tEl = document.getElementById('流量统计_总量');
            var uEl = document.getElementById('流量统计_未知');
            var aEl = document.getElementById('流量统计_平均');
            var n = (r.data.buckets || []).length || 1;
            if (tEl) tEl.textContent = Number(r.data.total) || 0;
            if (uEl) uEl.textContent = Number(r.data.unresolved) || 0;
            if (aEl) aEl.textContent = Math.round((Number(r.data.total) || 0) / n);
        }
        流量趋势api.update(r && r.success ? r.data : null);
    } catch (e) {
        if (seq === 流量趋势seq) 流量趋势api.update(null);
    } finally {
        if (seq === 流量趋势seq) 流量趋势api.loading(false);
    }
}

document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('#流量趋势_时间段 button') : null;
    if (!btn) return;
    var w = btn.getAttribute('data-window');
    if (!w || w === 当前流量窗口) return;
    当前流量窗口 = w;
    var all = document.querySelectorAll('#流量趋势_时间段 button');
    for (var i = 0; i < all.length; i++) {
        all[i].classList.toggle('on', all[i] === btn);
    }
    流量趋势_加载();
});
