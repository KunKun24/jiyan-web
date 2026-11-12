# Deployment

## Requirements

Node.js 20+, npm 10+, a site **on the same origin as the API**, and HTTPS (session cookies are `Secure`).

## Build

```bash
npm ci
npm run build
```

Output: `dist/`.

## Nginx (site root, recommended)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example;

    root /var/www/jiyan-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass https://your-backend.example;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`try_files ... /index.html` is required for Vue Router history mode; otherwise refreshing `/cloud` returns 404.

## Why same origin

Sign-in and the cloud panel rely on HttpOnly cookies issued for the site. On a separate domain (including GitHub Pages) the browser will not send them and the API answers 401/403. Use a same-origin reverse proxy instead of making the frontend cross-origin.

## Caching

- `index.html`: `Cache-Control: no-cache`
- `/assets/*`: `public, max-age=31536000, immutable`

## Local development

```bash
npm install
JIYAN_DEV_TARGET=https://your-backend.example npm run dev
```

Vite proxies `/api` and `/cloud-control.php`; open `http://localhost:5173`.

## Sub-path deployments

Set Vite `base` and `createWebHistory(base)` together. Prefer the site root unless a sub-path is required.
