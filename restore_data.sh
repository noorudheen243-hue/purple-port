#!/bin/bash
# DATA MIGRATION IMPORT SCRIPT
# Imports data_backup.json into the DB

echo ">>> STARTING DATA IMPORT..."

# Pull new data file
git pull

cd server || exit

# Run Import
npx ts-node src/scripts/import_data.ts

# Generate Credentials Report again (since users changed)
npx ts-node src/scripts/reset_admins.ts

echo ">>> VERIFICATION:"
npx ts-node src/scripts/list_users.ts

echo "---------------------------------------"
echo ">>> DATA RESTORED."
echo "---------------------------------------"
