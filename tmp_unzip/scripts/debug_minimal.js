"use strict";
console.log("Starting minimal debug...");
try {
    const { biometricControl } = require('../modules/attendance/biometric.service');
    console.log("Module loaded successfully.");
    console.log("BiometricControl instance:", !!biometricControl);
}
catch (e) {
    console.error("Failed to load module:", e);
}
