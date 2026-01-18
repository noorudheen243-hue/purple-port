# Biometric Bridge Agent

This is a standalone tool that connects your Local Biometric Device (ZKTeco) to the Online Cloud Server.

## Prerequisites
- Windows PC on the same network as the Biometric Device.
- Node.js installed (v16+).

## Installation
1.  Copy this entire folder (`bridge-agent`) to the Windows PC.
2.  Run `install.bat` (Double click it).
3.  Rename `.env.example` to `.env`.
4.  Open `.env` in Notepad and set:
    -   `DEVICE_IP`: The local IP of your attendance machine (e.g. 192.168.1.201).
    -   `SERVER_URL`: `http://72.61.246.22/api/attendance/biometric/bridge/upload` (VPS IP).
    -   `API_KEY`: Must match the key on the server.

## Running
Double click `npm start` or run `node agent.js` in the terminal.
Keep this window open, or use Task Scheduler to run it in the background.
