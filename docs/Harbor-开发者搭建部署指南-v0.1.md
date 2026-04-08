# Harbor 开发者搭建部署指南 v0.1（Windows + WSL2 + Docker Desktop）

这份指南按当前 Harbor 仓库的实际情况整理，目标是跑通下面这条本地链路：

`Harbor(Windows) -> DeerFlow(WSL 中的 Docker) -> Ollama(WSL 中的 Docker) -> Gemma 4 E2B`

本文默认你的代码目录是（记得把后文所有的地址更换为本地的实际地址）：

- Windows：`G:\Harbor`
- WSL：`/mnt/g/Harbor`

## 1. 前置依赖

### 1.1 Windows 主机

- Git
  下载：
  https://gitforwindows.org/

- Node.js 22+
  下载：
  https://nodejs.org/en/download

- NVIDIA 显卡驱动
  仅在你要用 GPU 跑 Ollama 时需要。
  下载：
  https://www.nvidia.com/Download/index.aspx

- WSL2
  文档：
  https://learn.microsoft.com/windows/wsl/install

- Ubuntu

  ```powershell
  wsl --install -d Ubuntu
  ```

- Docker Desktop
  下载：
  https://www.docker.com/products/docker-desktop/

### 1.2 WSL / Ubuntu

先进入 Ubuntu：

```powershell
wsl -d Ubuntu
```

在 Ubuntu 中安装基础工具：

```bash
sudo apt update
sudo apt install -y git make curl ca-certificates
```

说明：

- `make` 用于执行 DeerFlow 的 `make config`、`make docker-init`、`make docker-start`
- 当前容器化路线下，不要求你先在 Ubuntu 安装 `uv`、`pnpm`、`nginx`、`python`、`node`

## 2. 让 Docker Desktop 接入 Ubuntu

在 Docker Desktop 中：

1. 打开 `Settings -> Resources -> WSL Integration`
2. 打开 `Enable integration with my default WSL distro`
3. 把 `Ubuntu` 开关打开
4. 点击 `Apply & Restart`

回到 Ubuntu，验证 Docker 已注入：

```bash
docker version
docker info
```

如果这里报 `docker: command not found` 或连不上 Docker：

```powershell
wsl --shutdown
```

然后重新打开 Ubuntu 再试一次。

## 3. 检查 GPU 是否能被 Docker 看到

这一步很重要。你后面要跑的是 GPU 版 Ollama，所以这里先确认环境没问题。

在 Ubuntu 中执行：

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

如果能看到显卡信息，说明 Docker 的 GPU 透传已经正常。

如果这里失败，优先检查：

1. Windows 上是否已安装 NVIDIA 驱动
2. Docker Desktop 是否已启动
3. Docker Desktop 的 WSL Integration 是否已打开 Ubuntu

## 4. 拉 Harbor 代码

在 Windows PowerShell 中执行：

```powershell
git clone https://github.com/zjt9363/Harbor.git G:\Harbor
cd G:\Harbor
```

## 5. 初始化 submodule

在 Windows PowerShell 中执行：

```powershell
git submodule sync --recursive
git submodule update --init --recursive
git submodule status
```

理想状态应该类似：

```text
 d1baf7... services/deer-flow
```

`services/deer-flow` 前面是空格，表示它已初始化完成。

## 6. 初始化 Harbor 桌面端（Windows）

在 Windows PowerShell 中执行：

```powershell
cd G:\Harbor
npm install
```

如果只想先装桌面端依赖，这一步就够了。

## 7. 进入 DeerFlow 目录（WSL）

在 Ubuntu 中执行：

```bash
cd /mnt/g/Harbor/services/deer-flow
```

说明：

- 这里明确使用 `/mnt/g/Harbor`
- 不需要把代码额外再 clone 到 `~/agent`

## 8. 生成 DeerFlow 本地配置

在 Ubuntu 中执行：

```bash
make config
```

这一步会基于模板生成：

- `config.yaml`
- `.env`

如果你已经执行过一次，看到文件已经存在，就是正常的。

## 9. 启动 Ollama 并拉取 Gemma 4 E2B

相比 `vLLM + Gemma 4 E4B-it` 路线，当前更推荐在 `16 GB` 级别显卡上使用：

- `Ollama`
- `gemma4:e2b`

原因：

- 更适合单机本地开发
- 不需要单独准备 Hugging Face Token
- 对 `RTX 5070 Ti 16GB` 这类显卡更现实

### 9.1 使用项目脚本启动 Ollama

仓库里已经提供了一个启动脚本：

- `/mnt/g/Harbor/scripts/start-ollama.sh`

这个脚本会：

- 启动 `ollama/ollama` 容器
- 把模型缓存持久化保存到 WSL 本地目录
- 自动拉取默认模型 `gemma4:e2b`
- 如果容器已存在，则直接复用

在 Ubuntu 中执行：

```bash
bash /mnt/g/Harbor/scripts/start-ollama.sh
```

说明：

- 首次启动会下载 Ollama 镜像和模型，耗时正常
- 模型缓存默认保存在 WSL 的 `~/.ollama`
- 如果你后面想修改端口、模型名、容器名，也可以通过环境变量覆盖脚本默认值

