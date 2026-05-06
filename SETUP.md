# Polymart — Homeserver Deployment Guide

## Architecture Overview

Polymart runs as two Docker containers:

| Container | Image | Role |
|---|---|---|
| `polymart-app` | Built from `Dockerfile` | Node.js 20 — Express API, React frontend (served as static files), simulation engine tick loop |
| `polymart-db` | `mysql:8.0` | MySQL — stores live market state, stock state, sector state, and events log |

The simulation engine runs entirely inside `polymart-app` on a 10-second `setInterval` loop. On each tick it reads the current state from MySQL, runs all calculations (RSI, MACD, Bollinger Bands, ATR, VWAP, etc.), and writes the updated state back. The React frontend polls the API every 10 seconds via relative `/api/v1/` paths, which are served by the same Node process.

The database holds **only current simulation state** — there is no time-series history stored long-term other than the rolling events log, which is automatically purged down to the last 7 days via a MySQL Event Scheduler job.

---

## Prerequisites

Before starting, your homeserver needs:

- **Docker Engine** 24+ installed ([install guide](https://docs.docker.com/engine/install/))
- **Portainer** running (optional but recommended — [install guide](https://docs.portainer.io/start/install-ce/server/docker/linux))
- At least **512 MB RAM** free for both containers
- Outbound internet access during first build (to pull `node:20-alpine` and `mysql:8.0`)

To check Docker is working:

```bash
docker --version
docker ps
```

---

## Option A — Portainer Stack (Recommended)

Portainer gives you a UI for managing the stack: view logs, restart containers, update environment variables, and rebuild the app image without touching the command line.

### Step 1 — Copy the project to your server

**Via rsync** (from your local machine):

```bash
rsync -avz \
  --exclude node_modules \
  --exclude dist \
  --exclude .git \
  --exclude .env \
  . user@your-server-ip:/home/user/polymart/
```

Replace `user@your-server-ip` with your actual server user and IP address. The `--exclude` flags skip large or sensitive directories that don't need to be transferred.

**Via Git** (if you have it in a repo):

```bash
ssh user@your-server-ip
git clone https://your-repo-url /home/user/polymart
cd /home/user/polymart
```

### Step 2 — Create your environment file

SSH into your server and create the `.env` file from the template:

```bash
cd /home/user/polymart
cp .env.example .env
nano .env
```

Fill in the following. Choose strong, unique passwords — these are used to secure the MySQL database:

```env
# Port the Node server listens on inside the container (leave as 3000)
PORT=3000

# Host port Docker exposes (change if 3000 is already in use on your server)
APP_PORT=3000

# MySQL connection — these must match what you set in MYSQL_* below
DB_HOST=db
DB_PORT=3306
DB_USER=polymart
DB_PASSWORD=choose_a_strong_password_here
DB_NAME=polymart

# MySQL root and app user passwords for Docker container setup
MYSQL_ROOT_PASSWORD=choose_a_different_strong_password_here
MYSQL_PASSWORD=same_as_DB_PASSWORD_above
```

> **Important**: `DB_HOST=db` is correct when running inside Docker. Docker Compose's internal DNS resolves the service name `db` to the MySQL container's IP automatically. Do not change this to `127.0.0.1` unless running bare metal.

> **Important**: `DB_PASSWORD` and `MYSQL_PASSWORD` must be the same value. `MYSQL_PASSWORD` is used by the MySQL Docker image to create the `polymart` user on first start. `DB_PASSWORD` is used by the Node app to connect.

### Step 3 — Deploy via Portainer Stacks

1. Open Portainer in your browser (typically `http://your-server-ip:9000`)
2. In the left sidebar, click **Stacks**
3. Click **Add stack** (top right)
4. Give the stack a name — for example: `polymart`
5. Choose how to provide the compose file. There are three options:

   **Option 1 — Upload file** (simplest):
   - Select **Upload**
   - Click **Select file** and choose `docker-compose.yml` from your local machine
   - Note: If your `.env` is already on the server, you can skip the env var section below and just upload

   **Option 2 — Web editor** (paste directly):
   - Select **Web editor**
   - Open `docker-compose.yml` in a text editor on your local machine, copy the entire contents, and paste into the editor

   **Option 3 — Git repository**:
   - Select **Repository**
   - Enter your repository URL
   - Set the compose path to `docker-compose.yml`
   - Portainer will pull and deploy from the repo directly

6. Scroll down to **Environment variables**. Click **Add an environment variable** for each of:

   | Name | Value |
   |---|---|
   | `DB_PASSWORD` | your chosen database password |
   | `MYSQL_ROOT_PASSWORD` | your chosen root password |
   | `MYSQL_PASSWORD` | same as `DB_PASSWORD` |
   | `APP_PORT` | `3000` (or your chosen host port) |

   These override the `.env` file values when deploying via Portainer's stack UI.

7. Click **Deploy the stack**

Portainer will:
- Pull `mysql:8.0` from Docker Hub
- Build the `polymart-app` image from your `Dockerfile` (this takes 1–3 minutes on first run as it installs npm packages and builds the React frontend)
- Start `polymart-db` first and wait for its health check to pass
- Start `polymart-app` once MySQL is healthy

### Step 4 — Verify the deployment

In Portainer, click into your `polymart` stack and then into the `polymart-app` container. Click **Logs**.

A healthy startup looks like this (in order):

```
[polymart] Waiting for database... (attempt 1/30)
[polymart] Waiting for database... (attempt 2/30)
[polymart] Database connection established.
[polymart] API + frontend running on port 3000
[tick] Starting simulation loop every 10s
[tick] First-run: no market_state found — initialising...
[tick] First-run initialisation complete, 60 warm-up ticks applied.
[tick] #61 session=open vix=18.2 fg=51 idx=1003.4 (48ms)
[tick] #62 session=open vix=18.1 fg=51 idx=1001.7 (41ms)
```

The `Waiting for database...` lines are expected — the app retries up to 30 times with a 2-second delay while MySQL finishes its first-run initialisation.

The `First-run initialisation complete` message means MySQL had no data, so the app seeded all 132 stocks, 20 sectors, and the market state, then ran 60 warm-up ticks to generate a realistic starting state.

Open `http://your-server-ip:3000` in a browser to confirm the frontend loads.

---

## Option B — Docker Compose CLI

If you prefer the command line over Portainer, SSH into your server and run:

```bash
cd /home/user/polymart

# First time: build images and start all services in the background
docker compose --env-file .env up -d --build

# Follow logs from the app container
docker compose logs -f app

# Follow logs from the database container
docker compose logs -f db

# Stop all containers (data is preserved in the named volume)
docker compose down

# Stop and delete all data (DESTRUCTIVE — wipes MySQL volume)
docker compose down -v
```

> **Note**: `docker compose down` without `-v` keeps the `polymart-db-data` volume intact. Your simulation state survives a restart. Use `-v` only if you want a full reset.

---

## Nginx Reverse Proxy

By default Polymart is reachable on `http://your-server-ip:3000`. To serve it on port 80 (HTTP) or 443 (HTTPS), put Nginx in front as a reverse proxy.

### Option 1 — Nginx Proxy Manager (easiest, Portainer-friendly)

[Nginx Proxy Manager](https://nginxproxymanager.com/) is a Docker-based UI for managing Nginx proxy rules, including automatic Let's Encrypt HTTPS certificates.

**Deploy Nginx Proxy Manager as a Portainer stack:**

Create a new stack in Portainer named `nginx-proxy-manager` with this compose content:

```yaml
version: "3.8"
services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # Admin UI
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt

volumes:
  npm-data:
  npm-letsencrypt:
```

Once deployed, open `http://your-server-ip:81` and log in (default: `admin@example.com` / `changeme` — change immediately).

**Add a proxy host for Polymart:**

1. Click **Proxy Hosts → Add Proxy Host**
2. Fill in the **Details** tab:
   - **Domain Names**: your domain name (e.g. `polymart.yourdomain.com`) or your server's local hostname
   - **Scheme**: `http`
   - **Forward Hostname / IP**: your server's IP address (or `polymart-app` if NPM is on the same Docker network)
   - **Forward Port**: `3000`
   - Enable **Block Common Exploits**
3. On the **SSL** tab (optional, requires a domain):
   - Select **Request a new SSL certificate**
   - Enable **Force SSL** and **HTTP/2 Support**
   - Enter your email address for Let's Encrypt
4. Click **Save**

### Option 2 — Manual Nginx on the host

Install Nginx if not already present:

```bash
sudo apt update && sudo apt install -y nginx
```

Create a site config:

```bash
sudo nano /etc/nginx/sites-available/polymart
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name polymart.local;  # replace with your domain or leave as _ for any hostname

    # Pass all requests to the Node container
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Required headers for correct proxying
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Increase timeouts for the 10s polling interval
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;

        # Disable request/response buffering for lower latency
        proxy_buffering    off;
    }
}
```

Enable the site and reload:

```bash
sudo ln -s /etc/nginx/sites-available/polymart /etc/nginx/sites-enabled/
sudo nginx -t      # test config — must print "syntax is ok" and "test is successful"
sudo systemctl reload nginx
```

### Adding HTTPS with Certbot (optional, requires a real domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d polymart.yourdomain.com
```

Certbot automatically edits your Nginx config to add SSL and sets up an auto-renewal cron job. After this, your app is served over HTTPS and HTTP is redirected automatically.

---

## Environment Variables Reference

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3000` | No | Port the Node.js server binds to inside the container |
| `APP_PORT` | `3000` | No | Host port Docker maps to the container's `PORT` |
| `DB_HOST` | `db` | Yes | MySQL hostname. Use `db` inside Docker, `127.0.0.1` for bare metal |
| `DB_PORT` | `3306` | No | MySQL port |
| `DB_USER` | `polymart` | Yes | MySQL user the app connects as |
| `DB_PASSWORD` | *(none)* | **Yes** | Password for `DB_USER` — must match `MYSQL_PASSWORD` |
| `DB_NAME` | `polymart` | No | MySQL database name |
| `MYSQL_ROOT_PASSWORD` | *(none)* | **Yes (Docker)** | MySQL root password. Only used by the Docker MySQL image on first start |
| `MYSQL_PASSWORD` | *(none)* | **Yes (Docker)** | Password the Docker MySQL image uses when creating `DB_USER`. Must equal `DB_PASSWORD` |

> **Why two password variables?** The MySQL Docker image uses `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` on first startup to set up the root account and create the application user respectively. The Node app uses `DB_PASSWORD` to authenticate. They must be the same value to avoid connection failures.

---

## How Data is Stored and Purged

### Persistent state tables

These three tables hold the live simulation state and are **never purged**:

- **`market_state`** — Single row (id=1). Stores the market index, Fear & Greed index, interest rate, inflation, GDP growth, VIX, session phase, tick counter, and more. Updated every tick.
- **`stocks_state`** — One row per stock ticker (132 rows). Stores price, volume, RSI, MACD, Bollinger Bands, ATR, Beta, EMA/SMA values, bid/ask spread, 52-week high/low, ATH, recent price history (JSON column), and recent candles (JSON column).
- **`sector_state`** — One row per sector (20 rows). Stores sector momentum, trend, and news stack.

### Rolling events log

- **`events_log`** — Market news events fired during the simulation. These are trimmed to a maximum of **40 rows in memory** on each tick write, and additionally purged by a **MySQL Event Scheduler job** that runs once daily and deletes any rows older than 7 days.

### MySQL Event Scheduler

The 7-day purge is handled by a MySQL scheduled event called `purge_old_events`, defined in `server/schema.sql`. For this to run, the MySQL Event Scheduler must be enabled — which is done by mounting `mysql-config/polymart.cnf` into `/etc/mysql/conf.d/` in the Docker container. This config file contains:

```ini
[mysqld]
event_scheduler=ON
```

To verify the Event Scheduler is active:

```bash
docker compose exec db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW VARIABLES LIKE 'event_scheduler';"
```

Expected output:

```
+-----------------+-------+
| Variable_name   | Value |
+-----------------+-------+
| event_scheduler | ON    |
+-----------------+-------+
```

To check the scheduled event exists:

```bash
docker compose exec db mysql -u root -p"${MYSQL_ROOT_PASSWORD}" polymart -e "SHOW EVENTS;"
```

### Docker volume

MySQL data is stored in a named Docker volume called `polymart-db-data`. This volume persists across:
- Container restarts
- `docker compose down` (without `-v`)
- App image rebuilds
- Portainer stack updates

The volume is only deleted if you explicitly run `docker compose down -v` or delete it via the Portainer **Volumes** UI.

---

## Updating the App

When you make changes to the frontend or server code:

### Via Portainer

1. Transfer your updated files to the server (rsync or git pull)
2. In Portainer, navigate to your `polymart` stack
3. Click **Editor**, then **Update the stack**
4. Portainer rebuilds only the `polymart-app` image and replaces that container — MySQL stays running throughout with no data loss

### Via CLI

```bash
cd /home/user/polymart

# Pull latest code (if using git)
git pull

# Or rsync from local machine:
# rsync -avz --exclude node_modules --exclude dist --exclude .git . user@server-ip:/home/user/polymart/

# Rebuild and restart the app container only (db stays up)
docker compose --env-file .env up -d --build app

# Confirm the new container started cleanly
docker compose logs --tail=30 app
```

---

## Resetting the Simulation

To wipe all market data and start the simulation fresh from scratch, clear all four tables and restart the app container. The app automatically detects empty tables and re-seeds everything with 60 warm-up ticks.

```bash
# Connect to MySQL and delete simulation data
docker compose exec db mysql -u polymart -p"${DB_PASSWORD}" polymart -e "
  DELETE FROM events_log;
  DELETE FROM stocks_state;
  DELETE FROM sector_state;
  DELETE FROM market_state;
"

# Restart the app so it detects the empty tables and re-initialises
docker compose restart app

# Watch the re-initialisation in the logs
docker compose logs -f app
```

You should see:

```
[tick] First-run: no market_state found — initialising...
[tick] First-run initialisation complete, 60 warm-up ticks applied.
```

> **Note**: This does not delete the Docker volume or the database itself — only the data rows. The schema, user, and MySQL Event Scheduler job remain intact.

---

## Troubleshooting

### App container exits immediately

Check logs:

```bash
docker compose logs app
```

**Common causes:**

- `Error: Could not connect to MySQL after multiple retries` — MySQL took too long to become healthy. Try restarting the db container and then the app: `docker compose restart db && sleep 20 && docker compose restart app`
- `Access denied for user 'polymart'` — `DB_PASSWORD` and `MYSQL_PASSWORD` do not match. Check your `.env` file and Portainer environment variables. If the MySQL container has already initialised with the wrong password, you need to delete the volume and re-deploy: `docker compose down -v && docker compose up -d --build`
- `ER_BAD_DB_ERROR: Unknown database 'polymart'` — The schema init script did not run. This can happen if the volume was created before the schema was mounted. Delete the volume: `docker compose down -v`, then redeploy.

### MySQL container won't start

```bash
docker compose logs db
```

- `[ERROR] --initialize specified but the data directory has files in it` — The volume has partial data from a failed first start. Run `docker compose down -v` to clear it.
- `mbind: Operation not permitted` — Harmless warning on some kernels. Can be ignored.

### Frontend loads but shows no data

1. Open browser developer tools (F12) → Network tab
2. Reload the page and look for requests to `/api/v1/market`, `/api/v1/stocks`, etc.
3. If they return 502/503, the app container is not running or the Nginx proxy is misconfigured
4. If they return 500, check app container logs for a database error

### Portainer "Build failed" error

- Check that all files were transferred correctly, especially `Dockerfile`, `package.json`, `package-lock.json`
- Portainer builds the image on the server — ensure the server has internet access to pull `node:20-alpine` from Docker Hub
- Try clicking **Update the stack** a second time if the first attempt timed out during the npm install step

### Checking the database directly

```bash
# Open a MySQL shell as the app user
docker compose exec db mysql -u polymart -p"${DB_PASSWORD}" polymart

# Inside the MySQL shell:
SELECT index_value, fear_greed, tick_count FROM market_state WHERE id = 1;
SELECT ticker, price, rsi FROM stocks_state LIMIT 10;
SELECT COUNT(*) FROM events_log;
SHOW EVENTS;
EXIT;
```

---

## Project Structure

```
polymart/
├── Dockerfile                  # Multi-stage build: Node 20 Alpine
│                               #   Stage 1: npm ci + npm run build (React frontend)
│                               #   Stage 2: npm ci --omit=dev + copy server/ + dist/
├── docker-compose.yml          # App + MySQL services with health checks
├── .dockerignore               # Excludes node_modules, dist, .env, .git from build context
├── .env.example                # Copy to .env and fill in passwords before deploying
├── mysql-config/
│   └── polymart.cnf            # [mysqld] event_scheduler=ON — mounted into MySQL container
├── server/
│   ├── server.js               # Entry point — DB retry loop, Express setup, tick loop start
│   ├── api.js                  # All /api/v1/* REST endpoints (12 routes)
│   ├── tick.js                 # 10s tick worker — reads state, calls simulation, writes back
│   ├── simulation.js           # Core engine — 132 stocks, 20 sectors, all indicator math
│   ├── db.js                   # MySQL2 connection pool (JSON auto-parse, BIT→boolean)
│   └── schema.sql              # Schema DDL + 7-day purge event (auto-applied on first MySQL start)
├── src/                        # React + TypeScript frontend source
│   ├── lib/SimulationContext.tsx  # API polling (every 10s), shared state
│   └── pages/                  # HomePage, MarketPage, ApiDocsPage, LegalPage
├── public/                     # Static assets (logo, favicon)
└── package.json                # Dependencies: express, mysql2, dotenv, react, recharts, etc.
```

### How a tick works

1. `setInterval` fires every 10 seconds in `tick.js`
2. `readState()` queries `market_state`, all `stocks_state` rows, and all `sector_state` rows from MySQL
3. `runTick()` in `simulation.js` runs the simulation for one step: applies macro trends, sector news events, individual stock price movements, recalculates all technical indicators, potentially fires a market event
4. `writeMysqlBatch()` upserts the updated state back to MySQL in chunks of 20 stocks to avoid oversized queries
5. If an event was fired, it is inserted into `events_log` and the log is trimmed to 40 rows
6. The React frontend polls `/api/v1/market`, `/api/v1/stocks`, `/api/v1/sectors`, and `/api/v1/events` every 10 seconds and re-renders with the new data

---

## Bare Metal Installation (without Docker)

Use this if you want to run Polymart directly on the host operating system without Docker. Tested on Ubuntu 22.04 / Debian 12.

### 1. Install system dependencies

```bash
# Update package list
sudo apt update

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL Server 8.0
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally (process manager — keeps Node running on reboot)
sudo npm install -g pm2
```

Verify versions:

```bash
node --version    # should print v20.x.x
mysql --version   # should print 8.0.x
nginx -v          # should print nginx/1.x.x
pm2 --version
```

### 2. Secure and configure MySQL

Run the MySQL security wizard:

```bash
sudo mysql_secure_installation
```

Answer the prompts:
- Validate password plugin: your preference (Y is fine)
- Root password: set a strong password
- Remove anonymous users: **Y**
- Disallow root login remotely: **Y**
- Remove test database: **Y**
- Reload privilege tables: **Y**

Create the Polymart database and user:

```bash
sudo mysql -u root -p -e "
  CREATE DATABASE polymart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'polymart'@'localhost' IDENTIFIED BY 'your_strong_password';
  GRANT ALL PRIVILEGES ON polymart.* TO 'polymart'@'localhost';
  FLUSH PRIVILEGES;
"
```

Enable the Event Scheduler permanently. Open the MySQL config file:

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Add this line under `[mysqld]`:

```ini
event_scheduler=ON
```

Apply the database schema (this creates all tables and the 7-day purge event):

```bash
cd /home/user/polymart
mysql -u polymart -p'your_strong_password' polymart < server/schema.sql
```

Restart MySQL to apply the config change:

```bash
sudo systemctl restart mysql
```

### 3. Configure environment variables

```bash
cd /home/user/polymart
cp .env.example .env
nano .env
```

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=polymart
DB_PASSWORD=your_strong_password
DB_NAME=polymart
```

> `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD` are only used by the Docker MySQL image — they are not needed for bare metal.

### 4. Install dependencies and build the frontend

```bash
cd /home/user/polymart
npm install
npm run build
```

The `npm run build` step compiles the React frontend into the `dist/` directory, which the Node server then serves as static files.

### 5. Start with PM2

```bash
# Start the server
pm2 start server/server.js --name polymart

# Check it started correctly
pm2 logs polymart --lines 50

# Save the PM2 process list so it auto-restarts on server reboot
pm2 save

# Configure PM2 to start on system boot (follow the printed instructions)
pm2 startup
```

PM2 will keep the Node process running and restart it automatically if it crashes or the server reboots.

### 6. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/polymart
```

```nginx
server {
    listen 80;
    server_name _;  # Replace _ with your domain name if you have one

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_buffering    off;
    }
}
```

Enable and reload:

```bash
# Remove default Nginx site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Enable Polymart site
sudo ln -s /etc/nginx/sites-available/polymart /etc/nginx/sites-enabled/

# Test config (must print "syntax is ok" and "test is successful")
sudo nginx -t

# Apply config
sudo systemctl reload nginx
```

Open `http://your-server-ip` in a browser to confirm everything works.

### 7. Add HTTPS with Certbot (optional, requires a domain name)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot modifies the Nginx config to add SSL, obtains a Let's Encrypt certificate, and sets up auto-renewal. After this, the app is served over HTTPS and HTTP requests are automatically redirected.

### Useful bare metal commands

```bash
# View live logs
pm2 logs polymart

# Restart the app (e.g. after updating files)
npm run build && pm2 restart polymart

# Check app status
pm2 status

# Open MySQL shell
mysql -u polymart -p'your_password' polymart

# Check current simulation state
mysql -u polymart -p'your_password' polymart -e "SELECT index_value, fear_greed, tick_count, vix FROM market_state WHERE id=1;"

# Check Event Scheduler is running
mysql -u root -p -e "SHOW VARIABLES LIKE 'event_scheduler';"
```
