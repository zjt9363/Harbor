# Harbor 技术选型 v0.1

## 1. 文档目标

本文档用于明确 Harbor 当前阶段的两类关键选型：

- 前端 / 桌面客户端技术架构选型
- LLM 模型与本地部署路线选型

这份文档的目标不是把所有可选方案都展开到非常细，而是先给项目一个清晰、可执行、便于后续落地的方向。

## 2. 当前结论

当前建议采用如下组合：

- 客户端：Electron + React + TypeScript + Vite
- 当前界面样式层：CSS + 轻量组件化
- 当前模型主选型：Gemma 4 E4B
- 当前本地部署目标：`google/gemma-4-E4B-it` + vLLM

一句话解释就是：

客户端优先走“最快落地、最好扩展”的 Electron 路线；模型优先走“开源、适合本地部署、对 Agent 足够友好”的 Gemma 4 E4B 路线。

## 3. 前端技术架构选型

### 3.1 当前项目需求

Harbor 当前的客户端不是一个普通网页，而是一个桌面工作台。它需要：

- 本地运行
- 调起系统目录选择器
- 支持本地配置能力
- 对接 DeerFlow
- 后续预留登录、鉴权、上传、历史会话、流式消息等扩展

### 3.2 备选方案

#### 方案一：Electron + React + TypeScript + Vite

优点：

- 桌面能力成熟
- 社区最成熟，资料多
- 本地文件、目录、系统桥接能力好做
- 对后续“配置中心”“日志系统”“本地能力扩展”很友好
- 团队如果熟悉前端，上手最快

缺点：

- 包体积偏大
- 运行时资源占用高于 Tauri

#### 方案二：Tauri + React + TypeScript

优点：

- 包体积更小
- 资源占用更轻
- 桌面原生感更强

缺点：

- 需要额外处理 Rust 层
- 当前阶段会增加工程复杂度
- 对“先快速把产品做出来”不如 Electron 顺手

#### 方案三：纯 Web 前端

优点：

- 技术简单
- 部署方便

缺点：

- 很难自然地承载本地目录访问
- 后续本地能力桥接更绕
- 不符合 Harbor 当前的桌面工作台定位

### 3.3 当前结论

当前阶段明确选择：

- Electron
- React
- TypeScript
- Vite

原因是：

- Harbor 已经走到这条技术栈上
- 这套技术栈已经足够支撑当前 MVP 和后续 DeerFlow 联调
- 对“本地配置中心、日志系统、目录选择、本地文件能力”非常合适

### 3.4 当前状态管理建议

当前阶段建议：

- 页面状态先用 React state
- 如果后面会话和设置变复杂，再加 Zustand
- 服务端数据缓存后续可引入 TanStack Query
- 与本地能力通信继续使用 Electron 预加载层 + IPC

## 4. LLM 模型选型

### 4.1 当前项目需求

Harbor 当前不是做一个通用闲聊机器人，而是做一个：

- 接 DeerFlow 的 Agent 桌面入口
- 面向本地部署 / 局域网使用
- 未来要承接工具调用、文件处理、任务型对话

所以模型选型重点不是只看“聊天自然度”，而要看：

- 是否开源 / 可本地部署
- 是否适合 Agent / 工具调用
- 是否有较成熟的 vLLM 部署路径
- 是否容易和 DeerFlow 集成
- 许可证是否友好

### 4.2 候选方向

#### 方案一：Gemma 4 系列

优点：

- Google 官方已经发布 Gemma 4 E4B，并明确支持文本、图像和音频输入
- 官方文档明确给出 E4B 的本地内存参考值和能力边界
- 小尺寸模型更适合 Harbor 当前阶段做本地部署探索
- 官方文档与 Hugging Face 模型卡都强调了函数调用和 Agent 能力
- vLLM 官方已经给出 Gemma 4 的 OpenAI-compatible 部署路径

局限：

- 与更大参数模型相比，复杂推理和代码能力上限会更低
- 如果后续 Harbor 要承接更重的工程分析任务，可能还需要并行准备更大的模型

#### 方案二：Qwen3 系列

优点：

- 官方明确强调 agent / 工具调用能力
- 官方提供多尺寸 dense 与 MoE 模型
- 官方说明可用 vLLM、SGLang、Transformers、Ollama 等部署
- Apache 2.0 许可，商用友好
- 与 DeerFlow 的 OpenAI-compatible 路线兼容度高

局限：

- 相比 Gemma 4 E4B，这一轮并不是你当前准备先部署的主模型
- 当前仓库里先保留为后续备选更合适

#### 方案三：DeepSeek-R1 Distill 系列

优点：

- 推理和代码能力强
- 官方给出明确的本地 vLLM 启动示例
- 有 32B 等相对可部署尺寸

局限：

