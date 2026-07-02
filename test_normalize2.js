const { AttendanceService } = require("./dist/modules/attendance/service.js");

// ZkLib returns a string with the server's local timezone injected!
const fakeZkLibOutput = "Wed Jul 01 2026 09:31:24 GMT+0000 (Coordinated Universal Time)";
console.log("Fake ZkLib Output:", fakeZkLibOutput);

const normalized = AttendanceService.normalizeBiometricTimestamp(fakeZkLibOutput);
console.log("Normalized (what goes to DB):", normalized.toISOString());
