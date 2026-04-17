#!/bin/bash
sqlite3 /var/www/purple-port/server/prisma/dev.db "SELECT email, role FROM User LIMIT 10;"
