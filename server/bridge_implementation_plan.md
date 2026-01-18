# Biometric Bridge Agent Implementation Plan

## Goal
Create a standalone Node.js agent ("Biometric Bridge") that runs on the user's local machine (Windows/Linux) in the office network. This agent will:
1.  Connect to the ZKTeco biometric device on the local LAN.
2.  Fetch attendance logs.
3.  Push (upload) new logs to the online VPS server via the `/api/attendance/biometric/upload-logs` endpoint.
4.  Run continuously (polling) to ensure "immediate sync".

## Components

### 1. Agent Script (`agent.js`)
*   **Dependencies**: `zkteco-js` (device comms), `axios` (server comms), `dotenv` (config), `node-cron` (scheduling).
*   **Logic**:
    *   Load config (Device IP, Server URL, API Key).
    *   Connect to Device.
    *   Fetch Logs.
    *   Filter logs (keep track of last sync time to avoid duplicate pushes, or let server handle dupes. Server logic seems efficiently idempotent).
    *   Push to Server.
    *   Handle errors (offline mode, retry).

### 2. Configuration (`.env`)
*   `DEVICE_IP`: Local IP of ZK device (e.g., 192.168.1.201).
*   `SERVER_URL`: `https://purple-port.com/api` (or VPS IP).
*   `API_KEY`: Security token for the bridge to authenticate with the server.

### 3. Server-Side Security
*   The `upload-logs` endpoint currently requires `authenticate` (JWT) OR `authorize` (Role).
*   I need to Modify `biometric_control.routes.ts` or `controller` to allow **API Key** authentication for this specific endpoint, as the Bridge Agent won't be logging in as a user interactively.
*   *Correction*: I checked `controller.ts` > `syncBiometricData` (line 150) and it has API Key check! 
    *   `if (apiKey && envKey && apiKey === envKey) authorized = true;`
    *   However, `biometric_control.routes.ts` protects `upload-logs` with `authenticate` middleware which enforces JWT.
    *   **Action**: I must update `biometric_control.routes.ts` to allow bypassing JWT if the API Key is present, OR create a specific public-facing (but secured by Key) route.

## Plan Steps

1.  **Server Update**:
    *   Modify `biometric_control.routes.ts` to relax JWT requirement for `upload-logs` if an API Key middleware is used, or creates a new dedicated route for the bridge.
    *   Best approach: Add a specific middleware `requireApiKeyOrAuth` for the upload route.

2.  **Create Bridge Agent Code**:
    *   `server/bridge-agent/package.json`
    *   `server/bridge-agent/agent.js`
    *   `server/bridge-agent/README.md` (Instructions)
    *   `server/bridge-agent/install.bat` (Windows Installer)

3.  **Deployment**:
    *   Commit changes.
    *   User pulls on VPS (Server update).
    *   User copies `bridge-agent` folder to Local PC and runs installer.

## Verification
*   **Server**: Test endpoint with curl/Postman using API Key.
*   **Agent**: Mock ZKTeco library (since I don't have a physical device) to simulate log fetch and verify push to server.
