# PostgreSQL Setup Guide for Windows

Since Docker is not installed, we will install PostgreSQL directly on your Windows machine.

## Step 1: Download
1.  Go to the official download page: [https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2.  Click the **Download** button for **Windows x86-64** (Interactive installer by EDB).
3.  Choose the latest version (e.g., 16.x or 15.x).

## Step 2: Install
1.  Run the downloaded `.exe` file.
2.  **Select Components**: Keep all defaults (PostgreSQL Server, pgAdmin 4, Command Line Tools).
3.  **Data Directory**: Keep default.
4.  **Password**: **IMPORTANT!** You will be asked to set a password for the database superuser (`postgres`).
    *   I recommend setting it to `postgres` (simple) for this development project.
    *   If you choose a different password, you MUST update the `server/.env` file later.
5.  **Port**: Keep default `5432`.
6.  **Locale**: Keep default.
7.  Finish the installation.

## Step 3: Verify & Create Database
1.  Open the Windows Start Menu and search for **pgAdmin 4**. Open it.
2.  (It might ask for a master password for pgAdmin itself, set one if asked).
3.  In the left sidebar, click **Servers** -> **PostgreSQL**.
4.  It will ask for the password you set in Step 2 (e.g., `postgres`).
5.  Right-click on **Databases** -> **Create** -> **Database...**
6.  Name the database: `qix_ads_db`.
7.  Click **Save**.

## Step 4: Update Project Configuration
Now we need to tell the Qix Ads server how to connect.

1.  Open the file `f:\Antigravity\server\.env`.
2.  Look for this line:
    ```env
    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/qix_ads_db?schema=public"
    ```
3.  **Breakdown of the URL**:
    *   `postgres`: The username (default).
    *   `:postgres`: The password. **Change this if you set a different password in Step 2.**
    *   `@localhost:5432`: The address and port.
    *   `/qix_ads_db`: The database name we created in pgAdmin.

## Step 5: Test Connection
Once installed and the `.env` is updated, open your terminal in `f:\Antigravity\server` and run:

```bash
npx prisma db push
```

If it says "🚀 Your database is now in sync with your Prisma schema", you are successful!
