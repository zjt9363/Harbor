#!/usr/bin/env bash

set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-harbor-ollama}"
MODEL_NAME="${MODEL_NAME:-gemma4:e2b}"
HOST_PORT="${HOST_PORT:-11434}"
OLLAMA_HOME="${OLLAMA_HOME:-$HOME/.ollama}"
IMAGE_NAME="${IMAGE_NAME:-ollama/ollama}"

mkdir -p "${OLLAMA_HOME}"

if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
  if ! docker ps --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
    echo "Starting existing container ${CONTAINER_NAME}..."
    docker start "${CONTAINER_NAME}" >/dev/null
  fi
else
  echo "Creating container ${CONTAINER_NAME}..."
  docker run -d \
    --gpus all \
    -v "${OLLAMA_HOME}:/root/.ollama" \
    -p "${HOST_PORT}:11434" \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    "${IMAGE_NAME}" >/dev/null
fi

echo "Waiting for Ollama API..."
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${HOST_PORT}/api/tags" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Pulling model ${MODEL_NAME}..."
docker exec "${CONTAINER_NAME}" ollama pull "${MODEL_NAME}"

echo
echo "Ollama is ready."
echo "Model: ${MODEL_NAME}"
echo "API: http://127.0.0.1:${HOST_PORT}"
echo
echo "Follow logs with:"
echo "docker logs -f ${CONTAINER_NAME}"
