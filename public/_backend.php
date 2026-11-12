<?php
/**
 * Private backend loader.
 *
 * This repository contains the frontend only. The PHP that powers it
 * (database, billing, card records, cloud control) is a separate,
 * private project and is NOT distributed here.
 *
 * Point JIYAN_BACKEND_ROOT at that backend directory — the one that
 * contains `src/bootstrap.php`. When the variable is unset, the loader
 * falls back to `../backend` next to this repository.
 */
declare(strict_types=1);

$root = getenv('JIYAN_BACKEND_ROOT');
if (!is_string($root) || $root === '') {
    $root = dirname(__DIR__) . '/backend';
}
$root = rtrim($root, "/\\");

if (!is_file($root . '/src/bootstrap.php')) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Backend not configured.\n";
    echo "Set JIYAN_BACKEND_ROOT to the private backend directory (the one containing src/bootstrap.php).\n";
    exit;
}

define('JIYAN_BACKEND_ROOT', $root);
define('JIYAN_BACKEND_SRC', $root . '/src');

require_once JIYAN_BACKEND_SRC . '/bootstrap.php';
