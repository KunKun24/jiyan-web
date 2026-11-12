<?php
// V1：打开站点先到首页（不直接进登录）
// 用 /home.html 作为主入口：/首页.html 已被 CDN 缓存旧版本，新路径可立即生效
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Location: /home.html', true, 302);
exit;
