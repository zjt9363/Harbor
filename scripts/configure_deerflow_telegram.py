from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent

ENV_KEY_RE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=")

TELEGRAM_CHANNEL_BLOCK = [
    "channels:",
    "  telegram:",
    "    enabled: true",
    "    bot_token: $TELEGRAM_BOT_TOKEN",
    "    allowed_users: []",
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
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    text = read_text(config_path)
    newline = detect_newline(text)
    lines = text.splitlines()

    if any(line.strip() == "telegram:" for line in lines):
        print(f"[config] telegram already exists: {config_path}")
        return False

    if any(line.strip() == "channels:" for line in lines):
        insert_at = None
        for index, line in enumerate(lines):
            if line.strip() == "channels:":
                insert_at = index + 1
                break
        if insert_at is None:
            raise RuntimeError(f"Could not find channels section in {config_path}")
        block = TELEGRAM_CHANNEL_BLOCK[1:]
        new_lines = lines[:insert_at] + block + [""] + lines[insert_at:]
    else:
        suffix = "" if text.endswith(("\r\n", "\n")) or text == "" else newline
        block = newline.join(TELEGRAM_CHANNEL_BLOCK) + newline
        write_text(config_path, text + suffix + block)
        print(f"[config] Added channels.telegram: {config_path}")
        return True

    output = newline.join(new_lines)
    if text.endswith(("\r\n", "\n")):
        output += newline
    write_text(config_path, output)
    print(f"[config] Added channels.telegram: {config_path}")
    return True


def parse_env_key(line: str) -> str | None:
    match = ENV_KEY_RE.match(line)
    return match.group(1) if match else None


def update_env(env_path: Path, token: str) -> bool:
    if not env_path.exists():
        raise FileNotFoundError(f"Environment file not found: {env_path}")

    text = read_text(env_path)
    newline = detect_newline(text)
    existing_keys = {
        key
        for key in (parse_env_key(line) for line in text.splitlines())
        if key is not None
    }

    if "TELEGRAM_BOT_TOKEN" in existing_keys:
        print(f"[env] TELEGRAM_BOT_TOKEN already exists: {env_path}")
        return False

    suffix = "" if text.endswith(("\r\n", "\n")) or text == "" else newline
    block = newline.join(["# Telegram", f"TELEGRAM_BOT_TOKEN={token}"]) + newline
    write_text(env_path, text + suffix + block)
    print(f"[env] Inserted TELEGRAM_BOT_TOKEN: {env_path}")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Configure Telegram channel for DeerFlow.")
    parser.add_argument(
        "--deerflow-dir",
        type=Path,
        default=SCRIPT_DIR.parents[0] / "services" / "deer-flow",
        help="Path to the DeerFlow directory. Defaults to services/deer-flow inside this repository.",
    )
    parser.add_argument(
        "--token",
        required=True,
        help="Telegram bot token from @BotFather.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    deerflow_dir = args.deerflow_dir.resolve()

    if not deerflow_dir.exists():
        print(f"[ERROR] DeerFlow directory does not exist: {deerflow_dir}")
        return 1

    config_path = choose_config_path(deerflow_dir)
    env_path = deerflow_dir / ".env"

    try:
        config_changed = update_config(config_path)
        env_changed = update_env(env_path, args.token)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    if not config_changed and not env_changed:
        print("[done] No changes were needed.")
    else:
        print("[done] Telegram configuration update completed.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