- 更偏 reasoning 路线
- 当前不一定比 Qwen3 更适合作为第一主选

### 4.3 当前主选型

当前建议主选：

- Gemma 4 E4B

具体部署目标优先建议：

- `google/gemma-4-E4B-it`

原因如下：

1. 更适合当前“先本地跑起来”的目标  
2. 官方文档明确给出了 E4B 的能力、上下文窗口和内存参考  
3. vLLM 已经支持 Gemma 4，并提供 OpenAI-compatible 服务方式  
4. 对 Harbor 当前桌面入口 + DeerFlow 组合来说，部署成本比大模型更友好  

这里选择 `-it` 版本，而不是基础版 `google/gemma-4-E4B`，是因为 Harbor 当前首先是聊天与 Agent 入口，更适合直接对接 instruction-tuned 版本。

根据 Google 官方 Gemma 4 文档，Gemma 4 E4B 具备：

- 128K 上下文窗口
- 文本、图像、音频输入能力
- 原生函数调用支持

根据同一份官方文档，Gemma 4 E4B 的大致推理显存需求参考为：

- BF16：约 15 GB
- FP8：约 7.5 GB
- Q4：约 5 GB

### 4.4 当前不优先选择的方案

当前不把 Qwen3 和 DeepSeek-R1 作为第一主选，不代表它们不好，而是：

- Qwen3 更适合作为下一步可替换模型或并行模型
- DeepSeek-R1 更像后续可并列接入的增强型推理模型
- 当前 Harbor 第一阶段更需要一个部署门槛更低、能够快速开始验证的主模型

## 5. 部署建议

当前推荐部署组合：

```text
Harbor 桌面客户端 -> DeerFlow -> vLLM -> google/gemma-4-E4B-it
```

理由：

- DeerFlow 已经支持 OpenAI-compatible 模型接入
- vLLM 原生提供 OpenAI-compatible server
- Gemma 4 官方文档与 vLLM 官方文档都已经给出 Gemma 4 的部署路径

## 6. DeerFlow 与模型层是否解耦

结论是：当前可以认为 **基本解耦**。

更准确地说，DeerFlow 并没有把具体模型硬编码在 Agent 运行时里，而是通过配置文件里的模型列表和 provider class path 来创建模型实例。

这意味着 Harbor 当前如果先部署：

- `google/gemma-4-E4B-it`

后面要切换到：

- Qwen3
- 远程 OpenAI-compatible 大模型
- 其他 DeerFlow 已支持或可通过网关接入的模型

主要改动点通常都在 DeerFlow 的 `config.yaml` 与推理服务地址，而不是 Harbor 桌面端本身。

换句话说，Harbor 客户端当前只关心：

- DeerFlow 在哪里
- DeerFlow 能返回什么

至于 DeerFlow 背后到底是本地 Gemma、Qwen3、还是远程模型，客户端不需要跟着重写一遍。

## 7. 仓库内如何管理模型相关代码

当前不建议把模型权重直接提交进 Git 仓库。

应区分两类东西：

### 7.1 可以进仓库的

- 模型官方代码仓库
- 模型部署脚本
- 配置模板
- 推理服务启动说明

### 7.2 不应该进仓库的

- 巨大的模型权重文件
- 本地下载的 Hugging Face 缓存
- vLLM 运行缓存

因此，当前做法是：

- 仓库内只保留模型部署脚本、配置模板和说明文档
- 模型权重与缓存由 Hugging Face + vLLM 在部署时拉取
- 不再把模型仓库作为 Git submodule 保留在 Harbor 仓库中

## 8. 当前仓库建议结构

模型相关代码建议放在：

```text
scripts/
```

例如：

```text
services/
  deer-flow/
scripts/
  start-vllm.sh
```

## 9. 参考来源

当前选型主要参考以下官方资料：

- Google AI for Developers 的 Gemma 4 文档：https://ai.google.dev/gemma/docs/core
- Gemma 4 E4B 官方 Hugging Face 模型卡：https://huggingface.co/google/gemma-4-E4B
- Gemma 4 E4B IT 官方 Hugging Face 仓库：https://huggingface.co/google/gemma-4-E4B-it
- vLLM 官方 Gemma 4 使用指南：https://docs.vllm.ai/projects/recipes/en/latest/Google/Gemma4.html
- vLLM 官方文档：https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html
- DeerFlow 仓库内后端说明：`services/deer-flow/backend/README.md`
- DeerFlow 模型工厂：`services/deer-flow/backend/packages/harness/deerflow/models/factory.py`

## 10. 一句话总结

Harbor 当前阶段最合理的技术路线是：客户端继续沿用 Electron + React；模型先选 `google/gemma-4-E4B-it`，并通过 vLLM 接入 DeerFlow；后续如果要切换到 Qwen3 或远程大模型，主要改 DeerFlow 的模型配置即可。
