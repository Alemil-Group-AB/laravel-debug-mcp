# laravel-prod-mcp

A **production-safe MCP server** (STDIO) that lets **Codex CLI** run *common, read-mostly* production diagnostics for a **Laravel** app **without granting shell access**.

## Architecture
- Codex CLI ⇄ (stdio) ⇄ this MCP server (runs locally)
- this MCP server ⇄ (SSH) ⇄ `laravel-diag` remote runner (runs on the production host)
- `laravel-diag` executes a strict allowlist of diagnostics and returns JSON

> Why this split? It avoids exposing an MCP server publicly, and it allows you to harden access using SSH + forced command + allowlists.

---

## What you get (tools)

### App / Laravel
- `health` — checks Laravel health endpoint (`/up` by default)
- `artisan_version` — `php artisan --version`
- `artisan_about` — `php artisan about`
- `artisan_migrate_status` — `php artisan migrate:status`
- `artisan_schedule_list` — `php artisan schedule:list`
- `artisan_queue_failed` — `php artisan queue:failed`
- `artisan_horizon_status` — `php artisan horizon:status` (if installed)

### Logs
- `logs_list` — lists log files in `storage/logs`
- `logs_tail` — tail last N lines (defaults to newest log file)
- `logs_grep` — fixed-string search in logs (with caps)
- `logs_last_error` — heuristic "show last error-looking lines"

### System
- `sys_info` — uname/date/uptime/whoami
- `sys_disk` — df -h
- `sys_memory` — free -m (or /proc fallback)
- `sys_top` — ps snapshots (CPU & memory)
- `php_version` — php -v
- `php_extensions` — php -m

### Laravel cache artifacts (safe)
- `cache_status` — lists `bootstrap/cache/*.php` files with mtime + size

### Break-glass mutations (disabled by default)
- `artisan_queue_restart` — `php artisan queue:restart`
- `artisan_pulse_restart` — `php artisan pulse:restart` (if installed)

Both are **double-gated**:
1) Local: `LARAVEL_PROD_ENABLE_MUTATIONS=1`
2) Remote: `LARAVEL_DIAG_ENABLE_MUTATIONS=1`

---

## Requirements

### Local
- Node.js >= 18
- Codex CLI installed
- SSH access to prod

### Remote (production host)
- PHP CLI available (for the runner)
- Common utilities: `sh`, `tail`, `grep`, `df`, `ps`, `curl` (or at least curl for `health`)
- A dedicated locked-down user (recommended)

---

## Install (local)

```bash
git clone <your-repo-url> laravel-prod-mcp
cd laravel-prod-mcp
npm install
```

### Build output
This repo can run in two modes:

**A) Dev/TS mode (recommended initially):**
```bash
npm run dev
# (runs: tsx src/index.ts)
```

**B) Built JS mode (recommended once stable):**
```bash
npm run build
ls -la dist/index.js
npm start
# (runs: node dist/index.js)
```

> If `dist/index.js` does not exist after `npm run build`, use TS mode (`npm run dev`) and point Codex to `tsx src/index.ts`.

---

## Install (remote / production)

### 1) Create a restricted user (recommended)

Example (Ubuntu/Debian):
```bash
sudo adduser --disabled-password --gecos "" codexdiag
```

### 2) Install the remote runner

Copy the runner to the server (or use your deployment mechanism):
```bash
# from your local machine
scp scripts/remote/laravel-diag root@prod.example.com:/tmp/laravel-diag
scp scripts/remote/laravel-diag.env.example root@prod.example.com:/tmp/laravel-diag.env.example
```

On the server:
```bash
sudo install -m 0755 /tmp/laravel-diag /usr/local/bin/laravel-diag
sudo install -m 0640 /tmp/laravel-diag.env.example /etc/laravel-diag.env
sudo nano /etc/laravel-diag.env   # set LARAVEL_DIAG_APP_DIR etc
```

(Alternatively run `scripts/remote/install-remote.sh` as root.)

### 3) Configure `/etc/laravel-diag.env` (REQUIRED)
At minimum you must set:

```env
LARAVEL_DIAG_APP_DIR=/absolute/path/to/your/app   # folder where artisan lives
```

Example:
```env
LARAVEL_DIAG_APP_DIR=/home/easytoday/domains/app.easytoday.se/app
LARAVEL_DIAG_LOG_DIR=/home/easytoday/domains/app.easytoday.se/app/storage/logs
LARAVEL_DIAG_ARTISAN=/home/easytoday/domains/app.easytoday.se/app/artisan
LARAVEL_DIAG_PHP_BIN=php
LARAVEL_DIAG_HEALTH_URL=http://127.0.0.1/up
LARAVEL_DIAG_TIMEOUT_SEC=25
LARAVEL_DIAG_MAX_OUTPUT_CHARS=200000
LARAVEL_DIAG_ENABLE_MUTATIONS=0
```

### 4) Permissions note (DirectAdmin/common hosting)
The SSH user must be able to **traverse** (`+x`) and (for artisan) **read** the app directory.

On some DirectAdmin setups, `/home/<user>/domains` is group-restricted (e.g. group `access`).
If you see `Permission denied` when checking the app path as `codexdiag`, add it to that group:

```bash
sudo usermod -aG access codexdiag
# then reconnect SSH so the new group is active
```

Verify:
```bash
ssh codexdiag@prod.example.com 'id'
ssh codexdiag@prod.example.com 'ls -la /path/to/app/artisan'
```

