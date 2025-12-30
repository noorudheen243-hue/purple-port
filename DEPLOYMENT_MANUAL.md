# 🚀 Deployment Guide: Qix Ads Manager
**Target Environment**: BigRock (cPanel) / Node.js
**Package**: `dist_production` folder

This guide explains how to deploy the prepared application when you (or your IT admin) have access to the hosting control panel.

---

## 1. Prepare the Server (One-Time Setup)
1.  **Login to cPanel**.
2.  **Setup Node.js App**:
    -   Look for **"Setup Node.js App"** in cPanel.
    -   Click **Create Application**.
    -   **Node.js Version**: Select 18.x or 20.x.
    -   **Application Mode**: Production.
    -   **Application Root**: `qix_app` (or any name you prefer).
    -   **Application URL**: `qixads.com` (Select your domain).
    -   **Startup File**: `dist/server.js`.
    -   Click **Create**.
3.  **Database**:
    -   This app uses **SQLite** (file-based database).
    -   Ensure the `prisma` folder in the deployment package is uploaded.
    -   *Note*: Ensure the application folder has **Write Permissions** so the database file can be updated.

---

## 2. Upload the Code
1.  **File Manager**:
    -   Go to the **Application Root** folder you created (e.g., `qix_app`).
    -   **Delete** any default placeholder files (like `app.js` or `index.html` created by cPanel).
2.  **Upload**:
    -   Upload the contents of the local **`dist_production`** folder to the server's `qix_app` folder.
    -   *Tip*: You can zip `dist_production`, upload the zip, and Extract it on the server.

Structure on Server should look like:
```
/qix_app
  ├── dist/          (Backend Code)
  ├── public/        (Frontend Code - React)
  ├── prisma/        (Database Schema)
  ├── package.json
  └── .env           (You need to create this)
```

---

## 3. Configuration & dependencies
1.  **Environment Variables**:
    -   Create a file named `.env` in the `qix_app` folder.
    -   Add the necessary keys:
        ```ini
        PORT=8080 (or letting cPanel handle it)
        DATABASE_URL="file:./dev.db"
        JWT_SECRET="YOUR_SECURE_SECRET"
        NODE_ENV="production"
        ```
2.  **Install Dependencies**:
    -   Go back to **"Setup Node.js App"** in cPanel.
    -   Scroll down to the "Run NPM Install" button.
    -   Click **Run NPM Install**. (This reads `package.json` and installs modules).

---

## 4. Finalize & Start
1.  **Initialize Database**:
    -   You may need to run the Prisma setup.
    -   If you have SSH access: Run `npx prisma db push`.
    -   If NO SSH: You can create the `dev.db` locally and upload it to the `prisma` folder.
2.  **Restart App**:
    -   In "Setup Node.js App", click **Restart Application**.

## 5. Verification
-   Visit `qixads.com`.
-   You should see the Login Screen.
-   Login and test data saving to ensure Write Permissions are correct.
