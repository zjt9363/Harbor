#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEERFLOW_DIR="${DEERFLOW_DIR:-${REPO_ROOT}/services/deer-flow}"

if ! command -v make >/dev/null 2>&1; then
  echo "[ERROR] make was not found. Please install make in your WSL distro."
  exit 1
fi

if [ ! -d "${DEERFLOW_DIR}" ]; then
  echo "[ERROR] DeerFlow directory not found: ${DEERFLOW_DIR}"
  exit 1
fi

echo "Using DeerFlow directory: ${DEERFLOW_DIR}"
echo "Step 1/2: make docker-init"
make -C "${DEERFLOW_DIR}" docker-init

echo "Step 2/2: make docker-start"
make -C "${DEERFLOW_DIR}" docker-start

echo
echo "DeerFlow started."
echo "Health check: curl http://127.0.0.1:2026/health"
