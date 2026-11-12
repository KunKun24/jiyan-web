<?php
declare(strict_types=1);
require_once __DIR__ . '/_backend.php';
header('Cache-Control: no-store, private');
header('Pragma: no-cache');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
try {
    $app = \JY\CloudControl::fromLink((string)($_GET['owner'] ?? ''),(int)($_GET['app'] ?? 0),(string)($_GET['token'] ?? ''));
    if (!$app) {
        http_response_code(403);
        $error = '链接不存在或已失效';
    } elseif (!\JY\Vip::isVip((int)$app['user_id'])) {
        http_response_code(403);
        $error = '请开通会员后使用该功能';
    } else {
        $csrf = \JY\CloudControl::newSession($app);
        $boot = ['app'=>['id'=>(int)$app['id'],'name'=>$app['app_name'],'owner'=>$app['owner_name']],'csrf'=>$csrf,'expires_at'=>(int)$app['link_expires']];
    }
} catch (Throwable $e) {
    \JY\App::log('cloud_control.page_error',['error'=>$e->getMessage()]);
    http_response_code(503);
    $error = '云控服务暂时不可用';
}
$e = static fn(string $s): string => htmlspecialchars($s,ENT_QUOTES|ENT_SUBSTITUTE,'UTF-8');
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="no-referrer">
<title><?= isset($app['id']) ? $e('极验云验证-云控面板 (' . $app['id'] . ' ' . $app['app_name'] . ')') : '极验云验证-云控面板' ?></title>
<link rel="stylesheet" href="/公共资源/fa.all.min.css?v=20261025full">
<link rel="stylesheet" href="/前台/静态资源/cloud-control.css?v=<?= (int)@filemtime(__DIR__ . '/前台/静态资源/cloud-control.css') ?>">
<?php if (isset($boot)): ?>
<script>window.JY_CLOUD=<?= json_encode($boot,JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR) ?>;</script>
<script defer src="/前台/静态资源/cloud-control.js?v=<?= (int)@filemtime(__DIR__ . '/前台/静态资源/cloud-control.js') ?>"></script>
<?php endif; ?>
</head>
<body>
<?php if(isset($error)): ?>
<main style="max-width:520px;margin:15vh auto;padding:32px;background:rgba(255,255,255,.94);border-radius:22px;color:#1d1d1f;text-align:center">
<h1 style="font-size:24px"><?= $e($error) ?></h1>
<p><?= $error === '请开通会员后使用该功能' ? '云控面板为会员专享，请先开通会员，再从应用实例重新打开。' : '请从应用实例重新打开云控面板。' ?></p>
<a href="/前台/用户后台.php">返回用户后台</a>
</main>
<?php else: ?>
<div id="cloud-root"></div>
<div id="cloud-modal-root"></div>
<div id="cloud-toast" role="status"></div>
<?php endif; ?>
</body>
</html>
