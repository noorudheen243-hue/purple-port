#!/bin/bash
# DEPLOY CREDENTIALS REPORT
# Moves the report to the webroot

echo ">>> Publishing Credentials Report..."

# Pull latest file
git pull

# Copy to web server
cp credentials_report.html /var/www/purple-port/credentials_report.html

echo "---------------------------------------"
echo ">>> AVAILABLE: Access the report below:"
echo ">>> http://$(curl -s ifconfig.me)/credentials_report.html"
echo "---------------------------------------"
