<?php
// 全站访问打点（page 通道）：用户后台
require_once dirname(__DIR__, 2) . '/_backend.php';
try { \JY\ApiLog::visitAuto('用户后台'); } catch (\Throwable $e) {}

/**
 * 对接文件下载项：默认值写在这里，部署后可按需修改。
 */
$对接文件 = [
    'dl_jni_title' => '极验 JNI SDK对接',
    'dl_jni_desc'  => '版本号:1.1,适用于JNI层操作(手动对接卡密验证)',
    'dl_jni_url'   => 'https://example.com/downloads/jni-sdk.zip',
    'dl_dex_title' => '极验 Java Dex对接',
    'dl_dex_desc'  => '自动化Dex注入对接，适合无JNI开发能力的项目',
    'dl_dex_url'   => 'https://example.com/downloads/java-dex.zip',
];
$e = static fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">

    <title>极验云</title>

    <link rel="stylesheet" href="/公共资源/fa.all.min.css?v=20261025full">
    <script src="/公共资源/vendor/md5.min.js"></script>
    <script src="/公共资源/vendor/jsencrypt.min.js"></script>
    <script src="/公共资源/vendor/crypto-js.min.js"></script>
    <script src="/公共资源/vendor/ripemd160.min.js"></script>
    <script src="/公共资源/vendor/sha3.min.js"></script>
    
    

    <style>
    @import url("/前台/后台模块/弹窗.css?v=20261021tier1");
  @import url("/前台/后台模块/二次元壁纸.css");
  @import url("/前台/后台模块/页面加载动画.css");
    
    
    @import url("/前台/后台模块/css/侧边栏.css?v=20261105c");
    @import url("/前台/后台模块/css/头部栏.css?v=20261112a");
    @import url("/前台/后台模块/css/表格.css");
    @import url("/前台/后台模块/css/style.css");
    @import url("/前台/后台模块/css/v1.css?v=20261021r10");

    /* Sidebar logo inherits the same base style as the admin console. */
    
/* ============================================================
   用户后台 · iOS 风格统一（2026-11-05）
   ------------------------------------------------------------
   与官网首页保持同一套设计语言：
     · 二次元壁纸保留，内容用近实心白色大圆角卡片承托
     · 按钮统一为胶囊 / 大圆角，模糊毛玻璃
     · 卡片、表格、分页、输入框全部统一圆角与阴影层级
   ============================================================ */

/* ── 页头 ─────────────────────────────────────────────── */
.page-title{
  font-size:clamp(22px,3.4vw,30px)!important;
  font-weight:700!important;
  letter-spacing:-.026em!important;
  color:#1d1d1f;
}
html[data-jy-theme="dark"] .page-title{color:#f5f5f7}

/* ── 卡片：近实心 + 大圆角 ─────────────────────────────── */
.card{
  background:rgba(255,255,255,.9)!important;
  border:1px solid rgba(255,255,255,.94)!important;
  border-radius:22px!important;
  box-shadow:0 2px 18px rgba(0,0,0,.05)!important;
  backdrop-filter:blur(20px) saturate(170%);
  -webkit-backdrop-filter:blur(20px) saturate(170%);
  overflow:hidden;
}
.card-header{
  background:transparent!important;
  border-bottom:1px solid rgba(0,0,0,.06)!important;
  padding:16px 20px!important;
  font-weight:650!important;
  letter-spacing:-.014em;
}
.card-body{padding:18px 20px!important}
html[data-jy-theme="dark"] .card{
  background:rgba(28,28,30,.88)!important;
  border-color:rgba(255,255,255,.09)!important;
}
html[data-jy-theme="dark"] .card-header{border-bottom-color:rgba(255,255,255,.08)!important}

/* ── 统计条 ───────────────────────────────────────────── */
.card-header-stat-value{
  font-size:clamp(17px,2.4vw,22px)!important;
  font-weight:700!important;
  letter-spacing:-.02em!important;
  font-variant-numeric:tabular-nums;
}
.card-header-stat-label{
  font-size:12px!important;
  color:#86868b!important;
  letter-spacing:.01em;
}

/* ── 按钮：统一胶囊 ───────────────────────────────────── */
.按钮,.btn,.jy-btn{
  border-radius:980px!important;
  padding:10px 20px!important;
  font-size:13.5px!important;
  font-weight:600!important;
  letter-spacing:-.008em;
  transition:transform .18s ease,box-shadow .18s ease,background .18s ease!important;
  border:none;
  box-shadow:0 1px 3px rgba(0,0,0,.06);
}
.按钮:hover,.btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,0,0,.1)}
.按钮:active,.btn:active{transform:translateY(0) scale(.98)}
.分页按钮,.分页按钮组按钮{
  border-radius:10px!important;
  min-width:34px;height:34px;
  font-size:13px!important;
}

/* ── 表格：圆角容器 + 轻分隔 ──────────────────────────── */
/* 注意：这里必须是 overflow-x:auto 而不是 overflow:hidden，
   否则表格右侧的「查询绑定 / 解绑 / 封禁」等操作列会被裁掉，用户无法横向滚动查看。
   原始定义（前台/后台模块/css/表格.css:8）本来就是 overflow-x:auto，
   之前的 iOS 覆盖层误写成 overflow:hidden，导致子用户管理列表看不到后面的功能列。 */
