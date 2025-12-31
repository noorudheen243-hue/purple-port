# Hostinger VPS Deployment Guide (Clean Install)

This guide assumes you have a brand new or existing Hostinger VPS (Ubuntu/Debian recommended) and you want to host the Qix Ads application on it.

## Prerequisites
- **IP Address**: 72.61.246.22
- **Username**: `root`
- **Password**: (Your VPS Password)
- **Deployment Package**: `f:\Antigravity\deploy_package.zip` (On your local computer)

---

## 1. Connect to VPS
Open your terminal (or Command Prompt / PowerShell) on your computer and run:
```bash
ssh root@72.61.246.22
```
*Enter your password when prompted.*

---

## 2. Reset & Clean Server (⚠️ DANGER)
To remove **ALL** existing data and clean the deployment folder:
```bash
# 1. Stop any running processes
pm2 delete all || true

# 2. Delete the application folder
rm -rf /var/www/purple-port

# 3. Re-create the folder
mkdir -p /var/www/purple-port
```

---

## 3. Install Environment (If not already installed)
If this is a fresh server, you need Node.js. Run these commands:

```bash
# Update System
apt update

# Install Node.js (Version 18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
npm install -g pm2

# Install Unzip
apt install -y unzip
```

---

## 4. Upload Application
You need to transfer the `deploy_package.zip` from your computer to the VPS.

**On your LOCAL Computer (open a NEW terminal window):**
```bash
# Navigate to file location
cd f:\Antigravity

# Upload file (Replace PASSWORD if prompted, or use FileZilla)
scp deploy_package.zip root@72.61.246.22:/var/www/purple-port/
```
*Alternatively, use **FileZilla**: Connect to `72.61.246.22`, navigate to `/var/www/purple-port`, and drag-and-drop the zip file.*

---

## 5. Install & Setup
**Back on your VPS Terminal:**

```bash
cd /var/www/purple-port

# Unzip the package
unzip deploy_package.zip

# Install Dependencies
npm install --production

# Initialize Database (This creates a fresh empty DB)
npx prisma db push
```

---

## 6. Start Application
```bash
# Start the server using PM2 (Run in background)
pm2 start dist/server.js --name "qix-ads"

# Save the process list so it restarts on reboot
pm2 save
pm2 startup
```

---

## 7. Access Application
Your application is now running!
- **Frontend/Backend**: `http://72.61.246.22:4001` (API)
- **Frontend Access**: The current build serves the frontend statically through the backend port 4001 for simplicity in this configuration, OR usually port 5173 if running separate dev server.
- **Production Mode**: In this production build, the frontend is inside `public/` and served by the Express server on port **4001**.
- **URL**: Open **`http://72.61.246.22:4001`** in your browser.

*(Note: If you want port 80 (standard http), you would need to setup Nginx or change the PORT in .env to 80, but 4001 is safe for now).*
