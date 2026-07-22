#!/bin/zsh

set -eu

SCRIPT_DIR="${0:A:h}"
cd "$SCRIPT_DIR"

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run dev -- --host 127.0.0.1 --port 4173
