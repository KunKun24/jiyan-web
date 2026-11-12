<?php
declare(strict_types=1);
/**
 * 站点前台公开数据：轮播图 / 更新日志 / 站点信息
 * 无需登录，供 首页.html、更新日志.html 读取。
 *
 * GET ?type=banner      → 启用的轮播图
 * GET ?type=changelog   → 已发布的更新日志（分页）
 * GET ?type=all         → 一次性返回 banner + changelog(第1页) + site
 */
require_once dirname(__DIR__) . '/_backend.php';

use JY\Db;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
// [SEC 2026-10-27] 原为 Access-Control-Allow-Origin: *（任意站点可读）。
// 虽然只暴露公开轮播/日志，但没有必要开全站通读，改成同源白名单。
$__o = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
$__h = (string)($_SERVER['HTTP_HOST'] ?? '');
if ($__o !== '' && $__h !== '' && ($__o === 'https://' . $__h || $__o === 'http://' . $__h)) {
    header('Access-Control-Allow-Origin: ' . $__o);
    header('Vary: Origin');
}
header('X-Content-Type-Options: nosniff');

function sg(string $k, string $def = ''): string
{
    $r = Db::one('SELECT v FROM admin_settings WHERE k = ? LIMIT 1', [$k]);
    return ($r === null || $r['v'] === null) ? $def : (string)$r['v'];
}

/* ---------- 轮播图 ---------- */
function fetchBanners(): array
{
    $rows = Db::all('SELECT id, title, subtitle, image_url, link_url, sort FROM site_banners WHERE enabled = 1 ORDER BY sort, id');
    $out = [];
    foreach ($rows as $r) {
        $img = (string)$r['image_url'];
        // 只允许站内相对路径或 http(s)
        if ($img !== '' && !preg_match('#^(https?://|/)#i', $img)) {
            continue;
        }
        $out[] = [
            'id'       => (int)$r['id'],
            'title'    => (string)$r['title'],
            'subtitle' => (string)$r['subtitle'],
            'image'    => $img,
            'link'     => (string)$r['link_url'],
        ];
    }
    return $out;
}

/* ---------- 更新日志 ---------- */
function fetchChangelog(int $page = 1, int $size = 20): array
{
    $size = max(1, min(50, $size));
    $off  = (max(1, $page) - 1) * $size;
    $total = (int)(Db::one('SELECT COUNT(*) c FROM site_changelog WHERE is_published = 1')['c'] ?? 0);
    $rows = Db::all(
        "SELECT id, version, title, content, images, tag, sort, published_at
           FROM site_changelog WHERE is_published = 1
          ORDER BY sort DESC, published_at DESC, id DESC LIMIT $size OFFSET $off"
    );

    $list = [];
    foreach ($rows as $r) {
        $imgs = [];
        $raw = (string)($r['images'] ?? '');
        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                foreach ($decoded as $u) {
                    $u = (string)$u;
                    if ($u !== '' && preg_match('#^(https?://|/)#i', $u)) {
                        $imgs[] = $u;
                    }
                }
            }
        }
        $list[] = [
            'id'           => (int)$r['id'],
            'version'      => (string)$r['version'],
            'title'        => (string)$r['title'],
            'content'      => (string)($r['content'] ?? ''),
            'images'       => $imgs,
            'tag'          => (string)$r['tag'],
            'published_at' => (string)$r['published_at'],
            'date_text'    => date('Y年n月j日', strtotime((string)$r['published_at'])),
            'time_text'    => date('H:i', strtotime((string)$r['published_at'])),
        ];
    }

    return [
        'list'  => $list,
        'total' => $total,
        'page'  => max(1, $page),
        'pages' => max(1, (int)ceil($total / $size)),
        'size'  => $size,
    ];
}

/* ---------- 站点信息 ---------- */
function fetchSite(): array
{
    $build = trim(sg('site_build_date', '2025-10-21'));
    if ($build === '') {
        $build = '2025-10-21';
    }
    $ts = strtotime($build . ' 00:00:00');
    if ($ts === false) {
        $ts = strtotime('2025-10-21 00:00:00');
        $build = '2025-10-21';
    }
    $days = max(0, (int)floor((time() - (int)$ts) / 86400));

    return [
        'site_name' => sg('site_name', '极验云'),
        'icp'       => trim(sg('site_icp', '')),
        'build_date'      => $build,
        'build_date_text' => date('Y年n月j日', (int)$ts),
        'days'            => $days,
    ];
}

$type = (string)($_GET['type'] ?? 'all');
$page = (int)($_GET['page'] ?? 1);

try {
    switch ($type) {
        case 'banner':
            echo json_encode(['success' => true, 'list' => fetchBanners()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;
        case 'changelog':
            echo json_encode(['success' => true] + fetchChangelog($page), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            break;
        default:
            echo json_encode([
                'success'   => true,
                'banners'   => fetchBanners(),
                'changelog' => fetchChangelog(1, 10),
                'site'      => fetchSite(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
} catch (\Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'message' => '数据读取失败'], JSON_UNESCAPED_UNICODE);
}