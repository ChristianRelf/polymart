# Polymart — Homeserver Setup Guide

This guide covers deploying Polymart on a Linux homeserver using MySQL, Node.js, PM2, and Nginx.

---

## Requirements

- Ubuntu 22.04 / Debian 12 (or similar)
- Node.js 20+
- MySQL 8.0+
- Nginx
- PM2 (process manager)

---

## 1. Install Dependencies

```bash
# Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# MySQL 8
sudo apt install -y mysql-server

# Nginx
sudo apt install -y nginx

# PM2 (global process manager)
sudo npm install -g pm2
```

---

## 2. Set Up MySQL

### Secure the installation

```bash
sudo mysql_secure_installation
```

### Create the database and user

```bash
sudo mysql -u root -p
```

Inside the MySQL shell:

```sql
CREATE DATABASE polymart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'polymart'@'localhost' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON polymart.* TO 'polymart'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Enable the MySQL Event Scheduler (required for 7-day data purge)

```bash
sudo mysql -u root -p -e "SET GLOBAL event_scheduler = ON;"
```

To make it persist across restarts, add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
event_scheduler=ON
```

Then restart MySQL:

```bash
sudo systemctl restart mysql
```

### Apply the schema

```bash
mysql -u polymart -p polymart < server/schema.sql
```

---

## 3. Clone / Transfer the Project

If deploying from a different machine, copy the project files to your server:

```bash
# On your local machine
rsync -avz --exclude node_modules --exclude dist . user@your-server-ip:/home/user/polymart/
```

Or clone from your git repository:

```bash
git clone <your-repo-url> /home/user/polymart
cd /home/user/polymart
```

---

## 4. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Fill in your MySQL credentials:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=polymart
DB_PASSWORD=your_strong_password_here
DB_NAME=polymart
```

---

## 5. Install Node Packages and Build the Frontend

```bash
cd /home/user/polymart
npm install
npm run build
```

The frontend will be compiled to `dist/`. The Node server serves it automatically.

---

## 6. Start the Server with PM2

```bash
# Start the server
pm2 start server/server.js --name polymart --interpreter node

# Save PM2 process list so it survives reboots
pm2 save

# Configure PM2 to start on boot
pm2 startup
# Follow the printed command (it will look like: sudo env PATH=... pm2 startup ...)
```

### Useful PM2 commands

```bash
pm2 status          # Check status
pm2 logs polymart   # View live logs
pm2 restart polymart
pm2 stop polymart
```

---

## 7. Configure Nginx

Nginx acts as a reverse proxy, forwarding HTTP/HTTPS traffic to the Node server on port 3000.

### Basic HTTP config

Create `/etc/nginx/sites-available/polymart`:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server's LAN IP, e.g. 192.168.1.100

    # Increase timeouts for SSE / long-poll
    proxy_read_timeout 60s;
    proxy_send_timeout 60s;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and reload Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/polymart /etc/nginx/sites-enabled/
sudo nginx -t          # Test config
sudo systemctl reload nginx
```

### HTTPS with Let's Encrypt (optional, requires a public domain)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

Certbot will automatically edit your Nginx config to add SSL.

### Local network only (no domain)

If you only need LAN access, just set `server_name` to your server's local IP:

```nginx
server_name 192.168.1.100;
```

Access at `http://192.168.1.100` from any device on your network.

---

## 8. Database Maintenance

### 7-day data purge

Events older than 7 days are automatically deleted daily by the MySQL Event Scheduler defined in `server/schema.sql`. No manual action needed.

The simulation state tables (`market_state`, `stocks_state`, `sector_state`) are **never purged** — they hold the ongoing simulation state. Only `events_log` rows are cleared.

### Manual reset (wipe and restart simulation)

If you ever need a clean start:

```bash
mysql -u polymart -p polymart -e "
  DELETE FROM events_log;
  DELETE FROM stocks_state;
  DELETE FROM sector_state;
  DELETE FROM market_state;
"
pm2 restart polymart
```

The server will detect empty tables on next tick and re-initialise with 60 warm-up ticks automatically.

### Backups

```bash
# Dump the database (excluding large JSON history columns for speed)
mysqldump -u polymart -p polymart market_state sector_state events_log > backup_$(date +%F).sql

# Full backup including stock history/candles
mysqldump -u polymart -p polymart > backup_full_$(date +%F).sql
```

---

## 9. Firewall

Open only the ports you need:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp   # if using HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

Do **not** expose port 3000 externally — let Nginx handle all inbound traffic.

---

## 10. Updating the App

```bash
cd /home/user/polymart
git pull                 # or rsync from dev machine
npm install              # in case dependencies changed
npm run build            # rebuild frontend
pm2 restart polymart
```

---

## Project Structure Reference

```
polymart/
├── dist/               # Built frontend (generated by npm run build)
├── server/
│   ├── server.js       # Main entry point — Express + tick loop
│   ├── api.js          # All /api/v1/* route handlers
│   ├── tick.js         # Simulation tick worker (runs every 10s)
│   ├── simulation.js   # Core simulation engine (price logic, indicators)
│   ├── db.js           # MySQL connection pool
│   └── schema.sql      # MySQL schema + purge event
├── src/                # React frontend source
├── .env                # Environment config (not committed)
├── .env.example        # Template for .env
└── package.json
```

---

## Troubleshooting

**Server won't start — "Access denied for user 'polymart'"**
Check your `.env` DB_PASSWORD matches what you set in MySQL.

**Tables don't exist on first start**
Run `mysql -u polymart -p polymart < server/schema.sql` before starting the server.

**Nginx 502 Bad Gateway**
The Node server isn't running. Check `pm2 status` and `pm2 logs polymart`.

**Simulation shows stale data**
Check `pm2 logs polymart` for tick errors. Usually a DB connection issue.

**Event Scheduler not running**
```bash
sudo mysql -u root -p -e "SHOW VARIABLES LIKE 'event_scheduler';"
# Should show ON. If OFF:
sudo mysql -u root -p -e "SET GLOBAL event_scheduler = ON;"
```
