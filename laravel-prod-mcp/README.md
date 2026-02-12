# laravel-prod-mcp

A **production-safe MCP server** (STDIO) that lets **Codex CLI** run *common, read-mostly* production diagnostics for a **Laravel** app **without giving shell access**.

**Architecture**
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
- `file_list` — lists files/directories under app root (optionally recursive)
- `file_read` — reads any file under app root by relative path
- `env_read` — reads Laravel `.env*` file from app root (best-effort redacted)

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
- `artisan_optimize_clear` — `php artisan optimize:clear`
- `artisan_config_cache` — `php artisan config:cache`
- `artisan_queue_restart` — `php artisan queue:restart`
- `artisan_queue_retry` — `php artisan queue:retry <ids|all>`
- `artisan_pulse_restart` — `php artisan pulse:restart` (if installed)

Both are **double-gated**:
1) Local: `LARAVEL_PROD_ENABLE_MUTATIONS=1`
2) Remote: `LARAVEL_DIAG_ENABLE_MUTATIONS=1`

---

## Requirements

**Local**
- Node.js >= 18
- Codex CLI installed
- SSH access to prod

**Remote (production host)**
- PHP CLI available (for the runner)
- Common utilities: `sh`, `tail`, `grep`, `df`, `ps`, `curl` (or at least curl for `health`)
- A dedicated locked-down user (recommended)

---

## Install (local)

```bash
git clone <your-repo-url> laravel-prod-mcp
cd laravel-prod-mcp

npm install
npm run build
```

Optional dev mode:

```bash
npm run dev
```

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

### 3) SSH hardening (strongly recommended)

Put your public key in `~codexdiag/.ssh/authorized_keys` and use **forced command**:

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

From the repo root:

```bash
codex mcp add laravelProd   --env LARAVEL_PROD_HOST=prod.example.com   --env LARAVEL_PROD_USER=codexdiag   --env LARAVEL_PROD_SSH_KEY=/home/alex/.ssh/codexdiag_ed25519   -- node /ABS/PATH/laravel-prod-mcp/dist/index.js
```

### Option B: Edit `~/.codex/config.toml`

Example snippet:

```toml
[mcp_servers.laravelProd]
command = "node"
args = ["/ABS/PATH/laravel-prod-mcp/dist/index.js"]
startup_timeout_sec = 15
tool_timeout_sec = 60

[mcp_servers.laravelProd.env]
LARAVEL_PROD_HOST = "prod.example.com"
LARAVEL_PROD_USER = "codexdiag"
LARAVEL_PROD_SSH_KEY = "/home/alex/.ssh/codexdiag_ed25519"

# Highly recommended: tool allowlist
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
  "file_list",
  "file_read",
  "env_read",
  "artisan_version",
  "artisan_about",
  "artisan_migrate_status",
  "artisan_schedule_list",
  "artisan_queue_failed",
  "artisan_horizon_status",
]
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

**Tool calls hang / no output**
- Ensure the MCP server doesn't print to stdout (this repo logs to stderr).
- Confirm SSH works non-interactively:
  ```bash
  ssh -i /path/to/key codexdiag@prod.example.com 'echo ok'
  ```
  If you use forced-command, just run `ssh codexdiag@prod.example.com` and it should wait for JSON; this is expected.

**`health` fails**
- Confirm `curl` exists on the server.
- Confirm the health URL is loopback and reachable from the server: `curl -i http://127.0.0.1/up`

**Artisan commands fail**
- Confirm PHP CLI is available and has permissions to read your app.
- Confirm `LARAVEL_DIAG_APP_DIR` points at the correct release/current symlink.

---

## Security checklist (do this)

- Use a **dedicated SSH user** (no shell access if possible)
- Use **forced-command** in `authorized_keys`
- Keep this toolset **read-only**; enable mutations only for break-glass situations
- Redact secrets; still treat outputs as sensitive
- File reads are restricted to files that resolve under app root (`LARAVEL_DIAG_APP_DIR`)

---

## License
MIT
