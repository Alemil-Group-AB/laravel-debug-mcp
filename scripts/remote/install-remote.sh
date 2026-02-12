#!/usr/bin/env bash
set -euo pipefail

# Simple helper to install the remote runner.
# Run this on the production server as root (or with sudo).

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 0755 "${SRC_DIR}/laravel-diag" /usr/local/bin/laravel-diag

if [[ ! -f /etc/laravel-diag.env ]]; then
  install -m 0640 "${SRC_DIR}/laravel-diag.env.example" /etc/laravel-diag.env
  echo "Created /etc/laravel-diag.env (edit it to match your app path)."
else
  echo "/etc/laravel-diag.env already exists; not overwriting."
fi

echo "Installed /usr/local/bin/laravel-diag"
