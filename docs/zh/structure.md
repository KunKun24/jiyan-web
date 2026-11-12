# 目录结构

| 路径 | 说明 |
| --- | --- |
| `public/home.html` | 官网首页 |
| `public/接口文档.html` | 中文接口文档 |
| `public/en/api-docs.html` | English API docs |
| `public/卡密工具.html` | 卡密查询 / 解绑工具 |
| `public/tool.php` | 每应用独立工具的短链入口 |
| `public/前台/开发者登录.php` | 登录页 |
| `public/前台/用户后台.php` | 用户后台壳 |
| `public/前台/后台页面/index.php` | 用户后台页面与内联样式 |
| `public/前台/后台模块/` | 用户后台各功能模块（JS） |
| `public/前台/静态资源/` | 云控面板、趋势图、主题、图表库 |
| `public/cloud-control.php` | 云控面板渲染入口 |
| `public/_backend.php` | 私有后端加载器 |
| `config.example.php` | 配置占位符示例 |
| `docs/` | 部署与安全说明 |

## 请求链路

1. 浏览器加载 `public/` 下的页面。
2. 页面里的 JS 调用 `/api/env/api.php`（卡密工具，公开动作）或用户后台接口。
3. 云控面板由后端生成的签名链接打开 `cloud-control.php`，前端读取 `window.JY_CLOUD` 后调用面板接口。
