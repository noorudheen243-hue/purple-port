import sqlite3
import os

db_paths = [
    '/var/www/antigravity/prisma/dev.db',
    '/var/www/antigravity/server/dist/prisma/dev.db',
    '/var/www/antigravity/server/prisma/dev.db',
    '/var/www/purple-port/server/prisma/dev.db',
    '/var/www/purple-port/prisma/dev.db',
    '/var/www/qix-ads/server/prisma/dev.sqlite',
    '/var/www/qix-ads-v2.6/server/prisma/dev.sqlite'
]

for p in db_paths:
    if os.path.exists(p):
        print(f"Cleaning {p}...")
        try:
            conn = sqlite3.connect(p)
            conn.execute("DELETE FROM MarketingAccount WHERE platform='meta' AND externalAccountId='mock-meta-ad-account'")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error on {p}: {e}")
print("Cleanup complete.")