查看日志：

```bash
docker logs -f harbor-ollama
```

验证接口：

```bash
curl http://127.0.0.1:11434/api/tags
```

如果能返回模型列表，说明 Ollama 已经准备好。

## 10. 配置 DeerFlow 使用本地 Ollama

编辑：

- `/mnt/g/Harbor/services/deer-flow/config.yaml`

保证至少有一个模型配置，例如：

```yaml
models:
  - name: gemma4-e2b
    display_name: Gemma 4 E2B (Ollama)
    use: langchain_openai:ChatOpenAI
    model: gemma4:e2b
    api_key: $OLLAMA_API_KEY
    base_url: http://host.docker.internal:11434/v1
    request_timeout: 600.0
    max_retries: 2
    max_tokens: 8192
```

再编辑：

- `/mnt/g/Harbor/services/deer-flow/.env`

加入：

```bash
OLLAMA_API_KEY=ollama
```

说明：

- Ollama 的 OpenAI 兼容接口通常也可以通过 `base_url + api_key` 方式接入
- 这里放占位值即可

## 11. 初始化并启动 DeerFlow（WSL）

在 Ubuntu 中执行：

```bash
cd /mnt/g/Harbor/services/deer-flow
make docker-init
make docker-start
```

查看日志：

```bash
make docker-logs
```

健康检查：

```bash
curl http://127.0.0.1:2026/health
```

如果返回正常结果，说明 DeerFlow 已经跑起来了。

## 12. 启动 Harbor 桌面端（Windows）

在 Windows PowerShell 中执行：

```powershell
cd G:\Harbor
npm run dev:desktop
```

如果 Electron 正常打开，在 Harbor 设置里把后端地址设为：

- `backendBaseUrl = http://127.0.0.1:2026`

这样整条链路就是：

`Harbor(Windows) -> DeerFlow(WSL Docker) -> Ollama(WSL Docker) -> Gemma 4 E2B`

## 13. 可选：打包 Harbor 客户端

在 Windows PowerShell 中执行：

```powershell
cd G:\Harbor
npm run package:desktop
```

产物目录：

- `G:\Harbor\release\desktop`

## 14. 常见问题

### 14.1 `make` 在 PowerShell 中不可用

`make` 要在 Ubuntu 中执行，不要在 Windows PowerShell 中执行。

错误示例：

```powershell
PS G:\Harbor\services\deer-flow> make config
```

正确做法：

```powershell
wsl -d Ubuntu
```

然后：

```bash
cd /mnt/g/Harbor/services/deer-flow
make config
```

### 14.2 还没安装 CUDA，能不能继续

可以继续，只要你走的是本文这条容器化路线。

你不需要单独安装宿主机版 CUDA Toolkit；真正关键的是：

- Windows 上有 NVIDIA 驱动
- Docker Desktop + WSL 能看到 GPU

### 14.3 还没安装 Ollama，能不能继续

可以继续。

本文路线里不需要你在宿主机单独安装 `Ollama`，因为它运行在这个容器里：

- `ollama/ollama`

### 14.4 为什么模型不再作为仓库 submodule 保留

当前项目已经不再保留模型 submodule。

更推荐的做法是：

- 代码只拉 `services/deer-flow`
- 模型交给 `harbor-ollama` 容器首次启动时自行下载
- Ollama 模型缓存保存在 WSL 本地目录，而不是放进 Git 仓库

### 14.5 `docker version` 在 Ubuntu 中不可用

优先检查 Docker Desktop 的 WSL Integration 是否已经打开 Ubuntu。

如果已经打开，执行：

```powershell
wsl --shutdown
```

然后重新进入 Ubuntu 再试。

### 14.6 `curl http://127.0.0.1:11434/api/tags` 失败

优先检查：

1. `docker ps` 中是否有 `harbor-ollama`
2. `docker logs harbor-ollama` 是否显示模型仍在下载
3. `docker exec harbor-ollama ollama list` 是否能看到 `gemma4:e2b`

### 14.7 Harbor 显示后端离线

按顺序检查：

1. `curl http://127.0.0.1:11434/api/tags`
2. `curl http://127.0.0.1:2026/health`
3. Harbor 的 `backendBaseUrl` 是否为 `http://127.0.0.1:2026`

## 15. 最小可运行清单

1. Windows 安装 Git、Node.js、NVIDIA 驱动、WSL2、Docker Desktop
2. Ubuntu 安装 `git make curl ca-certificates`
3. 打开 Docker Desktop 的 Ubuntu WSL Integration
4. 运行 `docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi`
5. `git clone` Harbor 仓库
6. 执行 `git submodule update --init --recursive`
7. Windows 执行 `npm install`
8. WSL 执行 `make config`
9. WSL 执行 `bash /mnt/g/Harbor/scripts/start-ollama.sh`
10. 修改 DeerFlow 的 `config.yaml` 和 `.env`
11. WSL 执行 `make docker-init`
12. WSL 执行 `make docker-start`
13. Windows 执行 `npm run dev:desktop`

完成后即可联通本地 MVP 链路。
