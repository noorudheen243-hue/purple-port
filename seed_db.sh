#!/bin/bash
# SEED DATABASE SCRIPT
# Populates the database with initial Admin users

echo ">>> Seeding Database..."

cd ~/purple-port/server || exit

# Run the seed command using npx to ensure we use the local installed binary
npx prisma db seed

echo "---------------------------------------"
echo ">>> SUCCESS! Database populated."
echo "---------------------------------------"
