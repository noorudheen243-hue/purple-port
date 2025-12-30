# Hostinger Deployment Guide (VPS Method)

This guide takes you from "No Account" to "Live App" on Hostinger.
Since your application uses **Node.js** and **PostgreSQL**, the best and most reliable option on Hostinger is a **VPS (Virtual Private Server)**.

---

## Phase 1: Purchase & Account Setup
1.  Go to [hostinger.com](https://www.hostinger.com/).
2.  Click on **VPS Hosting** in the menu.
3.  Choose a plan.
    *   **KVM 1**: Good for testing/small traffic. (Cheapest)
    *   **KVM 2**: Recommended for production (Better RAM for build processes).
4.  Click **Add to Cart** and complete the purchase.
5.  **Create your Account** during checkout.

## Phase 2: VPS Configuration
Once purchased, you will see the "Setup" wizard in your Hostinger Dashboard.
1.  **Location**: Choose a server location closest to your users (e.g., USA, India, Europe).
2.  **Operating System**: Select **Application** -> **Ubuntu 22.04 64bit**.
3.  **Password**: Create a strong "root" password. **WRITE THIS DOWN.**
4.  Finish setup and wait 5-10 minutes for the server to start.

## Phase 3: Connect to your Server
You need a terminal to talk to your new server.
*   **Windows**: Use **PowerShell** or **PuTTY**.
*   **Mac/Linux**: Use **Terminal**.

1.  Find your **SSH IP Address** in the Hostinger VPS Dashboard (e.g., `192.168.1.50`).
2.  Open your terminal on your computer.
3.  Run command:
    ```bash
    ssh root@YOUR_SERVER_IP
    ```
4.  Type `yes` if asked to verify fingerprint.
5.  Enter the **root password** you created in Phase 2. (You won't see typing, just hit Enter).
6.  You are now "inside" your remote server!

## Phase 4: Server Environment Setup
I have created a script to automate the heavy lifting. Run these commands inside your **VPS terminal**:

1.  **Download the Setup Script**:
    ```bash
    nano setup.sh
    ```
2.  **Paste the Content**:
    *   Open `f:\Antigravity\devops\hostinger_setup.sh` on your local computer.
    *   Copy *all* the text.
    *   Paste it into the VPS terminal window (Right-click usually pastes).
3.  **Save & Exit**:
    *   Press `Ctrl + X`, then `Y`, then `Enter`.
4.  **Run the Script**:
    ```bash
    bash setup.sh
    ```
    *Wait for it to finish installing Node, Database, etc.*

## Phase 5: Deploy Your Code
1.  **Clone your Code**:
    *   (Make sure you pushed your code to GitHub first - see `GITHUB_SETUP.md`).
    *   Run:
        ```bash
        git clone https://github.com/YOUR_USERNAME/purple-port.git
        cd purple-port
        ```

2.  **Install & Build Backend**:
    ```bash
    cd server
    npm install
    cp .env.example .env
    nano .env
    # EDIT DATABASE_URL to: postgresql://postgres:im_secure_changeme@localhost:5432/qix_ads_db
    # Save (Ctrl+X, Y, Enter)
    npx prisma db push  # Sets up database tables
    npm run build
    ```

3.  **Start Backend**:
    ```bash
    pm2 start dist/server.js --name "qix-api"
    cd ..
    ```

4.  **Install & Build Frontend**:
    ```bash
    cd client
    npm install
    nano .env
    # Add: VITE_API_URL=http://YOUR_SERVER_IP:10000
    # Save (Ctrl+X, Y, Enter)
    npm run build
    ```

## Phase 6: Expose to the Web (Nginx)
We need to tell the web server to show your Frontend and pass API requests to the Backend.

1.  **Edit Nginx Config**:
    ```bash
    nano /etc/nginx/sites-available/default
    ```
2.  **Delete everything and paste this**:
    ```nginx
    server {
        listen 80;
        server_name _;  # Or your domain.com

        # Frontend Files
        location / {
            root /root/purple-port/client/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # Backend API Proxy
        location /api {
            proxy_pass http://localhost:10000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
    *Note: Adjust paths if you cloned somewhere else than `/root/`.*
3.  **Restart Nginx**:
    ```bash
    sudo systemctl restart nginx
    ```

## Phase 7: You are Live!
Open your browser and visit: `http://YOUR_SERVER_IP`

You should see your application running!
