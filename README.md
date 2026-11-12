# 极验云验证 · 用户端前端

<p>
  <img alt="License" src="https://img.shields.io/badge/license-AGPL--3.0-blue">
  <img alt="PHP" src="https://img.shields.io/badge/PHP-8.1%2B-777bb4">
  <img alt="nginx" src="https://img.shields.io/badge/nginx-ready-009639">
  <a href="README.en.md">English</a>
</p>

极验云验证（JiYan Cloud）的**用户端前端**源码：官网、接口文档、卡密查询与解绑、用户后台、云控面板。

> 本仓库**不包含**管理后台，也**不包含**后端服务。数据库、支付、卡密记录、云控下发等逻辑在独立的私有后端中，通过 `public/_backend.php` 加载。

## 包含什么

| 模块 | 入口 |
| --- | --- |
| 官网 | `public/home.html` |
| 接口文档（中/英） | `public/接口文档.html`、`public/en/api-docs.html` |
| 错误码 / 更新日志 | `public/错误码.html`、`public/更新日志.html` |
| 卡密查询 / 解绑（用户工具） | `public/卡密工具.html`、`public/tool.php` |
| 开发者登录 | `public/前台/开发者登录.php` |
| 用户后台 | `public/前台/用户后台.php` → `public/前台/后台页面/index.php` |
| 云控面板 | `public/cloud-control.php` → `public/前台/静态资源/cloud-control.js` |
| 通用资源 | `public/公共资源/`、`public/前台/静态资源/` |

## 不包含什么

- `Fcuk/Admin`：管理后台，源码不公开。
- `api/`、`后端程序/`：服务端接口与业务逻辑，不公开。
- `数据/`、`uploads/`：运行数据与用户上传，不公开。
- 数据库账号、SMTP 凭据、签名密钥、服务器地址：仓库内全部为占位符。

## 目录结构

```
public/                 # 站点根目录（nginx root 指向这里）
  home.html  接口文档.html  卡密工具.html  docs.html  错误码.html
  公共资源/             # 图标、字体、通用 JS/CSS、第三方库
  en/                   # 英文文档
  前台/
    开发者登录.php  用户后台.php  后台入口校验.php
    后台页面/index.php   # 用户后台页面
    后台模块/            # 用户后台各功能模块（JS）
    静态资源/            # 云控面板、趋势图、主题等
    平台*.html  用户协议.html
  cloud-control.php     # 云控面板渲染入口
  tool.php              # 每应用独立的卡密工具短链入口
  _backend.php          # 私有后端加载器（见下）
config.example.php      # 配置占位符（不含真实凭据）
docs/                   # 部署、结构与安全说明
```

## 部署

要求：PHP 8.1+（含 `pdo_mysql`、`openssl`、`curl`、`mbstring`）、nginx。

1. 将 `public/` 设为站点根目录。
2. 把私有后端放到 `../backend`，或设置环境变量：

   ```nginx
   fastcgi_param JIYAN_BACKEND_ROOT /path/to/private-backend;
   ```

3. 确认 `public/_backend.php` 能读到 `JIYAN_BACKEND_ROOT/src/bootstrap.php`。
4. 站点根路径不要暴露 `config.example.php` 与 `docs/`（它们本来就在 `public/` 之外）。

纯静态页面（官网、接口文档、卡密工具）不依赖后端即可打开；用户后台与云控面板需要后端会话。

## 与后端对接

- 卡密工具通过 `POST /api/env/api.php` 调用公开的查询/解绑动作。
- 用户后台通过私有的管理接口读取数据；本仓库把管理接口地址统一写成占位路径 `/api/console/api.php`，部署时由后端映射到实际地址。
- 云控面板的入口链接由后端生成，前端只负责渲染与调用。

## 脱敏说明

公开版本与生产版本相比，做了这些处理：

- 移除了用户后台中直接读取数据库的 SQL 片段，改为静态默认值。
- 所有后端绝对路径改为 `_backend.php` + `JIYAN_BACKEND_ROOT`。
- 管理接口路径改为 `/api/console/api.php` 占位。
- 签名占位串、下载地址均为示例值。
- 不含任何服务器 IP、数据库账号密码、SMTP 凭据。

详见 [docs/zh/security.md](docs/zh/security.md)。

## 协议与安全

- 加密与签名协议见 [接口文档](public/接口文档.html)。
- 安全问题请走 [SECURITY.md](SECURITY.md)，不要开公开 Issue。

## 许可证

[AGPL-3.0](LICENSE)。你可以自建、修改并对外提供服务，但修改后的版本必须同样以 AGPL-3.0 开源。

## 声明

- 本项目与 Geetest（极验）无关，「极验云验证」为其作者独立产品名称。
- 部分代码与文档在 AI 辅助下完成，已人工复核。