### 5) SSH hardening (strongly recommended)
Put your public key in `~codexdiag/.ssh/authorized_keys` and use **forced command**.

See `scripts/remote/authorized_keys.example`.

This makes OpenSSH always execute `/usr/local/bin/laravel-diag` (and ignore any client-supplied command).

---

## Configure the MCP server (local)

Create `.env` in the repo root (copy from `.env.example`):

```bash
cp .env.example .env
nano .env
```

Minimal:
```env
LARAVEL_PROD_HOST=prod.example.com
LARAVEL_PROD_USER=codexdiag
LARAVEL_PROD_SSH_KEY=/home/alex/.ssh/codexdiag_ed25519
```

---

## Connect Codex CLI to this MCP server

### Option A: Using `codex mcp add` (recommended)

**TS/dev mode (recommended initially):**
```bash
codex mcp add laravelProd   --env LARAVEL_PROD_HOST=prod.example.com   --env LARAVEL_PROD_USER=codexdiag   --env LARAVEL_PROD_SSH_KEY=/home/alex/.ssh/codexdiag_ed25519   -- npx tsx /ABS/PATH/laravel-prod-mcp/src/index.ts
```

**Built JS mode (once `dist/index.js` exists):**
```bash
codex mcp add laravelProd   --env LARAVEL_PROD_HOST=prod.example.com   --env LARAVEL_PROD_USER=codexdiag   --env LARAVEL_PROD_SSH_KEY=/home/alex/.ssh/codexdiag_ed25519   -- node /ABS/PATH/laravel-prod-mcp/dist/index.js
```

### Option B: Edit `~/.codex/config.toml`

> Important: `enabled_tools` must be under `[mcp_servers.laravelProd]` (NOT under `.env`).

**TS/dev mode:**
```toml
[mcp_servers.laravelProd]
command = "npx"
args = ["tsx", "/ABS/PATH/laravel-prod-mcp/src/index.ts"]
startup_timeout_sec = 20
tool_timeout_sec = 60

enabled_tools = [
  "health",
  "logs_list",
  "logs_tail",
  "logs_grep",
  "logs_last_error",
  "sys_info",
  "sys_disk",
  "sys_memory",
  "sys_top",
  "php_version",
  "php_extensions",
  "cache_status",
  "artisan_version",
  "artisan_about",
  "artisan_migrate_status",
  "artisan_schedule_list",
  "artisan_queue_failed",
  "artisan_horizon_status",
]

[mcp_servers.laravelProd.env]
LARAVEL_PROD_HOST = "prod.example.com"
LARAVEL_PROD_USER = "codexdiag"
LARAVEL_PROD_SSH_KEY = "/home/alex/.ssh/codexdiag_ed25519"
```

**Built JS mode:**
```toml
[mcp_servers.laravelProd]
command = "node"
args = ["/ABS/PATH/laravel-prod-mcp/dist/index.js"]
startup_timeout_sec = 20
tool_timeout_sec = 60

enabled_tools = [
  "health",
  "logs_list",
  "logs_tail",
  "logs_grep",
  "logs_last_error",
  "sys_info",
  "sys_disk",
  "sys_memory",
  "sys_top",
  "php_version",
  "php_extensions",
  "cache_status",
  "artisan_version",
  "artisan_about",
  "artisan_migrate_status",
  "artisan_schedule_list",
  "artisan_queue_failed",
  "artisan_horizon_status",
]

[mcp_servers.laravelProd.env]
LARAVEL_PROD_HOST = "prod.example.com"
LARAVEL_PROD_USER = "codexdiag"
LARAVEL_PROD_SSH_KEY = "/home/alex/.ssh/codexdiag_ed25519"
```

---

## Operational notes

### Where is `/up` coming from?
Laravel provides a built-in health endpoint at `/up` in modern skeletons.

### Keep APP_DEBUG off in prod
The toolset assumes you are debugging via logs/diagnostics, not by enabling APP_DEBUG.

### Output size, timeouts
Both the MCP server and remote runner enforce timeouts and output caps.

---

## Troubleshooting

### MCP handshake fails
- Ensure the MCP server does **not** print to stdout (only JSON-RPC). Use stderr for logs.
- Verify the entrypoint path exists:
  - TS mode: `src/index.ts`
  - Built mode: `dist/index.js` after `npm run build`

### SSH connectivity
Confirm SSH works non-interactively:
```bash
ssh -i /path/to/key codexdiag@prod.example.com 'echo ok'
```

If you use forced-command, running `ssh codexdiag@prod.example.com` will wait for JSON input; this is expected.

### `Invalid app dir` / permission denied
- Verify `codexdiag` can traverse the full path to your app:
  ```bash
  ssh codexdiag@prod.example.com 'namei -l /path/to/app'
  ```
- On DirectAdmin, you may need:
  ```bash
  sudo usermod -aG access codexdiag
  ```

### `health` fails
- Confirm `curl` exists on the server.
- Confirm the health URL is loopback and reachable from the server:
  ```bash
  curl -i http://127.0.0.1/up
  ```

### Artisan commands fail
- Confirm PHP CLI is available.
- Confirm the SSH user has permission to read the app and run `php artisan ...`.
- Confirm `LARAVEL_DIAG_APP_DIR` points at the correct release/current symlink.

---

## Security checklist
- Use a **dedicated SSH user**
- Use **forced-command** in `authorized_keys`
- Keep this toolset **read-only**; enable mutations only for break-glass situations
- Redact secrets; still treat outputs as sensitive
- Do not allow reading `.env` or arbitrary files

---

## License
MIT