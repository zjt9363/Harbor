# Harbor 桌面客户端

`apps/desktop` 是 Harbor 的 Electron 桌面客户端工程。

这份文档按“前端零基础也能读”的方式来写，重点回答三个问题：

1. 这个客户端现在能做什么
2. 这个 Electron 项目由哪些部分组成
3. 当前真实聊天链路是怎么打通的

## 当前能力

当前这版桌面端已经具备：

- 桌面应用窗口
- 本地聊天界面
- DeerFlow 真实消息发送 / 接收
- 本地目录选择
- 配置中心
- 本地日志系统
- 深色工作台式布局

当前这版已经直接接入 DeerFlow，但还没有 Harbor 自己的登录鉴权层。

## 配置方式

当前桌面端已经不需要“改源码才能换后端地址”。

现在的配置入口有两种：

- 应用内“设置”面板
- 本地 JSON 配置文件

当前已支持的配置项：

- `backendBaseUrl`：DeerFlow 服务地址

配置文件由 Electron 写到用户可写目录，适合打包后的安装版和便携版继续修改。应用里也提供了：

- 保存配置
- 测试连接
- 打开配置文件

后续如果要继续增加更多配置，例如：

- Harbor 鉴权 / 业务后端代理层地址
- 默认模型
- 上传限制
- 调试开关

也可以继续沿着这套配置中心扩展。

## 日志与排障

当前桌面端已经补了本地日志，方便定位黑屏、启动失败、配置读取失败和 DeerFlow 请求问题。

开发时日志默认落到：

- `storage/logs/desktop/main.log`
- `storage/logs/desktop/renderer.log`

打包后的 exe 运行时，日志优先落到可执行文件同级目录下：

- `logs/main.log`
- `logs/renderer.log`

例如 `win-unpacked` 版本通常会落到：

- `release/desktop/win-unpacked/logs/main.log`
- `release/desktop/win-unpacked/logs/renderer.log`

当前已经记录的关键阶段包括：

- 主进程启动
- 窗口创建与页面加载
- 配置文件读写
- 前端初始化
- 发送消息与 DeerFlow 请求
- 前端未捕获异常
- 渲染进程崩溃或加载失败

## 运行与打包

开发时常用命令：

- 根目录运行：`npm run dev:desktop`
- 仅构建桌面端：`npm run build:desktop`

打包时常用命令：

- 生成未封装目录：`npm run pack:desktop`
- 生成 Windows 安装包：`npm run dist:desktop:win`
- 生成 Windows 便携版：`npm run dist:desktop:portable`
- 通过脚本入口打安装包：`npm run package:desktop`

打包产物默认输出到：

- `release/desktop/`

其中：

- `pack:desktop` 适合本地检查打包结构
- `dist:desktop:win` 会生成 NSIS 安装包
- `dist:desktop:portable` 会生成免安装的便携版 `.exe`

## 技术栈

当前实际使用的是：

- Electron
- React
- TypeScript
- Vite
- CSS
- `lucide-react`

可以这样理解：

- Electron 负责把网页界面装进桌面应用壳里
- React 负责写界面和交互
- TypeScript 是加了类型的 JavaScript
- Vite 负责开发启动和前端构建
- CSS 负责样式

## 项目结构

```text
apps/desktop/
  electron/
    main.ts          Electron 主进程入口
    preload.cts      安全桥接层
    config.ts        桌面端配置读写
    logger.ts        主进程日志
  src/
    App.tsx          主界面组件
    main.tsx         React 挂载入口
    logger.ts        渲染层日志
    index.css        页面样式
    types.d.ts       浏览器全局类型声明
  index.html         渲染页面的 HTML 外壳
  package.json       子项目脚本和依赖
  tsconfig*.json     TypeScript 配置
  vite.config.ts     Vite 配置
```

## 先理解 Electron 的三层结构

Electron 项目通常分三层：

### 1. 主进程

文件：`electron/main.ts`

这是桌面应用的“主控层”，负责：

- 创建窗口
- 控制窗口大小和标题栏
- 打开系统目录选择框
- 管理应用生命周期
- 转发 DeerFlow 请求
- 写主进程日志

### 2. 预加载层

文件：`electron/preload.cts`

这是“安全桥接层”。

原因是 React 页面运行在浏览器环境里，不应该直接拥有 Node.js 的全部能力。所以当前项目采用：

- 主进程掌握原生能力
- 预加载层暴露少量受控方法
- React 页面只调用这些方法

例如：

- `window.harbor.selectWorkspace()`
- `window.harbor.getConfig()`
- `window.harbor.sendMessage()`

### 3. 渲染层

文件：`src/main.tsx`、`src/App.tsx`

这部分就是你看到的界面，本质上是一套 React 前端。它负责：

- 左侧栏
- 聊天消息区
- 输入框
- 设置面板
- 当前工作目录展示
- 页面状态更新

