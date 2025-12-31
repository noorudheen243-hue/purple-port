# 🚀 How to Deploy Client Enhancements to VPS

Follow these steps to update your online application with the new features.

## Phase 1: Local (Your Computer)
1.  **Open Terminal** in VS Code.
2.  Commit and Push your changes:
    ```powershell
    git add .
    git commit -m "feat: Enhanced Client Module with Content Strategy"
    git push origin main
    ```

## Phase 2: VPS (Online Server)
1.  **Connect to VPS:**
    ```bash
    ssh administrator@72.61.246.22
    ```

2.  **Update Backend:**
    ```bash
    cd Antigravity/server
    git pull origin main
    npm install
    npx prisma db push
    npx prisma generate
    npm run build
    pm2 restart qix-api
    ```

3.  **Update Frontend:**
    ```bash
    cd ../client
    npm install
    npm run build
    ```

## ✅ Verification
*   Visit `http://72.61.246.22/`
*   Check **Clients -> Add New** for the new "Strategy" tab.
*   Check Sidebar for **Content Status**.
