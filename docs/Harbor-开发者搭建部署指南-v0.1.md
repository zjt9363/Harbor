# Harbor 开发者搭建部署指南 v0.1（默认容器化）

## 1. 前置依赖

### 1.1 Windows 主机（必须）

- Git
  下载：
  https://gitforwindows.org/

- Node.js 22+（用于 Harbor 桌面端）
  下载：
  https://nodejs.org/en/download

- NVIDIA 显卡驱动（仅 GPU 推理需要）
  下载：
  https://www.nvidia.com/Download/index.aspx

- WSL2
  https://learn.microsoft.com/windows/wsl/install

- Ubuntu

  wsl --install -d Ubuntu

- Docker Desktop
  https://www.docker.com/products/docker-desktop/

### 1.2 WSL/Ubuntu

进入 Ubuntu 后执行：

```bash
sudo apt update
sudo apt install -y git make curl ca-certificates
```

验证 Docker 已注入到 Ubuntu：

```bash
docker version
docker info
```

> 默认容器化路线下，不要求你先在 Ubuntu 安装 `uv`、`pnpm`、`nginx`、`python`、`node`。

## 2. WSL 与 Docker Desktop 绑定（必须）

在 Docker Desktop 中执行：

1. 打开 `Settings -> Resources -> WSL Integration`
2. 打开 `Enable integration with my default WSL distro`
3. 把 `Ubuntu` 开关打开
4. 点击 `Apply & Restart`

如果 Ubuntu 里 `docker` 仍不可用：

```powershell
wsl --shutdown
```

然后重新打开 Ubuntu 再执行 `docker version`。

## 3. 拉代码与 submodule

### 3.1 Windows 侧（Harbor 客户端）

```powershell
$env:GIT_LFS_SKIP_SMUDGE="1"
git clone <your-repo-url> E:\Agent
cd E:\Agent
git submodule sync --recursive
git submodule update --init --recursive
git submodule status
```

### 3.2 WSL 侧（DeerFlow + vLLM）

```bash
export GIT_LFS_SKIP_SMUDGE=1
git clone <your-repo-url> ~/agent
cd ~/agent
git submodule sync --recursive
git submodule update --init --recursive
git submodule status
```

## 4. Harbor 客户端初始化（Windows）

```powershell
cd E:\Agent
npm install
```

开发启动：

```powershell
npm run dev:desktop
```

## 5. DeerFlow 容器化初始化（WSL）

```bash
cd ~/agent/services/deer-flow
make config
make docker-init
```

## 6. 启动 vLLM 容器（WSL）

```bash
docker run -d \
  --name harbor-vllm \
  --restart unless-stopped \
  --gpus all \
  --ipc=host \
  -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  -e HF_TOKEN=<你的_HuggingFace_Token> \
  vllm/vllm-openai:latest \
  --model google/gemma-4-E4B-it \
  --host 0.0.0.0 \
  --port 8000
```

验证：

```bash
curl http://127.0.0.1:8000/v1/models
```

## 7. 配置 DeerFlow 使用 vLLM（WSL）

编辑 `~/agent/services/deer-flow/config.yaml`，保证至少有一个模型配置：

```yaml
models:
  - name: gemma-4-e4b-it
    display_name: Gemma 4 E4B IT (vLLM)
    use: langchain_openai:ChatOpenAI
    model: google/gemma-4-E4B-it
    api_key: $VLLM_API_KEY
    base_url: http://host.docker.internal:8000/v1
    request_timeout: 600.0
    max_retries: 2
    max_tokens: 8192
    supports_vision: true
```

编辑 `~/agent/services/deer-flow/.env`：

```bash
VLLM_API_KEY=dummy
```

## 8. 启动 DeerFlow（WSL）

```bash
cd ~/agent/services/deer-flow
make docker-start
```

验证：

```bash
curl http://127.0.0.1:2026/health
```

## 9. Harbor 连接后端（Windows）

在 Harbor 配置中设置：

- `backendBaseUrl = http://127.0.0.1:2026`

这样链路就是：

`Harbor(Windows) -> DeerFlow(容器) -> vLLM(容器) -> Gemma 4 E4B-it`

## 10. 客户端打包（可选）

```powershell
cd E:\Agent
npm run package:desktop
```

产物目录：

- `E:\Agent\release\desktop`

## 11. 常见问题

### 11.1 Ubuntu 中没有 docker 命令

优先检查 Docker Desktop 的 WSL Integration 是否打开了 Ubuntu，然后：

```powershell
wsl --shutdown
```

再重进 Ubuntu 验证 `docker version`。

### 11.2 vLLM 容器启动但模型拉取失败

- 通常是 `HF_TOKEN` 未配置或网络访问受限
- 先 `docker logs harbor-vllm` 查看具体报错

### 11.3 Harbor 显示后端离线

按顺序检查：

1. `curl http://127.0.0.1:8000/v1/models`
2. `curl http://127.0.0.1:2026/health`
3. Harbor 的 `backendBaseUrl` 是否为 `http://127.0.0.1:2026`

## 12. 最小可运行清单

1. Windows 执行 `npm install`
2. WSL 执行 `make config && make docker-init`
3. WSL 启动 `harbor-vllm` 容器
4. WSL 执行 `make docker-start`
5. Windows 执行 `npm run dev:desktop`

完成后即可联通本地 MVP 链路。
