# EaseCation Open User Center

[![License](https://img.shields.io/badge/License-AGPL--3.0-A42E2B?style=for-the-badge)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-43853D?style=for-the-badge&logo=node.js&logoColor=white)](#环境要求)
[![React](https://img.shields.io/badge/React-18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](#项目概览)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-6-1677FF?style=for-the-badge&logo=antdesign&logoColor=white)](#项目概览)
[![Yarn](https://img.shields.io/badge/Yarn-4.5.1-2C8EBB?style=for-the-badge&logo=yarn&logoColor=white)](#环境要求)

![EaseCation Open User Center](docs/open-user-center.png)

欢迎来到 `EaseCation Open User Center`。这是 EaseCation 用户中心的开源仓库，也是我们第一个正式公开的 Web 平台项目。

过去我们陆续开源过一些服务器内部项目，而这一次，我们想把更贴近社区日常使用体验的一部分真正交到大家手里。

我们希望能为 MC 社区提供一个稳定、易用的现代化工单平台，也给热心玩家和开发者一个可以一起参与共建的入口。这个仓库聚焦的，就是登录、账号绑定、工单处理、后台运营和本地联调支持这些用户中心核心能力。

## 项目概览

EaseCation 用户中心目前由以下几个部分组成：

| 模块 | 说明 |
| --- | --- |
| `frontend-user` | 面向玩家和普通用户的前台，负责登录、绑定账号、提交工单、查看处理进度等流程。 |
| `frontend-admin` | 面向客服、审核和管理人员的后台，负责工单分配、处理、回复、追踪和基础运营操作。 |
| `frontend-common` | 前后台共享的环境配置、公共样式、上下文、Hook 和通用组件。 |
| `shared` | 前端共用的类型、接口契约和共享逻辑。 |
| `mock-backend` | 本地联调用的模拟后端，提供稳定、可预测的接口响应。 |

系统覆盖的核心场景包括：

- 玩家申诉、举报、建议反馈
- 账号绑定、WIKI 绑定、媒体相关申请
- 物品补发及其他人工服务流程
- 后台工单分配、状态流转、回复记录与基础运营操作

## 开源范围

当前仓库已开放：

- `frontend-user`
- `frontend-admin`
- `frontend-common`
- `shared`
- `mock-backend`

当前暂未开放：

- 生产后端
- 数据库迁移
- 部署密钥
- 私有基础设施配置

现阶段后端逻辑仍与 EaseCation 的其他 Web 服务存在较强耦合。后续会在内部完成进一步重构，再择机开放更完整的后端实现。

## 环境要求

- Node.js `>= 18`
- Corepack
- Yarn `4.5.1`

建议先在本机启用 Corepack 并固定 Yarn 版本：

```bash
corepack enable
corepack prepare yarn@4.5.1 --activate
```

## 快速开始

### 1. 安装依赖

```bash
yarn install
```

### 2. 初始化环境变量

```bash
cp frontend-common/.env.template frontend-common/.env
cp frontend-admin/.env.template frontend-admin/.env
cp mock-backend/.env.template mock-backend/.env
```

默认本地联调场景下，通常保持模板默认值即可。

### 3. 一键启动本地联调

```bash
yarn mock
```

默认访问地址：

| 服务 | 地址 |
| --- | --- |
| 用户端 | `http://localhost:9001` |
| 管理端 | `http://localhost:9002` |
| Mock 后端 | `http://localhost:9000` |

## 常用命令

### 开发相关

| 命令 | 说明 |
| --- | --- |
| `yarn mock` | 一键启动共享包构建、Mock 后端、用户前台和管理后台，适合首次运行或完整联调。 |
| `yarn dev:user` | 仅启动用户前台。 |
| `yarn dev:admin` | 仅启动管理后台。 |
| `yarn mock:backend` | 仅启动本地 Mock 后端。 |

### 质量检查

| 命令 | 说明 |
| --- | --- |
| `yarn check:i18n` | 检查多语言文案与硬编码中文，避免破坏现有国际化约定。 |
| `yarn check:dark-mode-api` | 检查暗色模式相关 API 的使用方式。 |
| `yarn quality:frontend` | 串行执行前端质量检查。 |
| `yarn check:secrets` | 检查仓库中是否误提交敏感信息。 |

### 构建与验证

| 命令 | 说明 |
| --- | --- |
| `yarn type-check` | 对 `shared`、前台、后台和 Mock 后端执行 TypeScript 类型检查。 |
| `yarn test` | 运行各工作区测试。 |
| `yarn build` | 构建共享包、用户前台和管理后台，用于验证生产构建是否通过。 |

## 协作约定

如果你希望参与公开协作，可以优先关注以下目录：

- `frontend-user/`
- `frontend-admin/`
- `frontend-common/`
- `shared/`
- `mock-backend/`

补充说明：

- 前端 API 契约和共享类型定义位于 `shared/`
- 本地联调默认依赖 `mock-backend/`
- 涉及公共逻辑时，优先复用 `frontend-common/` 中已有能力

欢迎通过 Issue、Discussion 或 Pull Request 参与改进。

## License

本仓库采用 `GNU AGPL-3.0` 许可证开源。

如果你分发修改版本，或将修改后的版本作为网络服务对外提供使用，需要按照 `AGPL-3.0` 的要求继续公开对应源码。完整条款见根目录 [LICENSE](LICENSE)。

## 品牌与美术资源说明

仓库中的代码以 `AGPL-3.0` 开源，但 EaseCation 的品牌名称、Logo、美术形象、宣传图、视觉素材及其他品牌识别元素不随本仓库代码一并授权。

除非事先获得明确书面许可，否则你不能直接复用、分发、修改或在衍生项目中使用这些受版权保护的品牌与美术资源，也不能将你的项目描述为 EaseCation 官方产品或与 EaseCation 存在官方合作关系。

## Contributors

`easecation-open-user-center` 的公开版本承接自 `easecation-user-center` 的长期建设成果。下面这些贡献者曾在原仓库阶段参与功能开发、维护、测试、协作与自动化工作：

<p>
  <a href="https://github.com/pengyue-polaron" title="Peng Yue"><img src="https://github.com/pengyue-polaron.png?size=72" width="72" height="72" alt="Peng Yue" /></a>
  <a href="https://github.com/gih10012" title="gihggiy"><img src="https://github.com/gih10012.png?size=72" width="72" height="72" alt="gihggiy" /></a>
  <a href="https://github.com/watercuppp" title="watercup"><img src="https://github.com/watercuppp.png?size=72" width="72" height="72" alt="watercup" /></a>
  <a href="https://github.com/boybook" title="boybook"><img src="https://github.com/boybook.png?size=72" width="72" height="72" alt="boybook" /></a>
  <a href="https://github.com/JunxuanB" title="Junxuan Bao"><img src="https://github.com/JunxuanB.png?size=72" width="72" height="72" alt="Junxuan Bao" /></a>
  <a href="https://github.com/uwu7gxr" title="uwu7gxr"><img src="https://github.com/uwu7gxr.png?size=72" width="72" height="72" alt="uwu7gxr" /></a>
  <a href="https://github.com/liuli1719" title="琉璃"><img src="https://github.com/liuli1719.png?size=72" width="72" height="72" alt="琉璃" /></a>
  <a href="https://github.com/LuRenDing2020" title="LuRenDing2020"><img src="https://github.com/LuRenDing2020.png?size=72" width="72" height="72" alt="LuRenDing2020" /></a>
  <a href="https://github.com/guitar0788" title="guitar0788"><img src="https://github.com/guitar0788.png?size=72" width="72" height="72" alt="guitar0788" /></a>
  <a href="https://github.com/huangyxHUTAO" title="南鸢晨星"><img src="https://github.com/huangyxHUTAO.png?size=72" width="72" height="72" alt="南鸢晨星" /></a>
  <a href="https://github.com/Colerar" title="Colerar"><img src="https://github.com/Colerar.png?size=72" width="72" height="72" alt="Colerar" /></a>
  <a href="https://github.com/U29kaXVt" title="U29kaXVt"><img src="https://github.com/U29kaXVt.png?size=72" width="72" height="72" alt="U29kaXVt" /></a>
  <a href="https://github.com/xiakele" title="xiakele"><img src="https://github.com/xiakele.png?size=72" width="72" height="72" alt="xiakele" /></a>
</p>

[`pengyue-polaron`](https://github.com/pengyue-polaron) · [`gihggiy`](https://github.com/gih10012) · [`watercup`](https://github.com/watercuppp) · [`boybook`](https://github.com/boybook) · [`Junxuan Bao`](https://github.com/JunxuanB) · [`uwu7gxr`](https://github.com/uwu7gxr) · [`琉璃`](https://github.com/liuli1719) · [`LuRenDing2020`](https://github.com/LuRenDing2020) · [`guitar0788`](https://github.com/guitar0788) · [`南鸢晨星`](https://github.com/huangyxHUTAO) · [`Colerar`](https://github.com/Colerar) · [`U29kaXVt`](https://github.com/U29kaXVt) · [`xiakele`](https://github.com/xiakele)

感谢所有参与项目建设、提出反馈和贡献代码的开发者与社区成员。
