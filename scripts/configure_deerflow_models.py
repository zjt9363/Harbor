from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_MODELS_CONFIG = SCRIPT_DIR / "deerflow_model_presets.json"

ENV_KEY_RE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=")
MODEL_NAME_RE = re.compile(r"^\s*-\s*name:\s*['\"]?([^'\"]+)['\"]?\s*$")


@dataclass
class ModelPreset:
    preset_id: str
    label: str
    model_name: str
    config_lines: list[str]
    env_lines: list[str]


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


def normalize_lines(raw_lines: Any, field_name: str, preset_hint: str) -> list[str]:
    if not isinstance(raw_lines, list) or not raw_lines:
        raise ValueError(f"Invalid {field_name} for {preset_hint}: expected non-empty list")

    normalized: list[str] = []
    for line in raw_lines:
        if not isinstance(line, str):
            raise ValueError(f"Invalid {field_name} for {preset_hint}: each item must be a string")
        normalized.append(line.rstrip("\r\n"))
    return normalized


def extract_model_name(config_lines: list[str], preset_hint: str) -> str:
    for line in config_lines:
        match = MODEL_NAME_RE.match(line)
        if match:
            return match.group(1).strip()
    raise ValueError(f"Missing '- name: ...' in config_lines for {preset_hint}")


def load_presets(config_file: Path) -> list[ModelPreset]:
    if not config_file.exists():
        raise FileNotFoundError(f"Models config file not found: {config_file}")

    try:
        payload = json.loads(read_text(config_file))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {config_file}: {exc}") from exc

    raw_models = payload.get("models")
    if not isinstance(raw_models, list) or not raw_models:
        raise ValueError(f"No valid models found in {config_file}")

    presets: list[ModelPreset] = []
    for index, raw in enumerate(raw_models, start=1):
        preset_hint = f"models[{index}]"
        if not isinstance(raw, dict):
            raise ValueError(f"Invalid {preset_hint}: expected object")

        preset_id = str(raw.get("id") or f"model-{index}")
        label_raw = raw.get("label")
        label = str(label_raw).strip() if isinstance(label_raw, str) else ""
        if not label:
            raise ValueError(f"Invalid label for {preset_hint}")

        config_lines = normalize_lines(raw.get("config_lines"), "config_lines", preset_hint)
        env_raw = raw.get("env_lines", [])
        env_lines = normalize_lines(env_raw or [], "env_lines", preset_hint) if env_raw else []
        model_name = extract_model_name(config_lines, preset_hint)

        presets.append(
            ModelPreset(
                preset_id=preset_id,
                label=label,
                model_name=model_name,
                config_lines=config_lines,
                env_lines=env_lines,
            )
        )

    return presets


def print_model_menu(presets: list[ModelPreset]) -> None:
    print("Available model presets:")
    for index, preset in enumerate(presets, start=1):
        print(f"  {index}. {preset.label} [{preset.model_name}]")


def choose_preset(presets: list[ModelPreset], model_index: int | None) -> ModelPreset:
    if model_index is not None:
        if model_index < 1 or model_index > len(presets):
            raise ValueError(f"--model-index must be between 1 and {len(presets)}")
        return presets[model_index - 1]

    print_model_menu(presets)
    while True:
        try:
            raw_value = input("Select model by number: ").strip()
        except EOFError as exc:
            raise RuntimeError("No interactive input available. Use --model-index.") from exc

        if not raw_value:
            print("[input] Please enter a number.")
            continue
        if not raw_value.isdigit():
            print("[input] Invalid number. Please enter a valid model index.")
            continue

        candidate = int(raw_value)
        if 1 <= candidate <= len(presets):
            return presets[candidate - 1]
        print(f"[input] Index out of range. Please enter 1-{len(presets)}.")


