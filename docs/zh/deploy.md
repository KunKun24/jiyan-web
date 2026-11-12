# 部署说明

## 前提

- Node.js 20+、npm 10+
- 一个与 API 同源的站点（推荐直接部署在官方站点根目录/子路径）
- HTTPS：登录 Cookie 带 `Secure`，云控面板会话也依赖 HTTPS

## 构建

```bash
npm ci
npm run build
```

产物在 `dist/`。

## 部署方式

### 方式一：站点根目录（推荐）

把 `dist/` 作为站点根目录，`/api` 反向代理到后端：

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

`try_files ... /index.html` 是 Vue Router history 模式必需的，否则刷新 `/cloud` 会 404。

### 方式二：子路径

需同时修改：

- `vite.config.ts` 的 `base`
- `src/router.ts` 的 `createWebHistory(base)`

并确保 `/api` 仍以绝对路径反向代理。子路径部署容易踩 Cookie `Path=/` 的坑，除非确有需要，建议用方式一。

## 为什么必须同源

- 账号接口通过 HttpOnly Cookie 维持登录态，服务端只回显同站 Origin。
- 云控面板链接建立的面板会话 Cookie 也挂在同一站点下。

把前端放到独立域名（含 GitHub Pages）时，浏览器不会携带这些 Cookie，接口会返回 401/403。此时需要在你自己的反向代理上做同源转发，而不是修改前端去跨域。

## 缓存建议

```nginx
location = /index.html {
    add_header Cache-Control "no-cache";
}

location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## 本地开发

```bash
npm install
JIYAN_DEV_TARGET=https://your-backend.example npm run dev
```

Vite 会代理 `/api` 与 `/cloud-control.php`；直接在浏览器打开 `http://localhost:5173` 即可。

## 排错

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 刷新子页面 404 | 未配置 SPA 回退 | 加 `try_files` |
| 登录成功但刷新又退出 | Cookie 被跨域/跨站拦截 | 同源部署，检查 SameSite/Secure |
| 云控面板提示链接失效 | 面板链接过期或已重新签发 | 回到应用列表重新打开 |
| 接口 502 | 反代未连通后端 | 检查 `proxy_pass` 与后端健康状态 |
