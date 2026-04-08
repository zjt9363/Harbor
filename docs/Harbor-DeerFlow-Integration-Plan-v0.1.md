# Harbor 接入 DeerFlow 方案 v0.1

## 1. 文档目标

本文档用于明确 Harbor 当前阶段如何接入 `E:\Agent\services\deer-flow`，并给出“现在先怎么做、后面再怎么演进”的实际落地方案。

当前最重要的前提是：

- Harbor 桌面客户端 MVP 已经跑通
- 当前聊天链路仍然是本地前端 mock
- 本仓库已经包含 DeerFlow 2.0 子模块
- 当前阶段先追求真实链路跑通，不优先处理账号登录与鉴权

## 2. 当前决策

当前建议采用两阶段方案：

### 阶段 A：桌面端直接连接 DeerFlow

当前先让 Harbor Desktop 直接连接 DeerFlow 暴露出来的 HTTP 接口，完成真实消息收发。

当前链路定义为：

```text
Harbor Desktop -> DeerFlow Gateway / LangGraph -> Model Provider
```

这一阶段的目标是：

- 去掉客户端本地 mock 回复
- 跑通真实对话请求
- 保留会话 thread_id
- 为后续文件上传、历史会话、模型列表接入打基础

### 阶段 B：在 DeerFlow 前补一层 Harbor Auth / BFF

后续如果需要：

- 账号登录
- 用户鉴权
- 权限控制
- 审计日志
- 局域网多人使用

则不建议把完整账号系统直接塞进 DeerFlow，而是改为：

```text
Harbor Desktop -> Harbor Auth / BFF -> DeerFlow
```

这层 Harbor 自己的后端主要负责：

- 登录态
- Token / Session
- 用户与 DeerFlow thread 的映射
- 审计和权限
- 统一配置与限流

## 3. 为什么当前先直连 DeerFlow

当前阶段先直连 DeerFlow，原因如下：

- 桌面客户端 MVP 已完成，最自然的下一步就是替换 mock 回复
- DeerFlow 已经具备线程、runs、uploads、artifacts、models 等现成接口
- 现在最需要验证的是“真实 Agent 是否能在 Harbor 里正常工作”
- 如果现在就先做 Harbor 自己的鉴权后端，会显著拉长主链路验证时间

也就是说，当前阶段优先验证的是：

- Harbor 能不能正确发消息
- DeerFlow 能不能正确返回结果
- UI 能不能稳定展示真实回复

## 4. 为什么当前不直接改 DeerFlow 做账号系统

当前不建议把完整账号体系直接做进 DeerFlow，原因如下：

- DeerFlow 当前定位是 Agent Runtime / Gateway，不是完整业务平台
- DeerFlow 官方文档已明确说明默认不实现认证，且更适合本地可信环境
- 如果把 Harbor 的业务账号逻辑直接改进 DeerFlow，后续升级 DeerFlow 成本会更高
- 登录、鉴权、权限、审计，本质上属于 Harbor 自己的平台层能力

因此，后续如果需要正式登录系统，正确方向是“前面加一层”，而不是“往 DeerFlow 里硬塞整套平台逻辑”。

## 5. 当前 Harbor 需要接 DeerFlow 的最小接口

第一阶段先接以下几类接口即可：

### 5.1 健康检查

- `GET /health`

用途：

- 判断 DeerFlow 是否在线
- 在 Harbor 顶部状态栏显示连接状态

### 5.2 模型列表

- `GET /api/models`

用途：

- 判断当前可用模型
- 为后续模型切换入口做准备

第一阶段可以先不展示模型切换，只做状态探测。

### 5.3 对话运行

优先使用：

- `POST /api/runs/wait`

原因：

- 实现最简单
- 可直接复用 thread_id
- 便于先把真实回复接回来

后续增强再切到：

- `POST /api/runs/stream`

用于实现真正的流式输出。

### 5.4 后续待接接口

后面可逐步补：

- `POST /api/threads/{thread_id}/uploads`
- `GET /api/threads/{thread_id}/uploads/list`
- `GET /api/threads/search`
- `GET /api/threads/{thread_id}/state`
- `GET /api/threads/{thread_id}/artifacts/{path}`

## 6. 当前聊天链路的推荐实现

第一版推荐这样实现：

1. Harbor 在本地维护当前会话的 `thread_id`
2. 用户发送消息时，桌面端通过 Electron 主进程发 HTTP 请求
3. 请求直接调用 DeerFlow 的 `/api/runs/wait`
4. DeerFlow 返回当前线程的最新 channel values
5. Harbor 从返回结果里提取最后一条 AI 消息并显示

当前阶段建议不要在 React 页面里直接跨域请求 DeerFlow，而是通过 Electron `preload + ipc` 做一层受控桥接。这样有两个好处：

- 避免开发阶段和打包后的跨域差异
- 后续前面补 Harbor Auth / BFF 时，客户端调用方式几乎不用大改

## 7. 关于“本地工作目录”的当前处理方式

当前 Harbor 有一个本地目录选择能力，但 DeerFlow 现在并不会因为 Harbor 选中了某个 Windows 本地目录，就自动获得对该目录的访问权。

因此当前阶段应按下面方式处理：

- Harbor 仍然允许用户选择本地工作目录
- 当前目录先作为“客户端上下文提示”随消息一起发给 DeerFlow
- 需要在提示里明确：这只是 Harbor 客户端侧的本地路径，不代表 DeerFlow 已自动挂载或可直接访问该目录

这意味着当前阶段的目录能力是：

- **有上下文意义**
- **没有自动执行意义**

如果后续需要让 DeerFlow 真正使用用户本地目录，则需要再设计：

- 本地目录同步机制
- 受控文件上传机制
- 本地代理进程或本地执行器

## 8. 当前推荐的实施顺序

### 第一步：文档校正

把现有文档中的旧方案统一纠正为：

- 当前先接 DeerFlow
- 后续再加 Harbor Auth / BFF

### 第二步：接入最小真实聊天链路

本阶段只做：

- DeerFlow 健康检查
- 真实消息发送
- 真实消息回复展示
- thread_id 本地保持

### 第三步：补基础连接状态

增加：

- 顶部连接状态
- 请求失败提示
- DeerFlow 未启动时的可见错误

### 第四步：补流式与上传

后续再做：

- `/api/runs/stream`
- 文件上传
- artifact 展示

### 第五步：引入 Harbor Auth / BFF

当局域网多人使用、账号和权限成为刚需时，再补 Harbor 自己的登录鉴权层。

## 9. 当前阶段不做的事情

为了避免现在的实施范围失控，当前阶段不做：

- Harbor 自己的用户表和登录系统
- DeerFlow 内部深度改造
- PostgreSQL 用户域建模
- 多用户审计与权限控制
- 文件同步代理
- 真正的本地目录挂载执行

## 10. 一句话总结

Harbor 当前阶段的正确方向是：**桌面端先直接接上 DeerFlow，把真实聊天链路跑通；等主链路稳定后，再在前面补 Harbor 自己的登录鉴权层。**
