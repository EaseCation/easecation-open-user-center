# easecation-user-center mock backend

用于给 `easecation-user-center` 前端 Demo 提供最小可用接口。

目标：

- 保持与主项目常用接口路径一致
- 返回简单、稳定、可预测的数据
- 让前端在无真实后端时也能正常演示

## 快速启动

在仓库根目录一键启动（推荐）：

```bash
yarn mock
```

仅启动 mock 后端：

```bash
cd mock-backend
yarn install
yarn start
```

默认监听：`http://localhost:9000`

## 环境变量

- `MOCK_BACKEND_PORT`：服务端口（默认 `9000`）
- `PORT`：服务端口（与 `MOCK_BACKEND_PORT` 二选一）
- `MOCK_FRONTEND_USER_URL`：用户前端地址（默认 `http://localhost:9101`）
- `MOCK_FRONTEND_ADMIN_URL`：管理前端地址（默认 `http://localhost:9102`）

## 已覆盖的接口分组

- 用户：`/user/*`
- 登录回调与上传凭证：`/callback/*`
- 玩家信息：`/ec/*`
- 工单：`/ticket/*`
- 反馈：`/feedback/*`
- 媒体：`/media/*`
- 商城：`/item/*`
- 公告：`/announcement*`
- 风险审批：`/risk-approval*`
- 原石礼品：`/tlgift/*`
- WIKI 绑定：`/wiki/*`
- 代理：`/proxy/*`
- 员工别名：`/staff/*`
- 脚本中心：`/script/*`
- 快捷语：`/shortcut/*`
- 委托：`/entrust/*`
- 年度总结：`/year-summary*`
- 兜底路由：未实现路径统一返回 `EPF_code=200` 的 mock 响应

## 说明

- 数据为内存态，重启后会重置。
- 该服务面向本地演示，不提供生产安全能力。
- 服务端代码使用 TypeScript（入口：`server.ts`）。
