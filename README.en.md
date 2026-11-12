# JiYan Cloud · User-facing Frontend

<p>
  <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue">
  <img alt="PHP" src="https://img.shields.io/badge/PHP-8.1%2B-777bb4">
  <a href="README.md">中文</a>
</p>

Frontend source of the JiYan Cloud verification service: landing page, API docs, card-key lookup/unbind, user console and cloud-control panel.

> This repository contains **no admin panel** and **no backend**. Database, billing, card records and cloud-control delivery live in a separate private backend loaded through `public/_backend.php`.

## Layout

```
public/                # web root
  home.html  接口文档.html  卡密工具.html  docs.html
  公共资源/  en/  前台/  cloud-control.php  tool.php  _backend.php
config.example.php     # placeholders only
docs/                  # deployment / structure / security
```

## Deploy

- PHP 8.1+ with `pdo_mysql`, `openssl`, `curl`, `mbstring`; nginx.
- Point the site root at `public/`.
- Place the private backend at `../backend` or set `JIYAN_BACKEND_ROOT` (e.g. via `fastcgi_param`).
- Static pages work without the backend; the console and cloud panel require a backend session.

## Sanitization

The public copy differs from production: the inline SQL in the console was removed, backend paths go through `_backend.php`, the admin API path is replaced with the `/api/console/api.php` placeholder, and all credentials/IPs are placeholders.

See [docs/en/security.md](docs/en/security.md).

## License

[AGPL-3.0](LICENSE). Not affiliated with Geetest.
