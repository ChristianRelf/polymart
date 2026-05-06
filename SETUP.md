# Polymart — Homeserver Setup Guide

Polymart runs as two Docker containers managed by Portainer:
- **polymart-app** — Node.js server (API + frontend + simulation engine)
- **polymart-db** — MySQL 8.0 (simulation state, events log)

---

## Option A — Portainer (Recommended)

### Prerequisites

- Portainer already running on your homeserver
- Docker Engine installed

### Step 1 — Copy the project to your server

```bash
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  . user@your-server-ip:/home/user/polymart/
```

Or clone from your repo:

```bash
git clone <your-repo-url> /home/user/polymart
```

### Step 2 — Set your passwords

```bash
cd /home/user/polymart
cp .env.example .env
nano .env
```

Set these values:

```env
# Port Portainer/Nginx will forward to
APP_PORT=3000

# MySQL passwords (choose strong passwords)
DB_PASSWORD=your_strong_db_password
MYSQL_ROOT_PASSWORD=your_strong_root_password
```

### Step 3 — Deploy via Portainer Stacks

1. Open Portainer in your browser
2. Go to **Stacks → Add stack**
3. Name it `polymart`
4. Choose **Upload** and upload `docker-compose.yml`

   **Or** choose **Repository** and point to your git repo, setting the compose path to `docker-compose.yml`

   **Or** paste the contents of `docker-compose.yml` directly into the web editor

5. Under **Environment variables**, add:
   - `DB_PASSWORD` = your chosen password
   - `MYSQL_ROOT_PASSWORD` = your chosen root password
   - `APP_PORT` = `3000` (or whichever port you want)

6. Click **Deploy the stack**

Portainer will build the app image, pull MySQL 8, and start both containers. The app waits for MySQL to be healthy before starting.

### Step 4 — Verify

Check the **polymart-app** container logs in Portainer. You should see:

```
[polymart] Database connection established.
[polymart] API + frontend running on port 3000
[tick] Starting simulation loop every 10s
[tick] First-run initialisation complete, 60 warm-up ticks applied.
[tick] #61 session=open vix=18.0 fg=50 (45ms)
```

Then open `http://your-server-ip:3000` in a browser.

---

## Option B — Docker Compose (CLI)

If you prefer not to use Portainer:

```bash
cd /home/user/polymart

# Build and start
docker compose --env-file .env up -d --build

# View logs
docker compose logs -f app

# Stop
docker compose down
```

---

## Option C — Bare Metal (without Docker)

See the bottom of this document for manual installation without Docker.

---

## Nginx Reverse Proxy (Optional)

If you want to serve Polymart on port 80/443, add an Nginx proxy in front. You can do this as another Portainer stack, or configure your existing Nginx.

### Portainer — Nginx Proxy Manager (recommended)

If you're using [Nginx Proxy Manager](https://nginxproxymanager.com/) as a Portainer stack, add a proxy host:
- **Domain**: your domain or local hostname
- **Scheme**: `http`
- **Forward Hostname/IP**: `polymart-app` (Docker service name, if on same network) or your server IP
- **Forward Port**: `3000`

### Manual Nginx config

```nginx
server {
    listen 80;
    server_name polymart.local;  # or your domain

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Internal port the Node server listens on |
| `APP_PORT` | `3000` | Host port exposed by Docker |
| `DB_HOST` | `db` | MySQL host (use `db` inside Docker, `127.0.0.1` for bare metal) |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `polymart` | MySQL username |
| `DB_PASSWORD` | *(required)* | MySQL password |
| `DB_NAME` | `polymart` | MySQL database name |
| `MYSQL_ROOT_PASSWORD` | *(required)* | MySQL root password (Docker only) |

---

## Data Persistence

- **`polymart-db-data`** — Docker named volume. MySQL data is stored here and survives container restarts and rebuilds.
- **`events_log`** — Rows older than 7 days are purged automatically each day by MySQL's Event Scheduler.
- **`market_state`, `stocks_state`, `sector_state`** — Never purged. These hold the live simulation state.

---

## Updating the App

```bash
cd /home/user/polymart
git pull   # or rsync latest files

# Rebuild and restart (zero-downtime: db keeps running)
docker compose --env-file .env up -d --build app
```

In Portainer: go to your stack → **Editor** → **Update the stack** (Portainer re-builds and replaces the app container, MySQL stays up).

---

## Resetting the Simulation

To wipe all market data and restart fresh:

```bash
docker compose exec db mysql -u polymart -p"${DB_PASSWORD}" polymart -e "
  DELETE FROM events_log;
  DELETE FROM stocks_state;
  DELETE FROM sector_state;
  DELETE FROM market_state;
"
docker compose restart app
```

The app detects empty tables on next tick and re-initialises with 60 warm-up ticks automatically.

---

## Project Structure

```
polymart/
├── Dockerfile              # Multi-stage build (Node 20 Alpine)
├── docker-compose.yml      # App + MySQL services
├── .dockerignore
├── mysql-config/
│   └── polymart.cnf        # Enables MySQL Event Scheduler
├── server/
│   ├── server.js           # Entry point — Express + DB wait + tick loop
│   ├── api.js              # All /api/v1/* route handlers
│   ├── tick.js             # Simulation tick worker (every 10s)
│   ├── simulation.js       # Core simulation engine
│   ├── db.js               # MySQL connection pool
│   └── schema.sql          # Schema + 7-day purge event (auto-applied on first start)
├── src/                    # React frontend source
├── dist/                   # Built frontend (built inside Docker)
├── .env.example            # Environment variable template
└── package.json
```

---

## Bare Metal Installation (without Docker)

If you prefer not to use Docker:

### Install dependencies

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
sudo npm install -g pm2
```

### MySQL setup

```bash
sudo mysql_secure_installation
sudo mysql -u root -p -e "
  CREATE DATABASE polymart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER 'polymart'@'localhost' IDENTIFIED BY 'your_password';
  GRANT ALL PRIVILEGES ON polymart.* TO 'polymart'@'localhost';
  FLUSH PRIVILEGES;
  SET GLOBAL event_scheduler = ON;
"
mysql -u polymart -p polymart < server/schema.sql
```

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:
```ini
[mysqld]
event_scheduler=ON
```

### Configure .env

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=polymart
DB_PASSWORD=your_password
DB_NAME=polymart
```

### Build and run

```bash
npm install
npm run build
pm2 start server/server.js --name polymart
pm2 save && pm2 startup
```

### Nginx proxy

```nginx
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/polymart /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```
