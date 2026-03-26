#!/bin/bash
set -e

cd /var/www/purple-port

echo "=== CLIENT USERS IN PRODUCTION DB ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
  where: { role: 'CLIENT' },
  select: { id: true, email: true, full_name: true, linked_client_id: true }
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  return prisma.\$disconnect();
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
"

echo "=== DONE ==="
