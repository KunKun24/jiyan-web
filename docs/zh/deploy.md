# 部署说明

## 环境

- PHP 8.1+，扩展：`pdo_mysql`、`openssl`、`curl`、`mbstring`、`json`
- nginx（或任意能跑 PHP 的 Web 服务器）

## 步骤

1. 站点根目录指向仓库的 `public/`。
2. 部署私有后端（不含在本仓库），确保它包含 `src/bootstrap.php`。
3. 配置后端路径，二选一：

   ```nginx
   fastcgi_param JIYAN_BACKEND_ROOT /srv/jiyan/backend;
   ```

   或把后端放到仓库上一级的 `backend/`。

4. 打开 `https://你的域名/home.html` 验证官网；打开 `/前台/开发者登录.php` 验证登录页。

## 管理接口映射

用户后台的公告模块调用 `/api/console/api.php`（占位路径）。请在 nginx 或后端路由中把它映射到私有后端的实际接口，例如：

```nginx
location = /api/console/api.php {
    fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    fastcgi_param SCRIPT_FILENAME /srv/jiyan/backend/public/console-api.php;
    include fastcgi_params;
}
```

## 权限

- PHP 文件 `0640`，属主为运行 PHP 的用户（如 `www`）。
- 需要写入的目录（由后端管理）不要放在 `public/` 下。

## 注意事项

- 不要把 `config.example.php`、`docs/` 暴露到 Web 根目录。
- 生产环境请为站点启用 HTTPS。
