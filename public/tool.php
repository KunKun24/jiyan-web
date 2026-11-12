<?php
declare(strict_types=1);
/**
 * 每应用独立的「查询卡密 / 解绑卡密」页面入口
 * 短链：/t/<short_code>  -> nginx rewrite -> /tool.php?c=<short_code>
 *
 * 逻辑：把 short_code 注入页面，页面内 JS 用它换应用信息并锁定作用域。
 * 没有任何 code 时回落 /卡密工具.html（全局工具页，向后兼容）。
 */
$code = (string)($_GET['c'] ?? '');
if ($code === '' || !preg_match('/^[A-Za-z0-9]{4,16}$/', $code)) {
    header('Location: /卡密工具.html', true, 302);
    exit;
}

// 直接 302 到正式页面，避免二次跳转闪白
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
header('Location: /卡密工具.html?c=' . rawurlencode($code), true, 302);
exit;
