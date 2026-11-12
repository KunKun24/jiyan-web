# Deployment

- PHP 8.1+ with `pdo_mysql`, `openssl`, `curl`, `mbstring`; nginx.
- Point the site root at `public/`.
- Put the private backend (containing `src/bootstrap.php`) at `../backend`, or set `JIYAN_BACKEND_ROOT` via `fastcgi_param`.
- Map `/api/console/api.php` to your real console API.
- Keep `config.example.php` and `docs/` outside the web root.
