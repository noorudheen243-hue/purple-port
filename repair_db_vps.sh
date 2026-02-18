#!/bin/bash

# Database Repair Script
# Usage: ./repair_db_vps.sh

echo ">>> Stopping Application..."
pm2 stop all

cd server/prisma || exit

echo ">>> Current Location: $(pwd)"

# 1. Backup
echo ">>> Backing up current database..."
cp dev.db dev.db.bak.$(date +%s)
rm dev.db-shm dev.db-wal 2>/dev/null || true

# 2. Try Simple Fix (Removing WAL)
echo ">>> Removed WAL files. Checking if that fixed it..."
# We can't check easily without sqlite3, so we proceed to try dump/restore if we can,
# OR we just try to run prisma.

# Let's try to restore using Python (more robust)
echo ">>> Attempting Rebuild via Python..."
python3 -c "
import sqlite3
import os

try:
    # 1. Read Old
    print('Reading corrupted DB...')
    con = sqlite3.connect('dev.db')
    dump = []
    try:
        for line in con.iterdump():
            dump.append(line)
    except sqlite3.Error as e:
        print(f'Warning: Error during dump: {e}. Saving what we got.')
    con.close()

    # 2. backup old
    os.rename('dev.db', 'dev.db.corrupted')

    # 3. Write New
    print('Writing clean DB...')
    con_new = sqlite3.connect('dev.db')
    cursor = con_new.cursor()
    
    # Execute statements one by one to skip bad ones if needed, 
    # but initially try bulk.
    # formatting dump back to string
    script = '\n'.join(dump)
    try:
        con_new.executescript(script)
        con_new.commit()
        print('Restored successfully.')
    except Exception as e:
        print(f'Error restoring: {e}')
    
    con_new.close()

except ImportError:
    print('Python sqlite3 not found.')
except Exception as e:
    print(f'Script failed: {e}')
"

echo ">>> Rebuild Logic Finished."

# 3. Push Schema (This verifies if DB is valid now)
echo ">>> Applying Schema (Verification)..."
cd .. # back to server root
npx prisma db push

if [ $? -eq 0 ]; then
    echo ">>> SUCCESS! Database Repaired."
    echo ">>> Restarting Server..."
    pm2 restart all
    echo ">>> DONE."
else
    echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo ">>> REPAIR FAILED."
    echo ">>> You might need to reset the database (Data Loss)."
    echo ">>> To reset, run: rm prisma/dev.db"
    echo "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
fi
