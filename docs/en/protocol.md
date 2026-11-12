# Protocol

The frontend only calls user-facing endpoints and expects same-origin cookies.

## ENV transport

`POST /api/env/api.php` with JSON:

```json
{ "developer_username": "JiYan", "data": "<hex>" }
```

`data` encodes an urlencoded query string:

```
kh = sum(byte(uid)[i] * (i + 1)) % 100
code[i] = ((plain[i] ^ key[(i + kh) % len]) + kh + i) % 256
key = utf8(uid)
```

Responses are hex-encoded JSON `{ success, message, data, signature }`. Transport errors return plain `JiYan_Error<reason>`.

This is an encoding layer, **not encryption**; always use HTTPS. Implementation: `src/lib/envproto.ts`.

## Public tools (no session)

| action | params | purpose |
| --- | --- | --- |
| `web_card_query` | `card_key`, optional `code` / `app_key` | Card state, expiry, bound device, unbind quota |
| `web_unbind` | `card_key`, `device_id`, optional `app_id` | Unbind a device (server rate-limits by IP) |

## Account API

`/api/账号接口入口.php` with `{ success, message, data }`:

- `login` (POST, `account`, `password`)
- `me` (GET)
- `logout` (POST)

## Cloud panel

1. `get_apps` (ENV) to list apps.
2. `open_cloud_control` (ENV, `app_id`) returns a short-lived panel link.
3. Open the link once: the server sets the panel session cookie and exposes `window.JY_CLOUD = { app, csrf, expires_at }`.
4. `POST /api/env/cloud-control.php` with `{ app_id, action, csrf, ... }`.

Actions: `state`, `set_value` (`key`, `value`, `duration`), `release_value` (`key`), `execute` (`key`, `request_id`, `ttl`), `users`.

Panel routes are issued by the backend; the client never hard-codes them.

## Errors

Business errors use `{ success: false, message }` with HTTP 400/403/429. Expired sessions return 401 and the SPA redirects to sign-in.
