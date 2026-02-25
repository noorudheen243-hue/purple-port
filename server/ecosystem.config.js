module.exports = {
    apps: [
        {
            name: "QixBiometricBridge",
            script: "./node_modules/ts-node/dist/bin.js",
            args: "src/scripts/biometric_bridge.ts",
            cwd: "f:\\Antigravity\\server",
            watch: false,
            autorestart: true
        }
    ]
};
