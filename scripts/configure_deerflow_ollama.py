from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


MODEL_BLOCK_LINES = [
    "  - name: gemma4-e2b",
    "    display_name: Gemma 4 E2B (Ollama)",
    "    use: langchain_openai:ChatOpenAI",
    "    model: gemma4:e2b",
    "    api_key: $OLLAMA_API_KEY",
    "    base_url: http://host.docker.internal:11434/v1",
    "    request_timeout: 600.0",
    "    max_retries: 5",
    "    max_tokens: 8192",
    "    supports_thinking: true",
    "    supports_reasoning_effort: true",
    "    supports_vision: true",
    "    when_thinking_enabled:",
    "      extra_body:",
    "        thinking:",
    "          type: enabled",
]

ENV_BLOCK_LINES = [
    "# Ollama",
    "OLLAMA_API_KEY=ollama",
]


def detect_newline(text: str) -> str:
    if "\r\n" in text:
        return "\r\n"
    if "\n" in text:
        return "\n"
    return "\r\n"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8", newline="")


def choose_config_path(deerflow_dir: Path) -> Path:
    config_yml = deerflow_dir / "config.yml"
    config_yaml = deerflow_dir / "config.yaml"

    if config_yml.exists():
        return config_yml
    if config_yaml.exists():
        return config_yaml

    return config_yml


def update_config(config_path: Path) -> bool:
    if not config_path.exists():
        raise FileNotFoundError(f"未找到配置文件：{config_path}")

    text = read_text(config_path)
    newline = detect_newline(text)

    lines = text.splitlines()

    if any(line.strip() == "- name: gemma4-e2b" for line in lines):
        print(f"[config] 已存在 gemma4-e2b：{config_path}")
        return False

    insert_at = None
    for index, line in enumerate(lines):
        if re.match(r"^models:\s*$", line):
            insert_at = index + 1
            break

    if insert_at is None:
        raise RuntimeError(f"在 {config_path} 中未找到 models: 段落")

    new_lines = lines[:insert_at] + MODEL_BLOCK_LINES + [""] + lines[insert_at:]
    output = newline.join(new_lines)
    if text.endswith(("\r\n", "\n")):
        output += newline

    write_text(config_path, output)
    print(f"[config] 已插入 gemma4-e2b：{config_path}")
    return True


def update_env(env_path: Path) -> bool:
    if not env_path.exists():
        raise FileNotFoundError(f"未找到环境变量文件：{env_path}")

    text = read_text(env_path)
    newline = detect_newline(text)

    lines = text.splitlines()

    if any(line.strip().startswith("OLLAMA_API_KEY=") for line in lines):
        print(f"[env] 已存在 OLLAMA_API_KEY：{env_path}")
        return False

    suffix = "" if text.endswith(("\r\n", "\n")) or text == "" else newline
    block = newline.join(ENV_BLOCK_LINES) + newline
    output = text + suffix + block

    write_text(env_path, output)
    print(f"[env] 已插入 OLLAMA_API_KEY：{env_path}")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="为 DeerFlow 注入 Ollama Gemma4 配置")
    parser.add_argument(
        "--deerflow-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "services" / "deer-flow",
        help="DeerFlow 目录路径，默认指向仓库内 services/deer-flow",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    deerflow_dir = args.deerflow_dir.resolve()

    if not deerflow_dir.exists():
        print(f"[ERROR] DeerFlow 目录不存在：{deerflow_dir}")
        return 1

    config_path = choose_config_path(deerflow_dir)
    env_path = deerflow_dir / ".env"

    try:
        config_changed = update_config(config_path)
        env_changed = update_env(env_path)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    if not config_changed and not env_changed:
        print("[done] 没有需要修改的内容。")
    else:
        print("[done] 配置处理完成。")

    return 0


if __name__ == "__main__":
    sys.exit(main())
