# Harbor Desktop

`apps/desktop` 是 Harbor 的 Electron 桌面客户端工程。

这份文档按“完全不懂前端”的阅读方式来写，目标是帮助你回答三个问题：

1. 这个项目现在能做什么
2. 这个 Electron 项目由哪些文件组成
3. 每一层代码各自负责什么

## 当前能力

当前这版是桌面端 MVP，已经具备：

- 桌面应用窗口
- 本地聊天界面
- 模拟消息发送 / 接收
- 本地目录选择
- 深色工作台式布局

当前这版还没有接入真实后端，所以聊天回复仍然是前端里的模拟数据。

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

这套栈可以这样理解：

- Electron 负责把网页 UI 装进桌面应用壳里
- React 负责写界面和交互
- TypeScript 是加了类型的 JavaScript
- Vite 负责开发启动和打包
- CSS 负责样式

## 项目结构

```text
apps/desktop/
  electron/
    main.ts          Electron 主进程入口
    preload.ts       安全桥接层
  src/
    App.tsx          主界面组件
    main.tsx         React 挂载入口
    index.css        页面样式
    types.d.ts       浏览器全局类型声明
  index.html         渲染页面的 HTML 壳
  package.json       子项目脚本和依赖
  tsconfig*.json     TypeScript 配置
  vite.config.ts     Vite 配置
```

## 先理解 Electron 的三层结构

Electron 项目通常要分三层来看：

### 1. Main Process

文件：`electron/main.ts`

这是桌面应用的“主进程”。它更像应用管家，负责：

- 创建窗口
- 控制窗口大小和标题栏
- 打开系统目录选择框
- 管理应用生命周期

你可以把它理解成“桌面外壳层”，它不直接负责渲染聊天页面。

### 2. Preload

文件：`electron/preload.ts`

这是“安全桥接层”。

原因是：React 页面运行在浏览器环境里，默认不应该直接拥有 Node.js 的全部能力。否则页面脚本就可以直接读文件、调系统 API，风险太大。

所以 Electron 推荐这样做：

- 主进程掌握原生能力
- Preload 暴露少量、受控的方法
- React 页面只调用这些方法

当前项目里，React 页面通过 `window.harbor.selectWorkspace()` 请求打开目录选择器，这个方法就是 Preload 暴露出来的。

### 3. Renderer

文件：`src/main.tsx`、`src/App.tsx`

这部分就是你真正看到的 UI 页面，本质上是一套 React 前端。

它负责：

- 左侧栏
- 聊天消息区
- 输入框
- “选择目录”按钮
- 本地状态变化

所以 Electron 项目不是“只有桌面代码”，而是：

- 外面一层桌面壳
- 里面一层正常前端页面

## 这个项目的启动链路

你运行 `npm run dev:desktop` 后，大致会发生这些事：

1. 根目录脚本转到 `apps/desktop`
2. Vite 启动前端开发服务器
3. Electron 启动桌面窗口
4. Electron 窗口加载 Vite 提供的页面
5. React 在 `#root` 节点上渲染整个聊天界面

如果你想按文件顺序理解，可以按这个顺序看：

1. `apps/desktop/package.json`
2. `apps/desktop/electron/main.ts`
3. `apps/desktop/electron/preload.ts`
4. `apps/desktop/src/main.tsx`
5. `apps/desktop/src/App.tsx`
6. `apps/desktop/src/index.css`

## 每个核心文件是干什么的

### `package.json`

这里定义：

- 项目依赖
- `dev` / `build` / `lint` 等脚本

你可以把它看成这个子项目的“运行说明书”。

### `electron/main.ts`

这里负责创建 `BrowserWindow`。

`BrowserWindow` 可以理解为：

- 一个桌面窗口
- 里面装着一个网页渲染环境

它还注册了目录选择相关的 IPC 处理逻辑。

### `electron/preload.ts`

这里用 `contextBridge.exposeInMainWorld(...)` 把安全 API 挂到页面上。

这就是为什么前端可以写：

```ts
window.harbor.selectWorkspace()
```

而不是直接在 React 里调用 Electron 原生模块。

### `src/main.tsx`

这是 React 应用入口。它做的事情很简单：

- 找到 HTML 里的 `#root`
- 把 `<App />` 挂进去

前端很多项目都会有这样一个很薄的入口文件。

### `src/App.tsx`

这是当前最重要的页面文件。

里面包含：

- 初始消息数据
- 当前会话数据
- 输入框状态
- 点击发送后的模拟回复逻辑
- 选择目录后的状态更新
- 整个界面 JSX 结构

如果你把它类比成后端世界，可以把它理解成“当前页面的主控制器 + 模板”。

### `src/index.css`

这是界面样式文件。

它控制：

- 布局
- 颜色
- 圆角
- 间距
- 消息卡片样式
- 输入框样式

前端里“功能”和“样式”通常会分开写：

- 功能逻辑在 `.ts` / `.tsx`
- 样式在 `.css`

## 什么是 `.tsx`

你会看到 `App.tsx` 不是 `.ts`，而是 `.tsx`。

这是因为它里面写了 JSX。

JSX 是一种“在 JavaScript / TypeScript 里直接写界面结构”的语法，比如：

```tsx
<button>发送</button>
```

它最后会被编译成正常的 JavaScript。

所以可以这样记：

- `.ts`：普通 TypeScript 逻辑文件
- `.tsx`：包含 React 组件界面的 TypeScript 文件

## 什么是 React State

在 `App.tsx` 里你会看到 `useState(...)`。

这表示“组件状态”。

例如：

- 输入框里当前输入的内容
- 当前消息列表
- 当前是否正在回复

这些值一变化，React 会自动重新渲染页面。

这也是为什么前端代码看起来像：

- 先定义状态
- 再定义点击事件
- 最后返回页面结构

## 什么是 `useEffect`

`useEffect` 可以理解成：

- 当某些状态变化后，额外执行一段副作用逻辑

当前项目里它用来做：

- 消息更新后自动滚动到底部

这类“不是直接渲染，而是伴随状态变化发生的动作”通常就会写在 `useEffect` 里。

## 这条聊天链路是怎么跑通的

当前消息发送流程是：

1. 你在输入框输入文字
2. React 用状态保存这段文字
3. 你点击“发送”
4. 前端把这条用户消息加入 `messages`
5. 前端用 `setTimeout` 模拟服务器延迟
6. 再插入一条 assistant 消息
7. 页面重新渲染，所以你就看到新的聊天内容

这就是当前 MVP 的“最小消息闭环”。

## 为什么现在没有后端也能动

因为当前版本把“服务端回复”先写死在前端里了。

这是一种很常见的早期开发方式：

- 先把界面和交互做通
- 再把模拟数据替换成真实 API

这样可以先验证产品形态，不会一上来就被后端联调卡住。

## 你接下来最值得重点看的文件

如果你是前端新手，建议按下面顺序熟悉：

1. `apps/desktop/src/App.tsx`
2. `apps/desktop/src/index.css`
3. `apps/desktop/electron/preload.ts`
4. `apps/desktop/electron/main.ts`

这个顺序的好处是：

- 先看你能直接看到的界面
- 再看样式
- 再看页面和系统能力怎么通信
- 最后再看桌面壳本身

## 一句话总结

这个项目本质上是“Electron 外壳 + React 页面 + Preload 安全桥接”的桌面应用。

如果你只先记住一句话，那就是：

“`main.ts` 管桌面窗口，`preload.ts` 管安全桥接，`App.tsx` 管页面界面和交互。”
