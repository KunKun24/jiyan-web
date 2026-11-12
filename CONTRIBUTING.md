# 贡献指南

感谢你愿意改进极验云用户端前端。

## 可以提交

- 用户端页面的可用性、可访问性与性能改进。
- 卡密工具、云控面板的交互修复。
- 文档纠错、英文翻译改进。
- 协议层与工具函数的测试补充。

## 不接受

- 管理后台、服务端、数据库结构、部署脚本或签名密钥相关代码。
- 任何真实凭据、内部地址、服务器 IP、数据库账号、管理端路径或内部人员信息。
- 绕过限流、批量枚举卡密、自动化滥用公开接口的功能。
- 与产品定位无关的大型重构或新框架引入。

## 开发流程

1. Fork 并创建分支：`feat/xxx`、`fix/xxx`、`docs/xxx`。
2. `npm install`，修改后至少运行：
   ```bash
   npm run test
   npm run build
   ```
3. 提交前自查：`git diff` 中不得出现密钥、Cookie、内网地址、管理端信息。
4. 发起 Pull Request，说明动机、改动点与验证方式。

## 代码风格

- TypeScript strict，避免 `any`；跨模块类型放在 `src/api`。
- 组件使用 `<script setup lang="ts">`，样式沿用 `src/styles/base.css` 的 token。
- 新增协议字段时同步更新 `docs/zh/protocol.md` 与 `docs/en/protocol.md`。

## 提交信息

使用 Conventional Commits：`feat: ...`、`fix: ...`、`docs: ...`、`test: ...`、`chore: ...`。