## 启动链路

运行 `npm run dev:desktop` 后，大致会发生这些事：

1. 根目录脚本切到 `apps/desktop`
2. Vite 启动前端开发服务器
3. Electron 启动桌面窗口
4. Electron 窗口加载 Vite 提供的页面
5. React 在 `#root` 节点上渲染整个客户端

如果想按代码顺序理解，建议按下面顺序看：

1. `apps/desktop/package.json`
2. `apps/desktop/electron/main.ts`
3. `apps/desktop/electron/preload.cts`
4. `apps/desktop/src/main.tsx`
5. `apps/desktop/src/App.tsx`
6. `apps/desktop/src/index.css`

## 每个核心文件是做什么的

### `package.json`

这里定义：

- 项目依赖
- `dev` / `build` / `pack` / `dist` 等脚本

可以把它看成这个子项目的“运行说明书”。

### `electron/main.ts`

这里负责创建 `BrowserWindow`，也负责：

- 调配置读写模块
- 调 DeerFlow HTTP 接口
- 接收渲染层的 IPC 请求
- 写主进程日志

### `electron/preload.cts`

这里通过 `contextBridge.exposeInMainWorld(...)` 把安全 API 挂到页面上。

这也是为什么前端可以写：

```ts
window.harbor.selectWorkspace()
```

而不是直接在 React 里调用 Electron 原生模块。

### `src/main.tsx`

这是 React 应用入口。它做的事情很简单：

- 找到 HTML 里的 `#root`
- 把 `<App />` 挂进去
- 注册渲染层全局错误日志

### `src/App.tsx`

这是当前最重要的页面文件。

里面包含：

- 当前会话状态
- 输入框状态
- 设置面板状态
- DeerFlow 状态展示
- 点击发送后的真实请求逻辑
- 整个界面 JSX 结构

### `src/index.css`

这是界面样式文件，负责：

- 布局
- 颜色
- 圆角
- 间距
- 消息卡片样式
- 设置面板样式

### `electron/config.ts`

这是桌面端配置模块，负责：

- 读取本地配置文件
- 写入本地配置文件
- 提供默认配置

### `electron/logger.ts` 与 `src/logger.ts`

这是日志模块，负责：

- 主进程日志落盘
- 渲染层日志落盘
- 启动阶段与异常阶段的关键日志记录

## 什么是 `.tsx`

你会看到 `App.tsx` 不是 `.ts`，而是 `.tsx`。

这是因为它里面写了 JSX，也就是“在 TypeScript 里直接写界面结构”的语法，例如：

```tsx
<button>发送</button>
```

所以可以这样记：

- `.ts`：普通 TypeScript 逻辑文件
- `.tsx`：包含 React 组件界面的 TypeScript 文件

## 什么是 React 状态

在 `App.tsx` 里会看到 `useState(...)`。

这表示“组件状态”，例如：

- 输入框当前内容
- 当前消息列表
- 当前会话
- 当前是否正在回复
- 当前设置面板是否打开

这些值一变化，React 会自动重新渲染页面。

## 什么是 `useEffect`

`useEffect` 可以理解成：

- 当某些状态变化后，额外执行一段副作用逻辑

当前项目里它主要用于：

- 消息更新后自动滚动到底部
- 首次进入页面时初始化配置和后端状态

## 当前消息链路是怎么跑通的

当前消息发送流程是：

1. 你在输入框输入文字
2. React 用状态保存这段文字
3. 你点击“发送”
4. 前端先把这条用户消息加入 `messages`
5. React 通过 `window.harbor.sendMessage(...)` 调 Electron 主进程
6. Electron 主进程请求 DeerFlow 的 `/api/runs/wait`
7. DeerFlow 返回当前线程的最新结果
8. Harbor 提取最后一条 AI 消息并显示在页面上

这就是当前 MVP 的“真实后端消息闭环”。

## 为什么当前先直连 DeerFlow

当前版本采用的是：

- Harbor 桌面客户端先直接连接 DeerFlow
- 后续再在前面补 Harbor 自己的鉴权和业务后端

这样做的好处是：

- 可以先验证真实 Agent 链路
- 不会被账号体系阻塞主链路联调
- 后面补 Harbor 鉴权 / 业务后端代理层时，桌面端调用方式基本不用大改

## 建议的阅读顺序

如果你是前端新手，建议按下面顺序熟悉：

1. `apps/desktop/src/App.tsx`
2. `apps/desktop/src/index.css`
3. `apps/desktop/electron/preload.cts`
4. `apps/desktop/electron/main.ts`

## 一句话总结

这个项目本质上是“Electron 外壳 + React 页面 + 预加载安全桥接”的桌面应用。

如果只记一句话，那就是：

“`main.ts` 管桌面窗口和本地能力，`preload.cts` 管安全桥接，`App.tsx` 管页面界面和交互。”
