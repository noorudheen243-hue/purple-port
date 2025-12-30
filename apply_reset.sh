#!/bin/bash
# RESET PASSWORD SCRIPT
# Sets ALL users password to 'password123'

echo ">>> Applying Global Password Reset..."

# Pull latest script
git pull

cd server || exit

# Run Reset
npx ts-node src/scripts/reset_all_passwords.ts

echo "---------------------------------------"
echo ">>> DONE. You can now log in with 'password123'"
echo "---------------------------------------"
