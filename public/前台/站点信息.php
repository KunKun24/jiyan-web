<?php
declare(strict_types=1);
/**
 * 站点公开信息（创站时间 / 备案号 / 站名）
 * 无需登录，供用户端「本站信息」面板渲染。
 * 数据源：admin_settings.site_build_date / site_icp / site_name
 */
require_once dirname(__DIR__) . '/_backend.php';

use JY\Db;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');

function sg(string $k, string $def = ''): string
{
    $r = Db::one('SELECT v FROM admin_settings WHERE k = ? LIMIT 1', [$k]);
    return ($r === null || $r['v'] === null) ? $def : (string)$r['v'];
}

$build = trim(sg('site_build_date', '2025-10-21'));
if ($build === '') {
    $build = '2025-10-21';
}
$ts = strtotime($build . ' 00:00:00');
if ($ts === false) {
    $ts = strtotime('2025-10-21 00:00:00');
    $build = '2025-10-21';
}

$now  = time();
$days = (int)floor(($now - $ts) / 86400);
if ($days < 0) {
    $days = 0;
}

$by = (int)date('Y', $ts);
$bm = (int)date('n', $ts);
$bd = (int)date('j', $ts);

$curYear = (int)date('Y', $now);
$years   = $curYear - $by;
$anniv   = mktime(0, 0, 0, $bm, $bd, $curYear);
if ($anniv !== false && $now < $anniv) {
    $years--;
}
$years = $years < 0 ? 0 : $years;

$next = mktime(0, 0, 0, $bm, $bd, $curYear);
if ($next !== false && $now >= $next) {
    $next = mktime(0, 0, 0, $bm, $bd, $curYear + 1);
}
$toNext = (int)ceil((((int)$next) - $now) / 86400);
$toNext = $toNext < 0 ? 0 : $toNext;

echo json_encode([
    'success'         => true,
    'site_name'       => sg('site_name', '极验云'),
    'build_date'      => $build,
    'build_date_text' => $by . '年' . $bm . '月' . $bd . '日',
    'days'            => $days,
    'years'           => $years,
    'days_to_next'    => $toNext,
    'icp'             => trim(sg('site_icp', '')),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
