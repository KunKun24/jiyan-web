# 接口协议

本前端只调用用户端接口。所有请求都要求同源（或经同源反向代理），并依赖服务端 HttpOnly Cookie。

## 1. ENV 传输封装

用户端网关 `POST /api/env/api.php` 接收 JSON：

```json
{ "developer_username": "JiYan", "data": "<hex>" }
```

`data` 是 urlencoded 查询串的逐字节编码：

```
kh = sum(byte(uid)[i] * (i+1)) % 100
code[i] = ((plain[i] ^ key[(i + kh) % len]) + kh + i) % 256
key = utf8(uid)
```

响应同样是 hex，解码后是 JSON：`{ success, message, data, signature }`。

传输层失败（未解密）时返回纯文本 `JiYan_Error<原因>`。实现见 `src/lib/envproto.ts`，测试见 `tests/envproto.test.ts`。

> 这只是编码/混淆层，不是加密。不要在里面放密码或密钥，必须使用 HTTPS。

## 2. 公开工具（无需登录）

| action | 参数 | 说明 |
| --- | --- | --- |
| `web_card_query` | `card_key`，可选 `code` / `app_key` | 查询卡密状态、到期、绑定设备、解绑额度 |
| `web_unbind` | `card_key`、`device_id`，可选 `app_id` | 解绑设备，服务端按 IP 限流（5 次 / 10 分钟） |

`web_card_query` 返回的字段中包含中文键（如 `绑定状态`、`到期时间`），前端原样展示。

## 3. 账号接口

`/api/账号接口入口.php`，JSON 信封 `{ success, message, data }`：

| action | 方法 | 参数 | 说明 |
| --- | --- | --- | --- |
| `login` | POST | `account`、`password` | 成功后设置会话 Cookie |
| `me` | GET | — | 返回当前用户；未登录 401 |
| `logout` | POST | — | 销毁会话 |

## 4. 云控面板

1. 登录后调用 ENV `get_apps` 拉应用列表。
2. 调用 ENV `open_cloud_control`（参数 `app_id`），返回一次性/短期面板链接。
3. 前端打开该链接一次，服务端设置面板会话 Cookie，并在 HTML 中返回 `window.JY_CLOUD = { app, csrf, expires_at }`。
4. 之后 `POST /api/env/cloud-control.php`，JSON：

```json
{ "app_id": 123, "action": "state", "csrf": "..." }
```

常用 action：

| action | 附加参数 | 说明 |
| --- | --- | --- |
| `state` | — | 应用信息、功能项、全局值、在线统计 |
| `set_value` | `key`、`value`、`duration`（秒，0 为长期） | 保存并下发全局值 |
| `release_value` | `key` | 恢复默认值 |
| `execute` | `key`、`request_id`、`ttl` | 执行一次性按钮 |
| `users` | `page` 等 | 在线/独立控制用户列表 |

面板链接与会话由服务端签发，前端不硬编码任何面板路由。

## 5. 错误与限流

- 业务错误：`{ success: false, message }`，HTTP 400/403/429。
- 公开工具按 IP 限流，超限时 `message` 会给出等待秒数。
- 登录态失效：401，前端跳转登录页。
