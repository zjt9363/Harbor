# Harbor

Harbor 是一个面向团队内部使用的本地优先桌面 Agent 平台。

当前根目录 npm 工作区只管理 `apps/desktop` 这个桌面客户端工程。`services/` 下的代码不属于根工作区。

## 当前实现状态

当前可运行的客户端位于 `apps/desktop`，技术栈如下：

- Electron：桌面应用外壳、原生窗口、系统对话框
- React：渲染层界面
- TypeScript：客户端与 Electron 入口代码
- Vite：开发服务器与前端构建
- CSS + `lucide-react`：当前界面样式与图标

当前桌面端已经具备：

- 本地聊天界面
- 真实 DeerFlow 消息收发链路
- 本地工作目录选择
- 配置中心
- 本地日志落盘
- 接近 Codex 风格的深色桌面布局

当前阶段桌面端直接连接 DeerFlow，尚未引入 Harbor 自己的登录鉴权层或业务后端代理层。

## 仓库结构

```text
docs/          产品、架构、路线图与选型文档
apps/          面向用户的应用
services/      外部服务或独立后端代码
packages/      共享包
scripts/       本地辅助脚本，例如打包入口
infra/         基础设施配置与脚本
storage/       本地开发期生成的数据与缓存
```

## 当前重点

当前项目重点已经从“桌面端骨架搭建”切换为：

- Harbor 直连 DeerFlow
- 补真实聊天主链路
- 后续再补文件上传、历史会话与连接状态
- 最后再在 DeerFlow 前面加 Harbor 自己的鉴权层

## 推荐阅读顺序

如果你想快速理解当前实现，建议按下面顺序阅读：

1. `apps/desktop/README.md`
2. `apps/desktop/electron/main.ts`
3. `apps/desktop/electron/preload.cts`
4. `apps/desktop/src/App.tsx`
5. `apps/desktop/src/index.css`

如果你想看产品与架构文档，建议从 `docs/` 下这几份开始：

- `Harbor-开发者搭建部署指南-v0.1.md`
- `Harbor-技术选型-v0.1.md`
- `Harbor-DeerFlow接入方案-v0.1.md`
- `Harbor-系统架构设计-v0.1.md`
- `Harbor-实现路线图-v0.1.md`
