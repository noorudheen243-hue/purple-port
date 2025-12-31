
#!/bin/bash

echo "--- NETWORK DIAGNOSTIC TOOL ---"
echo "Date: $(date)"

# 1. Check if Node.js Backend is running
echo -n "1. Checking Backend (Port 4001)... "
HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}\n" http://localhost:4001/health)
if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ UP ($HTTP_CODE)"
else
    echo "❌ DOWN (Code: $HTTP_CODE)"
    echo "   PM2 Status:"
    pm2 list
fi

# 2. Check if Nginx is listening on Port 80
echo -n "2. Checking Nginx (Port 80/api)... "
HTTP_CODE_NGINX=$(curl -o /dev/null -s -w "%{http_code}\n" http://localhost/api/health)
if [ "$HTTP_CODE_NGINX" == "200" ]; then
    echo "✅ UP ($HTTP_CODE_NGINX)"
else
    echo "❌ DOWN (Code: $HTTP_CODE_NGINX)"
    echo "   Nginx Status:"
    systemctl status nginx | grep Active
fi

# 3. Check /api/auth/login endpoint availability
echo -n "3. Checking Login Route... "
LOGIN_CODE=$(curl -o /dev/null -s -X POST -H "Content-Type: application/json" -w "%{http_code}\n" http://localhost/api/auth/login)
if [ "$LOGIN_CODE" == "400" ] || [ "$LOGIN_CODE" == "401" ]; then
    echo "✅ REACHABLE (Got expected error $LOGIN_CODE)"
else
    echo "❌ UNREACHABLE (Code: $LOGIN_CODE)"
fi