def update_config(config_path: Path, preset: ModelPreset) -> bool:
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    text = read_text(config_path)
    newline = detect_newline(text)

    lines = text.splitlines()

    model_name_re = re.compile(
        r"^\s*-\s*name:\s*['\"]?" + re.escape(preset.model_name) + r"['\"]?\s*$"
    )
    if any(model_name_re.match(line) for line in lines):
        print(f"[config] {preset.model_name} already exists: {config_path}")
        return False

    insert_at = None
    for index, line in enumerate(lines):
        if re.match(r"^models:\s*$", line):
            insert_at = index + 1
            break

    if insert_at is None:
        raise RuntimeError(f"Could not find the models: section in {config_path}")

    new_lines = lines[:insert_at] + preset.config_lines + [""] + lines[insert_at:]
    output = newline.join(new_lines)
    if text.endswith(("\r\n", "\n")):
        output += newline

    write_text(config_path, output)
    print(f"[config] Inserted {preset.model_name}: {config_path}")
    return True


def parse_env_key(line: str) -> str | None:
    match = ENV_KEY_RE.match(line)
    return match.group(1) if match else None


def build_env_block(env_lines: list[str], existing_keys: set[str]) -> tuple[list[str], list[str]]:
    pending: list[str] = []
    result: list[str] = []
    inserted_keys: list[str] = []

    for line in env_lines:
        key = parse_env_key(line)
        if key is None:
            pending.append(line)
            continue

        if key in existing_keys:
            pending = []
            continue

        if pending:
            result.extend(pending)
            pending = []

        result.append(line)
        existing_keys.add(key)
        inserted_keys.append(key)

    while result and result[0].strip() == "":
        result.pop(0)
    while result and result[-1].strip() == "":
        result.pop()

    return result, inserted_keys


def update_env(env_path: Path, preset: ModelPreset) -> bool:
    if not preset.env_lines:
        print("[env] No env lines configured for selected model. Skipped.")
        return False

    if not env_path.exists():
        raise FileNotFoundError(f"Environment file not found: {env_path}")

    text = read_text(env_path)
    newline = detect_newline(text)

    existing_keys = {
        key
        for key in (parse_env_key(line) for line in text.splitlines())
        if key is not None
    }
    lines_to_add, inserted_keys = build_env_block(preset.env_lines, existing_keys)

    if not inserted_keys:
        print(f"[env] All configured env keys already exist: {env_path}")
        return False

    suffix = "" if text.endswith(("\r\n", "\n")) or text == "" else newline
    block = newline.join(lines_to_add) + newline
    output = text + suffix + block

    write_text(env_path, output)
    print(f"[env] Inserted keys ({', '.join(inserted_keys)}): {env_path}")
    return True


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Inject selected model configuration into DeerFlow files."
    )
    parser.add_argument(
        "--deerflow-dir",
        type=Path,
        default=SCRIPT_DIR.parents[0] / "services" / "deer-flow",
        help="Path to the DeerFlow directory. Defaults to services/deer-flow inside this repository.",
    )
    parser.add_argument(
        "--models-config",
        type=Path,
        default=DEFAULT_MODELS_CONFIG,
        help="Path to the model presets JSON file.",
    )
    parser.add_argument(
        "--model-index",
        type=int,
        default=None,
        help="Model index (1-based). If omitted, script will prompt interactively.",
    )
    parser.add_argument(
        "--list-models",
        action="store_true",
        help="Print available models from the presets file and exit.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    deerflow_dir = args.deerflow_dir.resolve()
    models_config_path = args.models_config.resolve()

    if not deerflow_dir.exists():
        print(f"[ERROR] DeerFlow directory does not exist: {deerflow_dir}")
        return 1

    try:
        presets = load_presets(models_config_path)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    if args.list_models:
        print_model_menu(presets)
        return 0

    try:
        preset = choose_preset(presets, args.model_index)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    print(f"[selected] {preset.label} [{preset.model_name}]")

    config_path = choose_config_path(deerflow_dir)
    env_path = deerflow_dir / ".env"

    try:
        config_changed = update_config(config_path, preset)
        env_changed = update_env(env_path, preset)
    except Exception as exc:
        print(f"[ERROR] {exc}")
        return 1

    if not config_changed and not env_changed:
        print("[done] No changes were needed.")
    else:
        print("[done] Configuration update completed.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
