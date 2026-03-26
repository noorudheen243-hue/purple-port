#!/bin/bash
echo "=== Meetings API Test ==="
LOGIN=$(curl -s -X POST http://localhost:4001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"noorudheen243@gmail.com","password":"password123"}')
echo "Login response: ${LOGIN:0:100}"
TOKEN=$(echo $LOGIN | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token','NO_TOKEN'))" 2>/dev/null)
echo "Token: ${TOKEN:0:30}..."
echo ""
echo "=== GET /api/meetings/my-meetings ==="
curl -s http://localhost:4001/api/meetings/my-meetings -H "Authorization: Bearer $TOKEN"
echo ""
echo "=== GET /api/meetings/reports ==="
curl -s http://localhost:4001/api/meetings/reports -H "Authorization: Bearer $TOKEN"
echo ""
echo "=== PM2 last error logs ==="
pm2 logs qix-ads-v2.7 --lines 20 --nostream --err 2>&1 | tail -20
