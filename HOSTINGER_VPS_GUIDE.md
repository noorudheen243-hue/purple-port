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
unzip -o deploy_package.zip

# Install Dependencies
cd server
npm install --production
# Force Schema Update (Important for new Content Type field)
npx prisma db push
npx prisma generate
cd ..

# Build Frontend (if not already built locally)
# cd client && npm install && npm run build && cd ..

# --- CRITICAL STEP: CONNECT FRONTEND TO SERVER ---
# Copy the built client files to the server's public folder
mkdir -p server/public
cp -r client/dist/* server/public/
```

---

## 6. Start Application
```bash
# Restart the server to apply changes and release file locks
pm2 restart qix-api

# Save the process list so it restarts on reboot
pm2 save
```

---

## 7. Access Application
Your application is now running!
- **Frontend/Backend**: `http://72.61.246.22:4001` (API)
- **Frontend Access**: `http://72.61.246.22:4001` (served by Express)
- **Important**: hard refresh (Ctrl+F5) to see new Content Status features.
