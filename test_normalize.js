const { AttendanceService } = require("./dist/modules/attendance/service.js");

// Simulate ZkLib parsing 'Wed Jul 01 2026 09:31:24' on the VPS (UTC timezone)
// In UTC timezone, new Date(2026, 6, 1, 9, 31, 24) creates a Date object that internally represents 09:31 UTC.
const d = new Date(2026, 6, 1, 9, 31, 24);
console.log("ZkLib generated Date object:", d.toISOString());

const normalized = AttendanceService.normalizeBiometricTimestamp(d);
console.log("Normalized (what goes to DB):", normalized.toISOString());
