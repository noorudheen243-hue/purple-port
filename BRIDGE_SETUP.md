# Biometric Bridge Setup Instructions

The **Biometric Bridge Agent** is a small program that must run on a computer in your office (the same network as the biometric device). It acts as a middleman, pulling data from the device and pushing it to the cloud server.

## Prerequisites
1.  **Node.js**: Ensure Node.js is installed on the local office computer.
2.  **Repo Access**: You need the `server` folder of the project on that computer.

## Setup Steps

1.  **Open Terminal** in the `server` directory.
2.  **Install Dependencies** (if not done):
    ```bash
    npm install
    ```
3.  **Run the Bridge**:
    ```bash
    npx ts-node src/scripts/biometric_bridge.ts
    ```

## Success Indicators
You should see output like this:
```
--- Biometric Bridge Agent (Auto-Sync Mode) ---
Target: 192.168.1.201 -> https://port.qixads.com/api
Sync Interval: Every 60 Seconds
-----------------------------------------------
[10:00:00 AM] 💤 Device Online. No new logs.
```

If you see `✅ Sync Success`, the data has been pushed to the server.

## Running in Background (Optional)
To keep it running even if you close the terminal, you can use `pm2` or simply keep the terminal installation minimized.
