#!/bin/bash

# Hostinger VPS Setup Script for Purple Port
# Run this on your fresh Ubuntu VPS to install everything needed.

set -e # Exit on error

echo ">>> Starting Server Setup..."

# 1. Update System
echo ">>> Updating System..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 18.x
echo ">>> Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Nginx (Web Server)
echo ">>> Installing Nginx..."
sudo apt install -y nginx

# 4. Install PostgreSQL
echo ">>> Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# 5. Configure PostgreSQL
echo ">>> Configuring Database..."
# Change 'password' to a secure password!
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'im_secure_changeme';"
sudo -u postgres psql -c "CREATE DATABASE qix_ads_db;"

# 6. Install Global Tools (PM2 for keeping app alive)
echo ">>> Installing PM2 & Git..."
sudo npm install -g pm2
sudo apt install -y git

echo "----------------------------------------------------"
echo "SETUP COMPLETE!"
echo "----------------------------------------------------"
echo "Node Version: $(node -v)"
echo "NPM Version: $(npm -v)"
echo "PostgreSQL: Installed (User: postgres, DB: qix_ads_db)"
echo "Nginx: Installed"
echo "----------------------------------------------------"
echo "NEXT STEPS:"
echo "1. Clone your repository: git clone <YOUR_GITHUB_URL>"
echo "2. Configure .env files"
echo "3. Run 'npm install' and build"
echo "----------------------------------------------------"