.rounded-table-container{
  border-radius:18px!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-x:contain;
  border:1px solid rgba(0,0,0,.06);
  background:rgba(255,255,255,.72);
}
.rounded-table-container::-webkit-scrollbar{height:8px}
.rounded-table-container::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border-radius:4px}
.rounded-table-container::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.3)}
html[data-jy-theme="dark"] .rounded-table-container::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2)}
.rounded-table thead th{
  background:rgba(0,0,0,.028)!important;
  font-weight:640!important;
  font-size:12.5px!important;
  color:#6e6e73!important;
  letter-spacing:.01em;
  border-bottom:1px solid rgba(0,0,0,.07)!important;
  padding:11px 14px!important;
}
.rounded-table tbody td{
  padding:12px 14px!important;
  font-size:13.5px!important;
  border-bottom:1px solid rgba(0,0,0,.045)!important;
}
.rounded-table tbody tr:hover{background:rgba(0,113,227,.035)}
html[data-jy-theme="dark"] .rounded-table-container{
  background:rgba(28,28,30,.8);border-color:rgba(255,255,255,.08);
}
html[data-jy-theme="dark"] .rounded-table thead th{background:rgba(255,255,255,.04)!important;color:#a1a1a6!important}
html[data-jy-theme="dark"] .rounded-table tbody td{border-bottom-color:rgba(255,255,255,.06)!important}

/* ── 输入框 ───────────────────────────────────────────── */
.form-control,.input,input[type="text"],input[type="password"],input[type="number"],select,textarea{
  border-radius:12px!important;
  border:1px solid rgba(0,0,0,.1)!important;
  padding:9px 13px!important;
  font-size:13.5px!important;
  transition:border-color .16s,box-shadow .16s;
}
.form-control:focus,.input:focus,input:focus,select:focus,textarea:focus{
  border-color:#0071e3!important;
  box-shadow:0 0 0 3.5px rgba(0,113,227,.14)!important;
  outline:none!important;
}

/* ── 弹窗 ─────────────────────────────────────────────── */
.弹窗,.modal-content{
  border-radius:26px!important;
  border:1px solid rgba(255,255,255,.9);
  box-shadow:0 24px 70px rgba(0,0,0,.2)!important;
}

/* ── 导航项：统一圆角与选中态 ──────────────────────────── */
.nav-item{
  border-radius:11px!important;
  margin:2px 10px!important;
  padding:11px 14px!important;
  font-size:13.5px!important;
  letter-spacing:-.008em;
  transition:background .16s,color .16s;
}
.nav-item.active{
  background:#0a0a0c!important;
  color:#fff!important;
  box-shadow:0 4px 14px rgba(0,0,0,.18);
}
.section-title{
  font-size:10.5px!important;
  font-weight:650!important;
  letter-spacing:.1em!important;
  text-transform:uppercase;
  color:#a1a1a6!important;
  padding:14px 20px 6px!important;
}

/* ── 内容区留白 ───────────────────────────────────────── */
.content{padding:clamp(16px,2.4vw,26px)!important}
.page{animation:jyFade .26s ease}
@keyframes jyFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

@media (max-width:844px){
  .card{border-radius:18px!important}
  .card-header{padding:14px 16px!important}
  .card-body{padding:14px 16px!important}
  .按钮,.btn{min-height:42px;padding:10px 18px!important}
  .content{padding:14px!important}
}

</style>
    <link rel="stylesheet" href="/前台/静态资源/theme.css?v=20261021flow2">
    <script src="/前台/静态资源/theme.js?v=20261020h"></script>
<link rel="stylesheet" href="/公共资源/ui-fixes.css?v=20261025a">
<link rel="stylesheet" href="/前台/后台模块/css/侧边栏v2.css?v=20261112d">



<!-- ===== 侧边栏滚动终极修复 2026-11-05 (inline，不受外链缓存影响) ===== -->
<style id="jy-sidebar-scroll-fix">
/* 真机根因：height:100vh 在移动浏览器上等于「最大视口高度」，
   而地址栏/工具栏占掉一部分后，真实可视区比 100vh 小。
   于是侧栏底部（含最后几个按钮）落在屏幕外，
   scrollTop 即使到了 max，最后一项仍在视口之外 —— 表现就是「滑不到最后一个」。

   解法：不用 height，改用 top:0 + bottom:0，
   高度自动等于真实视口，不依赖 vh 单位，也不依赖 dvh 的新旧浏览器支持。 */
.sidebar,
#adminApp .sidebar {
  position: fixed !important;
  top: 0 !important;
  bottom: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  -webkit-overflow-scrolling: touch !important;
  overscroll-behavior-y: contain;
  touch-action: pan-y;
}

/* nav 退化为普通项，滚动全交给 .sidebar，避免「只有某一段能滚」 */
.sidebar-nav,
#adminApp .sidebar-nav {
  flex: 0 0 auto !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: none !important;
  overflow: visible !important;
  overflow-y: visible !important;
}

.sidebar-header,
.sidebar-footer,
#adminApp .sidebar-header,
#adminApp .sidebar-footer {
  flex: 0 0 auto !important;
  position: static !important;
}

/* 移动端抽屉态：transform 隐藏时仍保持定位，展开后同样 top/bottom 贴边 */
@media (max-width: 844px) {
  .sidebar,
  #adminApp .sidebar {
    height: auto !important;
    max-height: none !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
  }
}

