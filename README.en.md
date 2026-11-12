# JiYan Cloud · User-facing Web

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-0a84ff.svg)](LICENSE)
[![CI](https://github.com/KunKun24/jiyan-web/actions/workflows/ci.yml/badge.svg)](https://github.com/KunKun24/jiyan-web/actions/workflows/ci.yml)
[![Vue 3](https://img.shields.io/badge/Vue-3-42b883.svg)](https://vuejs.org/)

The **user-facing frontend** of JiYan Cloud: landing page, card key query/unbind tool, cloud control panel and developer sign-in.

> This repository contains user-facing pages only. It does **not** include the admin console, server code, database schema, signing keys or deployment credentials. Every request goes to the public user-facing API.

[中文](README.md) · [Deployment](docs/en/deploy.md) · [Protocol](docs/en/protocol.md) · [FAQ](docs/en/faq.md)

## Features

- Landing page with product overview and entry points.
- Card tool: look up card state, expiry, bound device and unbind quota; unbind within an app scope.
- Cloud control panel: per-app feature switches, values and select options with publish/reset, plus one-shot commands.
- Sign-in and session handling (the panel requires a developer session).
- Dark mode and responsive layout.

## Stack

Vue 3 · TypeScript · Vite · Vue Router · plain CSS · Vitest.

## Development

```bash
npm install
npm run dev      # proxies /api to the official site
npm run build    # type-check + production build
npm run test
```

Override the development proxy with `JIYAN_DEV_TARGET`.

## Deployment

Cookies are same-origin, so the frontend must be served from the same site as the API. Build with `npm run build` and serve `dist/` as the site root, proxying `/api` to the backend. See [docs/en/deploy.md](docs/en/deploy.md).

## Security

No credentials or secrets are stored in the frontend. The ENV transport is an encoding layer, not encryption — always use HTTPS. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

[AGPL-3.0-only](LICENSE). Self-hosting and modification are allowed; if you offer a modified version as a network service, you must publish the corresponding source under the AGPL.

## Notice

This project is not affiliated with GEETEST. "JiYan Cloud" is an independent product name. Provided as-is, without warranty.
