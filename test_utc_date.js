process.env.TZ = "UTC"; // Force UTC for testing

const normalizeBiometricTimestamp = (timestamp) => {
    if (timestamp instanceof Date) {
        const offset = timestamp.getTimezoneOffset(); // in minutes (0 on UTC server)
        console.log("Offset:", offset);
        if (offset !== -330) {
            // Adjust the time: subtract (offset + 330) minutes to align with IST
            return new Date(timestamp.getTime() - (offset + 330) * 60 * 1000);
        }
        return timestamp;
    }
};

// Simulate node-zklib parsing a punch at 09:22:52 local time (IST punch)
// The device sends hour 9, min 22, sec 52.
// node-zklib does: new Date(2026, 5, 19, 9, 22, 52)
const zklibDate = new Date(2026, 5, 19, 9, 22, 52);
console.log("zklib creates:", zklibDate.toISOString());

const normalized = normalizeBiometricTimestamp(zklibDate);
console.log("normalized creates:", normalized.toISOString());

// Then processBiometricLogs does:
const IST_OFFSET = 330 * 60 * 1000;
const punchTimeIST = new Date(normalized.getTime() + IST_OFFSET);
const istHours = punchTimeIST.getUTCHours();
console.log("punchTimeIST:", punchTimeIST.toISOString());
console.log("istHours:", istHours);