.sidebar::-webkit-scrollbar { width: 6px; }
.sidebar::-webkit-scrollbar-thumb { background: rgba(0,0,0,.16); border-radius: 999px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
</style>
</head>
<body class="sb-v2">

<div id="Env_load">
  <div class="spinner"></div>
  <div class="loading-text">正在加载数据</div>
</div>



<div id="Env_main" style="display: none;">



<div class="sidebar">
<div class="sidebar-header">
    <a class="sidebar-logo" href="/home.html" title="返回首页">
        <img class="sidebar-logo-img" src="/前台/后台模块/image/jiyan-logo.png" alt="极验云">
        <div class="sidebar-logo-content">
            <div class="logo-title-row">
                <h1 class="sidebar-logo-title">极验云</h1>
            </div>
            <p class="sidebar-logo-subtitle">官方频道@HQSWCN</p>
        </div>
    </a>
</div>







<div class="jy-theme-row">
    <span id="userThemeLabel">深色模式</span>
    <label class="jy-theme-switch">
        <input type="checkbox" id="userDarkMode" data-jy-theme-toggle role="switch" aria-labelledby="userThemeLabel">
        <span class="jy-theme-track" aria-hidden="true"></span>
    </label>
</div>





    <div class="sidebar-nav">
<div class="nav-section">
            <div class="section-title">账号信息</div>
            <div class="nav-item active" data-page="profile"><i class="fas fa-tachometer-alt"></i><span>仪表盘</span></div>
            <div class="nav-item" data-page="traffic"><i class="fas fa-history"></i><span>操作留痕</span></div>
            <div class="nav-item" data-page="appManagement"><i class="fas fa-cubes"></i><span>应用实例</span></div>
        </div>

        <div class="nav-section">
            <div class="section-title">主要功能</div>
            <div class="nav-item" data-page="users"><i class="fas fa-users-cog"></i><span>子用户管理</span></div>
            <div class="nav-item" data-page="cards"><i class="fas fa-key"></i><span>卡密管理</span></div>
            <div class="nav-item" data-page="cloudUpdate"><i class="fas fa-cloud-upload-alt"></i><span>云更新管理</span></div>
        </div>
        
        


        <div class="nav-section">
            <div class="section-title">其他功能</div>
            <div class="nav-item" data-page="api"><i class="fas fa-book"></i><span>对接文档</span></div>
            <div class="nav-item" data-page="settings"><i class="fas fa-cog"></i><span>账号设置</span></div>
            <div class="nav-item" data-page="benzhan"><i class="fas fa-info-circle"></i><span>本站信息</span></div>
        </div>
    </div>
</div>






    <div class="main-content" id="mainContent">
        
            <div class="top-bar">
                <div style="display: flex; align-items: center;">
                    
<button class="menu-toggle" id="menuToggle">
<i class="fas fa-bars"></i>
</button>
<div class="page-heading">
    <div class="page-crumb" id="pageCrumb">控制台 / 概览</div>
    <div class="page-title" id="pageTitle">仪表盘</div>
</div>
                    


                </div>
                
 




                <div class="header-actions">


<button class="balance-btn" id="balanceDisplay" onclick="充值账号()">¥-1</button>


<select class="form-control" id="应用选择下拉" onclick = "刷新选择器()"onchange="处理应用发生变化()" style="
    width: 100px;
    height: 32px;
    padding: 2px 2px;
    display: none;">
<option value="" id="placeholderOptionuser">选择应用</option>
</select>





                        
                        
 


                    
                    
                    
                </div>
            </div>
            
            
            
<div class="sidebar-overlay" id="sidebarOverlay"></div>
            
<div class="content">




<div class="page active" id="profile">
        
    <div class="card">
        <div class="card-header">
            <h3>
  
  <span style="margin-right: 5px;">基本信息</span>
</h3>
                           


        </div>
        
        
        
        
        
        
        
        
        <div class="card-body" style="padding: 10px;">
            <div style="display: flex; align-items: flex-start; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #f1f3f4;">
                
                
                
                
                
                
                
<div 
  class="user-avatar jy-profile-avatar" 
  id="eNVAvatar1"
  title="点击刷新头像"
  onclick="if(window.刷新头像){window.刷新头像();}else if(window.加载账号绑定){window.加载账号绑定();}"
  style="
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    margin-right: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    cursor: pointer;
    border: none;box-shadow: var(--shadow);
  "
>
  <img 
    src="/公共资源/jiyan-logo-192.png" referrerpolicy="no-referrer"
    alt="用户头像" 
    style="
      width: 100%;
      height: 100%;
    "
  >

                    <i class="fas fa-user"></i>
                </div>
                
                
                
                <div class="jy-profile-info" style="flex:1;min-width:0;">
                    <div class="jy-profile-title" style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
                        <h3 style="margin:0;font-size:18px;font-weight:600;" id="displayUsername">开发者</h3>
                        <div id="Userlevel" class="jy-badge" style="display:none;">新手</div>
                        <div id="Viplevel" class="jy-badge jy-badge-vip" style="display:none;">VIP</div>
                    </div>
                    <div id="TierProgress" class="jy-tier-progress" style="display:none;">
                        <div class="jy-tier-bar"><i id="TierBarFill"></i></div>
                        <span id="TierProgressText"></span>
                    </div>
                    <div style="font-size:13px;color:#6c757d;">用户ID: <span id="usernameField">JiYan_未知</span></div>
                </div>
            </div>
<div style="display: grid; gap: 10px;">
    <div style="background: #ffffff78; border-radius: 15px; padding: 10px;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 3px; height: 23px; background: #df458c; border-radius: 2px;"></div>
                <i class="fas fa-heart" style="color: #df458c; font-size: 18px;"></i>
            </div>
            <div style="font-size: 14px; color: #495057;">
                <span style="font-weight: 600;">极验</span> 陪你度过了 
                <span id="accompanyDays" style="font-weight: 700; color: #df458c; font-size: 18px;">0</span> 天
            </div>
        </div>
    </div>


<div style="background: #fffcfc4f; border-radius: 15px; padding: 10px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 12px;box-shadow: var(--shadow);">
                <i class="fas fa-wallet"></i>
            </div>
            <div>
                <div style="font-size: 12px; color: #6c757d; font-weight: 500;">账户余额</div>
                <div style="font-size: 17px; font-weight: 700; color: #212529; margin-top: 2px;" id="balanceField">0.00 元</div>
            </div>
        </div>

                <div class="button-container">
                <button class="按钮" onclick="支付_转账()">
                    <i class="fas fa-exchange-alt"></i> 转账
                </button>
                <button class="按钮" onclick="充值账号()">
                    <i class="fas fa-coins"></i> 充值
                </button>
        </div>
        
        
    </div>
</div>




<div style="background: #fffcfc4f; border-radius: 15px; padding: 10px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 12px;box-shadow: var(--shadow);">
                <i class="fas fa-crown"></i>
            </div>
            <div>
                <div style="font-size: 12px; color: #6c757d; font-weight: 500;">会员状态</div>
                <div style="font-size: 17px; font-weight: 700; color: #212529; margin-top: 2px;" id="huiyuanField">无会员</div>
            </div>
        </div>
        
<button class="按钮" onclick="充值会员()">
    <i class="fas fa-calendar-check"></i> 开通
</button>
                
                
    </div>
</div>
                
                
              <div style="background: #fffcfc4f; border-radius: 15px; padding: 10px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 12px;box-shadow: var(--shadow);">
                <i class="fas fa-calendar-check"></i>
            </div>
            <div>
                <div style="font-size: 12px; color: #6c757d; font-weight: 500;">每日抽奖</div>
                <div style="font-size: 17px; font-weight: 700; color: #212529; margin-top: 2px;" id="qiandaoField">抽奖状态未知</div>
            </div>
        </div>
        
        
                           <button class="按钮" onclick="账号签到()">
                    <i class="fas fa-calendar-check"></i> 抽奖
                </button>
                
                
    </div>
</div>



                <div style="background: #fffcfc4f; border-radius: 15px; padding: 10px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
            <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 12px;box-shadow: var(--shadow);">
                <i class="fas fa-clock"></i>
            </div>
            <div>
                <div style="font-size: 12px; color: #6c757d; font-weight: 500;">最后登录</div>
                <div style="font-size: 17px; font-weight: 700; color: #212529; margin-top: 2px;" id="lastLoginField">2023-12-01 14:30:25</div>
            </div>
        </div>
   
    </div>
</div>


            </div>
        </div>
    </div>







    <div class="card">
    <div class="card-header">
        

<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 8px;">流量趋势</span>
    <i style="font-style:normal;font-size:11px;font-weight:400;color:#8e8e93;">按天汇总 · 悬停查看地区</i>
</h3>

</div>

<div>
 
<select class="form-control jy-select" onchange="刷新流量数据(this.value)" style="width: 120px; height: 32px; padding: 2px 2px;">
    <option value="卡密接口请求数量">卡密接口请求数量</option>
    <option value="用户请求数量">用户请求数量(同行识别等)</option>
    <option value="云更新请求数量">云更新请求数量</option>
</select>

</div>

</div>
    



        <div class="card-body" style="padding: 10px;">
            
            
            
<div class="jy-flow-head">
    <div class="jy-flow-range" id="流量趋势_时间段" role="tablist">
        <button type="button" data-window="24h" class="on">24 小时</button>
        <button type="button" data-window="7d">7 天</button>
        <button type="button" data-window="month">本月</button>
    </div>
    <div class="jy-flow-kpi">
        <span class="jy-flow-kpi-item primary">
            <b id="流量统计_总量">0</b>
            <i>总请求数</i>
        </span>
        <span class="jy-flow-kpi-item">
            <b id="流量统计_未知">0</b>
            <i>国外 / IPv6</i>
        </span>
        <span class="jy-flow-kpi-item">
            <b id="流量统计_平均">0</b>
            <i>平均 / 天</i>
        </span>
    </div>
</div>

<div id="流量趋势图" style="height:320px;margin-top:2px;"></div>
    
    
        </div>
    
    
    
    
    
    
</div>









</div>
<div class="page" id="traffic">

<div class="card">
<div class="card-header">
<div style="display: grid; gap: 10px;">
<h3 style="margin: 0; display: flex; align-items: center;">
    <span>登录日志</span>
        <span id="操作留痕_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>
</div>

</div>
    
<div class="card-body" style="padding: 10px;">

<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                

            
            
                <th>ID</th>
                <th>登录位置</th>
                <th>登录时间</th>
            </tr>
        </thead>
        <tbody id="操作留痕_登录日志_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
    
</div>




<div class="表格底部码页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="操作留痕_登录日志_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="操作留痕_登录日志_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="操作留痕_登录记录_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="操作留痕_登录记录_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="操作留痕_登录日志_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="操作留痕_登录记录_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="操作留痕_登录记录_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>



    
</div>


</div>

<div class="card">
<div class="card-header">
<div style="display: grid; gap: 10px;">
<h3 style="margin: 0; display: flex; align-items: center;">
    <span>余额变动</span>

</h3>
</div>

</div>
    
<div class="card-body" style="padding: 10px;">

<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                

            
            
                <th>ID</th>
                <th>原因</th>
                <th>大小</th>
                <th>执行时间</th>
                <th>执行地点</th>
                <th>状态</th>
            </tr>
        </thead>
        <tbody id="操作留痕_余额变动_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
    
</div>




<div class="表格底部码页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="操作留痕_余额变动_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="操作留痕_余额变动_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="操作留痕_余额变动_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="操作留痕_余额变动_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="操作留痕_余额变动_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="操作留痕_余额变动_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="操作留痕_余额变动_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>



    
</div>


</div>

</div>
<div class="page" id="appManagement">
    
    
    <div class="card">
    <div class="card-header">




<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 5px;">对接实例</span>
    <span id="对接实例_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>

</div>








<div>

        

        <input type="text" class="form-control form-control-sm d-inline-block" 
               style="width: 100px; height:26px;"
               placeholder="搜索应用名称..." 
               id = "对接实例_搜索框"
               onkeyup="对接实例_搜索关键词()">
        </input>

</div>




        
        
    </div>
    
    <div class="card-body" style="padding: 10px;">
        
        
            <!-- 统计信息 -->
    <div style="display: flex; gap: 10px;">
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="对接实例_统计_启用">0</div>
            <div class="card-header-stat-label">启用</div>
        </span>
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="对接实例_统计_停用">0</div>
            <div class="card-header-stat-label">停用</div>
        </span>
    </div>
    
    
<div id = "对接实例_多选功能id" style="display: inline-flex; align-items: center; display: none;margin-top: 10px;">
  <div style="
    width: 2px;
    height: 32px;
    background-color: #ddd;
    margin-right: 10px;
  "></div>
  <span style="vertical-align: middle;margin-right: 15px;">批量操作</span>
  

        
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="对接实例_批量改加密()">
    <i class="fas fa-lock"></i> 批量改加密
</button>

<!-- 批量改签名 -->
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="对接实例_批量改签名()">
    <i class="fas fa-signature"></i> 批量改签名
</button>

<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="对接实例_选中功能_删除()">
    <i class="fas fa-trash"></i> 删除
</button>
<!-- 禁用按钮 - 使用禁止图标 -->
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="对接实例_选中功能_禁用()">
    <i class="fas fa-ban"></i> 禁用
</button>

<!-- 启用按钮 - 使用检查/开启图标 -->
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="对接实例_选中功能_启用()">
    <i class="fas fa-check-circle"></i> 启用
</button>



</div>



<div style="display: grid; gap: 10px;margin-top:10px;">


<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px; ">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
          <i class="fas fa-plus"></i>
        </div>
        <div>
          <div style="font-size: 18px; color: #212529; font-weight: 700;">创建应用</div>
          <div style="font-size: 12px; color: #888; margin-top: 2px;">10 元/个，有实例额度优先抵扣，额度可积攒</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span id="appQuotaBadge" title="创建应用时优先抵扣，可购买积攒" style="padding: 6px 12px; border-radius: 999px; background: #eef4ff; color: #2563eb; font-size: 13px; font-weight: 600; white-space: nowrap; border: 1px solid #d7e4ff;">剩余额度 —</span>
        <button class="按钮" onclick="购买实例额度()" title="10 元购买 1 个实例额度，可积攒">
          <i class="fas fa-shopping-cart"></i> 购买额度
        </button>
        <button class="按钮" onclick="打开创建对接实例Modal()">
          <i class="fas fa-plus"></i> 创建应用
        </button>
      </div>
    </div>
  </div>
</div>

</div>









<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                
                
                
                
                
<th scope="col" class="对接实例-选择按钮">
    <input type="checkbox" 
           id="对接实例_选择所有_id"
           onchange="对接实例_全选所有(this)" 
           aria-label="全选">
</th>
            
            
            
            
                <th>PID</th>
                <th>应用名称</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>更新时间</th>
                <th>操作</th>
            </tr>
        </thead>
        <tbody id="对接实例_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
    
</div>




<div class="表格底部码页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="对接实例_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="对接实例_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="对接实例_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="对接实例_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="对接实例_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="对接实例_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="对接实例_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>



    
</div>


</div>



</div>









<div class="page" id="users">
    
    




<div class="card">
       <div class="card-header">




<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 5px;">子用户管理</span>
    <span id="子用户管理_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>

</div>






<div>


        <input type="text" class="form-control form-control-sm d-inline-block" 
               style="width: 100px; height:27px;margin-top: 5px;"
               placeholder="搜索子用户名称..." 
               id = "子用户管理_搜索框"
               onkeyup="子用户管理_搜索关键词()">
        </input>

</div>




        
        
    </div>
    
    <div class="card-body" style="padding: 10px;">
        
        
<div id="隐私模式_区块">
    <div style="display: flex; gap: 20px;margin-bottom:10px;">
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="子用户管理_统计_在线">0</div>
            <div class="card-header-stat-label">在线</div>
        </span>
        
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="子用户管理_统计_封禁">0</div>
            <div class="card-header-stat-label">封禁</div>
        </span>
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="子用户管理_统计_上限">0</div>
            <div class="card-header-stat-label">上限</div>
        </span>
    </div>
</div>
    
    
    
<div id = "子用户管理_多选功能id" style="display: inline-flex; align-items: center; display: none;">


  <div style="
    width: 2px;
    height: 32px;
    background-color: #ddd;
    margin-right: 10px;
  "></div>
  <span style="vertical-align: middle;margin-right: 10px;">批量操作</span>
  

        
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="子用户管理_选中功能_删除()">
    <i class="fas fa-trash"></i> 删除
</button>

<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="子用户管理_选中功能_封禁()">
    <i class="fas fa-ban"></i> 封禁
</button>


<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="子用户管理_选中功能_解封()">
    <i class="fas fa-check-circle"></i> 解封
</button>

</div>









<div style="display: grid; gap: 10px;">


<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-shadow: var(--shadow);">
          <i class="fas fa-users"></i>
        </div>
        <div>
          <div style="font-size: 18px; color: #212529; font-weight: 700;">子用户管理</div>
        </div>
      </div>
      <button class="按钮" onclick="子用户管理_管理()">
        <i class="fas fa-cog"></i> 管理
      </button>
    </div>
  </div>
</div>


</div>





<div id="隐私模式_区块">

<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                
                
                
                
                
<th scope="col" class="子用户管理-选择按钮">
    <input type="checkbox" 
           id="子用户管理_选择所有_id"
           onchange="子用户管理_全选所有(this)" 
           aria-label="全选">
</th>
            
            
            
            
                                <th>用户UID</th>
                                <th style="text-decoration: underline;" onclick="子用户管理_排序方式切换('在线')">是否在线</th>
                                <th style="text-decoration: underline;" onclick="子用户管理_同行识别介绍()">游戏UID</th>
                                <th>游戏昵称</th>
                                <th>封禁状态</th>
                                <th>解封时间</th>
                                <th style="text-decoration: underline;" onclick="子用户管理_排序方式切换('次数')">今日使用次数</th>
                                <th>上次登陆时间</th>
                                <th>IP位置</th>
                                <th>创建时间</th>
                                <th>操作</th>
            </tr>
        </thead>
        <tbody id="子用户管理_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
    
</div>

<div class="表格底部码页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="子用户管理_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="子用户管理_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="子用户管理_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="子用户管理_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="子用户管理_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="子用户管理_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="子用户管理_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>

</div>






</div>


</div>

</div>
<div class="page" id="cards">
    
    




<div class="card">
           <div class="card-header">




<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 5px;">卡密管理</span>
    <span id="卡密管理_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>

</div>






<div>

        <input type="text" class="form-control form-control-sm d-inline-block" 
               style="width: 100px; height:26px;"
               placeholder="搜索卡密..." 
               id = "卡密管理_搜索框"
               onkeyup="卡密管理_搜索关键词()">
        </input>

</div>




        
        
    </div>
    
    <div class="card-body" style="padding: 10px;">
        
        
<div id="隐私模式_区块">
    <div style="display: flex; gap: 20px; margin-bottom:10px;">
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="卡密管理_统计_激活">0</div>
            <div class="card-header-stat-label">使用中</div>
        </span>
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="卡密管理_统计_到期">0</div>
            <div class="card-header-stat-label">到期</div>
        </span>
    </div>
    </div>
    
<div id = "卡密管理_多选功能id" style="display: inline-flex; align-items: center; display: none;\">



  <div style="
    width: 2px;
    height: 32px;
    background-color: #ddd;
    margin-right: 10px;
  "></div>
  <span style="vertical-align: middle;margin-right: 10px;">批量操作</span>
  

        
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="卡密管理_选中功能_删除()">
    <i class="fas fa-trash"></i> 删除
</button>

<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="卡密管理_选中功能_导出()">
    <i class="fas fa-file-export"></i> 导出
</button>




</div>





<div style="display: grid; gap: 10px;">

<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
          <i class="fas fa-plus-circle"></i>
        </div>
        <div>
          <div style="font-size: 18px; color: #212529; font-weight: 700;">创建卡密</div>
        </div>
      </div>
      <button class="按钮" onclick="openCreateCardModal()">
        <i class="fas fa-plus-circle"></i> 创建卡密
      </button>
    </div>
  </div>
</div>



<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
          <i class="fas fa-coins"></i>
        </div>
        <div>
            <div style="font-size: 12px; color: #6c757d; font-weight: 500;">卡密余额</div>




<div id="隐私模式_区块">
            <div style="font-size: 18px; font-weight: 700; color: #212529; margin-top: 2px;" id="卡密管理_剩余卡密余额id">0张</div>
</div>



        </div>
      </div>
      <button class="按钮" onclick="卡密管理_充值卡密余额()">
        <i class="fas fa-coins"></i> 购买余额
      </button>
    </div>
  </div>
</div>





<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px; box-shadow: var(--shadow);">
          <i class="fas fa-key"></i>
        </div>
        <div>
          <div style="font-size: 18px; color: #212529; font-weight: 700;">卡密管理</div>
        </div>
      </div>
      <button class="按钮" onclick="卡密管理_管理()">
        <i class="fas fa-cog"></i> 管理
      </button>
    </div>
  </div>
</div>


</div>






<div id="隐私模式_区块">
<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                
                
                
                
                
<th scope="col" class="卡密管理-选择按钮">
    <input type="checkbox" 
           id="卡密管理_选择所有_id"
           onchange="卡密管理_全选所有(this)" 
           aria-label="全选">
</th>
            
            
            
            <th>卡密号码</th>
<th>类型</th>
<th>时长</th>
<th>设备</th>
<th>状态</th>
<th>创建时间</th>
<th>到期时间</th>
<th>操作</th>
                                            
                                            
            </tr>
        </thead>
        <tbody id="卡密管理_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
    
</div>
<div class="表格底部码页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="卡密管理_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="卡密管理_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="卡密管理_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="卡密管理_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="卡密管理_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="卡密管理_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="卡密管理_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>
</div>


</div>


</div>

</div>
<div class="page" id="cloudUpdate">
    


<div class="card">
           <div class="card-header">




<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 5px;">云更新管理

        </span>
    <span id="云更新管理_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>

</div>

<div style="display: flex; gap: 8px; align-items: center;">
    <span id="云更新_类型说明" style="font-size: 12px; color: #868e96;"></span>
</div>






<div>

        <input type="text" class="form-control form-control-sm d-inline-block" 
               style="width: 100px; height:26px;"
               placeholder="搜索文件名称..." 
               id = "云更新管理_搜索框"
               onkeyup="云更新管理_搜索关键词()">
        </input>

</div>




        
        
    </div>
    
    <div class="card-body" style="padding: 10px;">
        
        
    <div style="display: flex; gap: 20px;">
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="云更新管理_统计_容量使用">0</div>
            <div class="card-header-stat-label">容量使用</div>
        </span>
        <span class="card-header-stat">
            <div class="card-header-stat-value" id="云更新管理_统计_总容量">0</div>
            <div class="card-header-stat-label">总容量</div>
        </span>
    </div>
    
    
<div id = "云更新管理_多选功能id" style="display: inline-flex; align-items: center; display: none;margin-top: 10px;">

  <div style="
    width: 2px;
    height: 32px;
    background-color: #ddd;
    margin-right: 10px;
  "></div>
  <span style="vertical-align: middle;margin-right: 10px;">批量操作</span>
  

        
<button style="
    background-color: #ffffff4700;
    border: 2px solid #000000;
    color: #000000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.0);
    margin-right: 10px;"     
    class="按钮" onclick="云更新管理_选中功能_删除()">
    <i class="fas fa-trash"></i> 删除
</button>




</div>




<div style="display: grid; gap: 10px;margin-top: 10px;">

  <div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
    <div style="border-radius: 15px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
            <i class="fas fa-tag"></i>
          </div>
          <div>
            <div style="font-size: 12px; color: #6c757d; font-weight: 500;">当前版本</div>
            <div style="font-size: 18px; font-weight: 700; color: #212529; margin-top: 2px;" id="云更新管理_版本">V1.2.3</div>
          </div>
        </div>
        <button class="按钮" onclick="云更新设置版本()">
          <i class="fas fa-cog"></i> 设置版本
        </button>
      </div>
    </div>
  </div>



  <div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
    <div style="border-radius: 15px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
            <i class="fas fa-download"></i>
          </div>
          <div>
            <div style="font-size: 12px; color: #6c757d; font-weight: 500;">剩余上下行次数</div>
            
            
<div id="隐私模式_区块">
            <div style="font-size: 18px; font-weight: 700; color: #212529; margin-top: 2px;" id="剩余流量id">0次</div>
            
</div>
          </div>
        </div>
        <button class="按钮" onclick="云更新_充值流量()">
          <i class="fas fa-cart-shopping"></i> 充值
        </button>
      </div>
    </div>
  </div>





<div style="background-color: #fffcfc4f; padding: 10px; border-radius: 8px;">
  <div style="border-radius: 15px;">
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; align-items: center;">
        <div style="width: 36px; height: 36px; border-radius: 15px; background: #ffffff47; display: flex; align-items: center; justify-content: center; margin-right: 10px;
  box-shadow: var(--shadow);">
          <i class="fas fa-upload"></i>
        </div>
        <div>
          <div style="font-size: 18px; color: #212529; font-weight: 700;" id="云更新_上传卡片标题">上传文件</div>
        </div>
      </div>
      <button class="按钮" id="云更新_上传入口按钮" onclick="云更新_上传入口()">
        <i class="fas fa-upload"></i> 上传文件
      </button>
    </div>
  </div>
</div>


</div>




<div class="rounded-table-container" style = "margin-top: 10px;">
    <table class="rounded-table">
        <thead>
            <tr>
                
                
                
                
                
<th scope="col" class="云更新管理-选择按钮">
    <input type="checkbox" 
           id="云更新管理_选择所有_id"
           onchange="云更新管理_全选所有(this)" 
           aria-label="全选">
</th>
            
            
            
            
                                    <th>文件名称</th>
                                    <th>上传时间</th>
                                    <th>大小</th>
                                    

    <th id="隐私模式_区块">消耗次数</th>



                                    <th>操作</th>
            </tr>
        </thead>
        <tbody id="云更新管理_TableBody">

        </tbody>
        
 
            
            
            
    </table>
    
    
</div>

<div class="表格底部分页">
    <div class="分页信息">
        <div class="分页按钮">
            <span id="云更新管理_码页信息">第1/1页</span>
        </div>
        <div class="分页按钮">
            <span>共 <span id="云更新管理_总记录数" class="统计数字高亮">0</span> 条记录</span>
        </div>
    </div>
    
    <div class="分页按钮组">
        <button onclick="云更新管理_加载首页()" title="首页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-left'></i>
        </button>
        
        <button onclick="云更新管理_加载上一页()" title="上一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-left'></i>
        </button>
        
        <div class="页码容器">
            <span id="云更新管理_当前码页"  class="页码数字 当前页码">1</span>
        </div>
        
        <button onclick="云更新管理_加载下一页()" title="下一页" class="分页按钮组按钮">
            <i class='fas fa-chevron-right'></i>
        </button>
        
        <button onclick="云更新管理_加载尾页()" title="尾页" class="分页按钮组按钮">
            <i class='fas fa-angle-double-right'></i>
        </button>

    </div>
</div>




</div>

</div>

</div>
<div class="page" id="api">


    <div class="card">
        <div class="card-header">
            
            
<div style="display: grid; gap: 10px;">

<h3 style="margin: 0; display: flex; align-items: center;">
    <span style="margin-right: 5px;">安全请求</span>
    <span id="对接文档_加载动画" style="display: none; align-items: center;">
        <div class="custom-spinner" style="
            width: 16px;
            height: 16px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3498db;
            border-radius: 50%;
            animation: 表格加载动画 1s linear infinite;
        "></div>
    </span>
</h3>

</div>


        </div>
        <div class="card-body">



                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa85; border-radius: 8px;margin-bottom:10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-key" style="font-size: 15px; color: var(--primary-color);"></i>
                        <div>
                            <h4 style="margin: 0; color: #2a2e3e;">安全请求密码</h4>
                            <p id="对接文档_安全请求密码" style="margin: 5px 0 0 0; color: #6c757d; font-size: 13px;">正在获取中...</p>
                        </div>
                    </div>
                    <button class="按钮" onclick="对接文档_重置安全请求密码()">
                        <i class="fas fa-sync-alt"></i> 重置
                    </button>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa85; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="font-size: 15px; color: var(--primary-color);"></i>
                        <div>
                            <h4 style="margin: 0; color: #2a2e3e;">安全请求Token</h4>
                            <p id="对接文档_安全请求Token" style="margin: 5px 0 0 0; color: #6c757d; font-size: 13px;">正在获取中...</p>
                        </div>
                    </div>
                    <button class="按钮" onclick="对接文档_重置安全请求Token()">
                        <i class="fas fa-sync-alt"></i> 重置
                    </button>
                </div>






            
        </div>
    </div>

    
            <div class="card">
            <div class="card-header">
                <h3>对接文件</h3>
            </div>
            <div class="card-body">
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa85; border-radius: 8px;margin-bottom:10px;">
    <div style="display: flex; align-items: center; gap: 12px;">
        <i class="fas fa-file-archive" style="font-size: 15px; color: var(--primary-color);"></i>
        <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px;">
                <h4 style="margin: 0; color: #2a2e3e;"><?= $e($对接文件['dl_jni_title']) ?></h4>
                <span style="background: #ff9800; color: #fff; font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 500; line-height: 1.5;">手动对接</span>
            </div>
            <p style="margin: 0; color: #6c757d; font-size: 13px;"><?= $e($对接文件['dl_jni_desc']) ?></p>
        </div>
    </div>
    <button class="按钮" onclick="window.location.href='<?= $e($对接文件['dl_jni_url']) ?>'">
        <i class="fas fa-download"></i> 下载
    </button>
</div>



                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa85; border-radius: 8px;margin-bottom:10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-file-archive" style="font-size: 15px; color: var(--primary-color);"></i>
                        <div>
                            
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px;">
                <h4 style="margin: 0; color: #2a2e3e;"><?= $e($对接文件['dl_dex_title']) ?></h4>
                <span style="background: #06a70b; color: #fff; font-size: 12px; padding: 2px 8px; border-radius: 12px; font-weight: 500; line-height: 1.5;">自动对接</span>
            </div>
            
                            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 13px;"><?= $e($对接文件['dl_dex_desc']) ?></p>
                        </div>
                    </div>
                    <button class="按钮" onclick="window.location.href='<?= $e($对接文件['dl_dex_url']) ?>'">
                        <i class="fas fa-download"></i>下载
                    </button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f8f9fa85; border-radius: 8px;margin-bottom:10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-cog" style="font-size: 15px; color: var(--primary-color);"></i>
                        <div>
                            <h4 style="margin: 0; color: #2a2e3e;">生成Data与IV配置信息</h4>
                            <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 13px;">自动生成Java 加密对接信息,实现快速对接安全传输</p>
                        </div>
                    </div>
                    <button class="按钮"  onclick="对接文档_云更新辅助配置文件_开始_第一步()">
                        开始
                    </button>
                </div>

                
                
            </div>
        </div>
        
    
        
        
        
</div>

<div class="page" id="settings">







    <div class="card">
        <div class="card-header">
            <h3>账号操作</h3>
        </div>
        <div class="card-body">
            
<div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
    <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
        <i class="fas fa-sign-out-alt"></i>
    </div>
    <div style="flex: 1;">
        <div style="font-size: 12px; color: #666;">退出登录</div>
    </div>
    <a onclick="退出登录()" class="按钮">
        <i class="fas fa-lock" style="margin-right: 4px;"></i> 退出
    </a>
</div>

<div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
    <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
        <i class="fas fa-user-edit"></i>
    </div>
    <div style="flex: 1;">
        <div style="font-size: 12px; color: #666;">修改名称</div>
    </div>
    <a onclick="修改名称()" class="按钮">
        <i class="fas fa-edit" style="margin-right: 4px;"></i> 修改
    </a>
</div>

<div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px;">
    <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
        <i class="fas fa-key"></i>
    </div>
    <div style="flex: 1;">
        <div style="font-size: 12px; color: #666;">修改密码</div>
    </div>
    <a onclick="修改密码()" class="按钮">
        <i class="fas fa-sync-alt" style="margin-right: 4px;"></i> 修改
    </a>
</div>

        </div>
    </div>

    <div class="card" style="margin-top: 14px;">
        <div class="card-header">
            <h3>账号绑定</h3>
        </div>
        <div class="card-body">
            <div style="font-size: 12px; color: #9aa3b2; line-height: 1.7; margin-bottom: 12px;">
                QQ / 微信 / 邮箱 / Telegram 各只能绑定一个。绑定或解绑都需要验证码，最后一个登录方式不允许解绑。
            </div>
            <div id="绑定列表容器">
                <div style="display:flex;align-items:center;gap:8px;padding:12px;background:#f8f9fa85;border-radius:6px;font-size:12px;color:#9aa3b2;">
                    <i class="fa-solid fa-spinner fa-spin"></i> 加载中...
                </div>
            </div>





            
        </div>
    </div>


</div>


<div class="page" id="benzhan">
    <div class="card">
        <div class="card-header">
            <span>本站信息</span>
        </div>
        <div class="card-body">
            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
                <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
                    <i class="fas fa-globe"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #666; font-weight: 500;">网站域名: <span id="websiteDomain">刷新中...</span></div>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
                <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
                    <i class="fas fa-registered"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #666; font-weight: 500;">备案号: <span id="icpNumber">刷新中...</span></div>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
                <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #666; font-weight: 500;">创站时间: <span id="buildDateText">读取中...</span></div>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px; margin-bottom: 10px;">
                <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
                    <i class="fas fa-clock"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #666; font-weight: 500;">运行时间: <span id="runDays">计算中...</span> 天</div>
                </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: #f8f9fa85; border-radius: 6px;">
                <div style="color: #2a2e3e; font-size: 22px; width: 32px; text-align: center;">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; color: #666; font-weight: 500;">
                        已运行 <span id="runYears">0</span> 年 · 距离下一年还有 <span id="daysToNextYear">0</span> 天
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>















</div>





</div>


    <script id="CaptchaScript" src="https://t-captcha.gjacky.com/Captcha.js"></script>

<!-- ECharts：流量统计地图（开发者信息.js 依赖） -->
<script src="/前台/静态资源/echarts.min.js?v=20261020fix6"></script>
<script src="/前台/静态资源/flow-trend.js?v=20261112t15"></script>
<script>window.JY_SUBUSER_BUILD = '20261025-count-3';</script>
<script src="/前台/后台模块/请求.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/请求.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/图形验证码.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/图形验证码.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/通用.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/通用.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/账号绑定.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/账号绑定.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/账号凭证弹窗.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/账号凭证弹窗.js') ?: '1'; ?>"></script>



    <script src="/前台/后台模块/开发者信息.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/开发者信息.js') ?: '1'; ?>"></script>
    
    

    <script src="/前台/后台模块/加密选项.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/加密选项.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/实例管理.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/实例管理.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/子用户管理.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/子用户管理.js') ?: '1'; ?>"></script>

    <script src="/前台/后台模块/卡密管理.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/卡密管理.js') ?: '1'; ?>"></script>


    <script src="/前台/后台模块/云更新.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/云更新.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/操作留痕.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/操作留痕.js') ?: '1'; ?>"></script>




    <script src="/前台/后台模块/侧边栏管理.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/侧边栏管理.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/页头.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/页头.js') ?: '1'; ?>"></script>
    <script src="/前台/静态资源/vendor/transfer-qr/qrcode-generator-1.4.4.js"></script>
    <script src="/前台/静态资源/vendor/transfer-qr/jsQR-1.4.0.js"></script>
    <script src="/公共资源/js/jy-select.js?v=<?php echo @filemtime(__DIR__ . '/../../公共资源/js/jy-select.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/支付.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/支付.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/对接文档.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/对接文档.js') ?: '1'; ?>"></script>
    <script src="/前台/后台模块/公告弹窗.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/公告弹窗.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/注册奖励弹窗.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/注册奖励弹窗.js') ?: '1'; ?>"></script>
<script src="/前台/后台模块/公告中心.js?v=<?php echo @filemtime(__DIR__ . '/../后台模块/公告中心.js') ?: '1'; ?>"></script>
    <script>



function 提取标识(API接口) {
    const 部分 = API接口.split('/');
    const 非空部分 = 部分.filter(seg => seg !== '');
    const 最后部分 = 非空部分[非空部分.length - 1];
    return 最后部分;
}






    let 开发者名称 = '';
    /* 凭据分两个，互不通用（2026-11-05 修正）
       ------------------------------------------------------------
       开发者密码   = 协议签名密钥，等于配置 env.sign_secret，
                     用于请求签名计算与响应签名校验，全站固定值。
       开发者安全密码 = 业务凭据，等于 users.request_pass，
                     用于 apps.cred_required=1 时的服务端比对。
       开发者Token  = users.api_token（同样只在 cred_required=1 时校验）。

       原先只有一个"开发者密码"同时承担三种用途，导致需要凭据的通道
       （子用户管理 / 卡密接口 / 云更新）一律返回「安全请求密码错误」。
       现在把业务凭据拆成独立变量，登录后由 syncDevCred() 从
       get_set_info 拉取真实值填入。 */
    let 开发者UID = "JiYan";
    let 开发者密码 = "YOUR_SIGNATURE_SALT";
    let 开发者Token = "";
    let 开发者安全密码 = "";
    try { window.开发者安全密码 = ""; } catch (e) {}
    
    
    let 后台充值次数 = 0;
    let API接口 = "/api/env/";
    let 会员状态 = '';
    let 是否VIP = false;
    let VIP加密签名矩阵 = null;
    let 开发者余额 = '';
    let 签到状态 = '';
        let 开发者QQ = '';
        let 最后登录时间 = '';
        
        

        
        

        let 当前界面 = '';
        
        
        let 当前选中的应用ID = null;
        let 当前应用实例列表 = [];
        let 当前选中的应用加密格式 = null;
        let 当前选中的应用加密密钥 = null;
        let 当前选中的应用名称 = null;
        
        let 当前应用的签名类型 = null;
        let 当前应用的签名密钥 = null;


// Kept for existing cloud-update templates; theme changes never hide data.
let 是否是隐私模式 = false;


function 退出登录() {
window.location.href = '开发者登录.php';
localStorage.removeItem('Username');
localStorage.removeItem('Password');
localStorage.removeItem('token');
}



window.addEventListener('load', function() {
    
document.getElementById('Env_load').style.display = 'none';
document.getElementById('Env_main').style.display = 'flex';
   updateinfo();


});



function 获取API链接(name) {
    const baseUrl = API接口.replace(/\/$/, '');
    const endpoint = name.replace(/^\//, '');
    return `${baseUrl}/${endpoint}`;
}












async function 加载所有实例() {
    if (!开发者UID || !开发者密码) {
        alert('请先登录', false);
        return [];
    }
    
    try {
        const params = {
            action: 'get_all_apps',
            password: 开发者安全密码
            
        };
        
        const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('app.php'), params);
        
        if (result.success) {
            const appsData = result.data.apps || [];
            return Array.isArray(appsData) ? appsData : [];
        } else {
            alert('加载应用失败: ' + result.message, false);
            return [];
        }
        
    } catch (error) {
        alert('加载应用时发生错误: ' + error.message, false);
        return [];
    }
}








async function 获取加密方案(appId) {
    if (!开发者UID || !开发者密码) {
        alert('请先登录', false);
        return null;
    }
    
    try {
        const params = {
            action: 'get_app_api_key',
            password: 开发者安全密码,
            app_id: appId
        };
        
        const result = await POSTPHP(开发者UID, 开发者密码, 开发者Token, 获取API链接('app.php'), params);

        if (result.success) {
            return result;
        } else {
            return null;
        }
    } catch (error) {
        alert('获取API密钥时发生错误: ' + error.message, false);
        return null;
    }
}

function 下载文件(内容, 文件名 = 'download.txt') {
    try {
        const blob = new Blob([内容], { type: 'text/plain;charset=utf-8' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = 文件名;
        
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('已发起下载', true);
    } catch (err) {
        alert('下载失败: ' + err.message, false);
    }
}



function 等待动画(内容) {

    const 已有加载弹窗 = document.querySelector('.等待动画弹窗');
    if (已有加载弹窗) 已有加载弹窗.remove();
    
    const 加载弹窗 = document.createElement('div');
    加载弹窗.className = '等待动画弹窗';
    加载弹窗.classList.add('弹窗遮罩');
    加载弹窗.innerHTML = `
        <div class="弹窗背景">
            <div class="弹窗内部" style="width:280px; text-align: center; padding: 30px 20px;">
                <div style="font-size: 40px; color: #27ae60; margin-bottom: 15px;">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <div style="font-size: 14px; color: #666;">${内容}</div>
            </div>
        </div>
    `;
    document.body.appendChild(加载弹窗);
}



function 删除等待动画() {

const modal = document.querySelector('.等待动画弹窗');
if (modal) {
    modal.remove();
}
}


    </script>


<script id="jy-sidebar-fit">
/* 侧栏底部留白自适应
   ============================================================
   目标：滚到底时，最后一项刚好停在左下角音乐播放器上方 —— 不多也不少。

   三个量决定结果：
     need      = 末项底边超出「播放器顶边 - 间隙」的距离（即需要滚动多少）
     contentH  = 侧栏真实内容高度
     minValid  = 视口高 - contentH（占位块超过这个值才开始产生滚动）

   占位块本身要 need + minValid 高，滚到底时末项才正好落到目标线。
   占位块用真实 DOM 元素，不能用 padding：
     侧栏是 top:0;bottom:0 定位，高度恒等于视口，padding 只会压小内容区，
     几乎不增加滚动范围，末项位置基本不动。
   ============================================================ */
(function () {
  var SEL = '.sidebar, #adminApp .sidebar';
  var GAP = 8;        /* 末项与播放器之间的视觉间隙 */
  var PROBE = 300;    /* 用于反推真实内容高的临时占位 */

  function playerRect() {
    var el = document.querySelector('.mp');
    if (!el) return null;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return null;
    var r = el.getBoundingClientRect();
    return r.height > 0 ? r : null;
  }

  function tailOf(sb) {
    var t = sb.querySelector(':scope > .jy-sidebar-tail');
    if (!t) {
      t = document.createElement('div');
      t.className = 'jy-sidebar-tail';
      t.setAttribute('aria-hidden', 'true');
      t.style.cssText = 'flex:0 0 auto;width:100%;height:0;pointer-events:none;';
      sb.appendChild(t);
    }
    return t;
  }

  function fit(sb) {
    var tail = tailOf(sb);
    var items = sb.querySelectorAll('.nav-item');
    if (!items.length) return;
    var last = items[items.length - 1];

    var mp = playerRect();
    var sbR = sb.getBoundingClientRect();

    function clear() {
      tail.style.height = '0px';
      sb.dataset.jyFit = 'fits';
      sb.dataset.jyPad = '0';
    }

    /* 没有播放器（后台页已移除）→ 只需一点呼吸空间，不留多余空白 */
    if (!mp || sbR.right <= mp.left || mp.right <= sbR.left) {
      tail.style.height = '0px';
      sb.dataset.jyFit = 'none';
      sb.dataset.jyPad = '0';
      return;
    }

    var limit = mp.top - GAP;
    var ch = sb.clientHeight;

    /* 1) 末项在「不滚动」时的位置 */
    tail.style.height = '0px';
    sb.scrollTop = 0;
    void sb.offsetHeight;
    var lastBottom0 = last.getBoundingClientRect().bottom;

    /* 本来就在播放器上方 → 不需要任何留白 */
    if (lastBottom0 <= limit) { clear(); return; }

    var need = Math.ceil(lastBottom0 - limit);

    /* 2) 反推真实内容高：加一个临时占位，看它把末项推上去多少 */
    tail.style.height = PROBE + 'px';
    void sb.offsetHeight;
    sb.scrollTop = 999999;
    var yProbe = last.getBoundingClientRect().bottom;

    /* 加了 PROBE 之后 maxScroll 增加了 Δ，末项上移 Δ；
       contentH = lastBottom0 - yProbe + ch - PROBE */
    var contentH = lastBottom0 - yProbe + ch - PROBE;
    if (!isFinite(contentH) || contentH < 0) contentH = ch;

    /* pad = need + ch - contentH
       contentH < ch（内容不足一屏）：前 (ch-contentH) 的占位会被「填平」，要多补这部分
       contentH > ch（内容已溢出）：已有的 (contentH-ch) 滚动能力可以直接抵扣 */
    var pad = Math.max(0, Math.min(4000, Math.round(need + ch - contentH)));

    tail.style.height = pad + 'px';
    sb.scrollTop = 999999;
    sb.dataset.jyFit = pad > 0 ? 'pad' : 'fits';
    sb.dataset.jyPad = String(Math.round(pad));
  }

  function runAll() {
    var list = document.querySelectorAll(SEL);
    for (var i = 0; i < list.length; i++) {
      try { fit(list[i]); } catch (e) {}
    }
  }

  function boot() {
    runAll();
    setTimeout(runAll, 260);     /* 播放器 / 图标字体到位后再量一次 */
    setTimeout(runAll, 1100);
    window.addEventListener('resize', runAll, { passive: true });
    window.addEventListener('orientationchange', function () { setTimeout(runAll, 240); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { runAll(); });
      var navs = document.querySelectorAll('.sidebar-nav, #adminApp .sidebar-nav');
      for (var i = 0; i < navs.length; i++) ro.observe(navs[i]);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(runAll);
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#menuToggle, .menu-toggle')) setTimeout(runAll, 430);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.JYSidebarFit = runAll;
})();

/* ============================================================
   凭据同步：把 users.api_token / users.request_pass 拉回来
   ------------------------------------------------------------
   背景：apps.cred_required=1 时，AppUserSdk / AppSdk 会用
   $p['password'] 与 users.request_pass、$p['token'] 与
   users.api_token 做 hash_equals 比对。前端这两个值原本是
   硬编码占位（"YOUR_SIGNATURE_SALT" / ""），从未与后端同步，
   结果所有需要凭据的通道都会返回"安全请求密码错误"。

   get_set_info 是唯一返回真实 pass/token 的接口，在这里拉一次即可。
   ============================================================ */
async function syncDevCred() {
    try {
        var res = await POSTPHP(
            String(开发者UID), String(开发者密码), String(开发者Token),
            获取API链接('app.php'),
            { action: 'get_set_info' }
        );
        if (!res || !res.success) return false;
        var d = res.data || {};
        if (!d.pass && !d.token) return false;

        /* 注意：不能覆盖 开发者密码 —— 那是协议签名密钥（env.sign_secret），
           一旦改成 request_pass，响应签名校验就会全线失败。
           业务凭据单独放在 开发者安全密码。 */
        if (d.pass)  开发者安全密码 = String(d.pass);
        if (d.token) 开发者Token    = String(d.token);
        try { window.开发者安全密码 = 开发者安全密码; } catch (e) {}

        /* 把新凭据同步给所有模块（它们读的是 window.*） */
        try { document.dispatchEvent(new CustomEvent('jy:credready')); } catch (e) {}
        return true;
    } catch (e) {
        return false;
    }
}

(function bootCredSync() {
    var tries = 0;
    function go() {
        syncDevCred().then(function (ok) {
            if (ok) return;
            if (++tries < 3) setTimeout(go, 1500);
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(go, 300); });
    } else {
        setTimeout(go, 300);
    }
})();

</script>


</body>

<div style="
    position: fixed;
    bottom: 16px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 12px;
    background: #666;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    pointer-events: none;
    z-index: 9999999;
">
    © 2026 极验云 · V1 · token_23214bd6da705892</div>

</html>