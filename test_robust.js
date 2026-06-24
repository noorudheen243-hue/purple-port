process.env.TZ = "UTC"; // Simulate VPS

const normalizeBiometricTimestamp = (timestamp) => {
    let tsStr = '';
    if (timestamp instanceof Date) {
        // Get the local digits that the Date object was constructed with
        const pad = (n) => n.toString().padStart(2, '0');
        tsStr = `${timestamp.getFullYear()}-${pad(timestamp.getMonth()+1)}-${pad(timestamp.getDate())}T${pad(timestamp.getHours())}:${pad(timestamp.getMinutes())}:${pad(timestamp.getSeconds())}`;
    } else {
        tsStr = String(timestamp).trim();
        // If the string contains 'Z', it treated the device's local time as UTC. Strip 'Z'.
        if (tsStr.includes('Z')) {
            tsStr = tsStr.replace('Z', '');
        } else if (/GMT|UTC|\+00:?00/i.test(tsStr)) {
            // Strip UTC markers
            tsStr = tsStr.replace(/GMT|UTC|\+00:?00/ig, '').trim();
        } else if (/\+05:?30|India Standard Time/i.test(tsStr)) {
            // Already has IST marker, let's keep it but parse directly
            const d = new Date(tsStr);
            if (!isNaN(d.getTime())) return d;
        }
    }

    // Force it to be interpreted as IST by appending +05:30
    const formatted = tsStr.replace(' ', 'T');
    // Ensure there's no trailing timezone info before appending +05:30
    const cleanStr = formatted.replace(/(Z|[+-]\d{2}:\d{2})$/, '');
    
    const parsed = new Date(`${cleanStr}+05:30`);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return new Date(timestamp); // Last fallback
};

console.log("Device punched at 09:22:52 IST");
console.log("Expected UTC output: 2026-06-19T03:52:52.000Z");

const d1 = new Date(2026, 5, 19, 9, 22, 52); // zkteco-js on UTC server
console.log("Case 1 (Date from UTC server):", normalizeBiometricTimestamp(d1).toISOString());

const d2 = "2026-06-19T09:22:52.000Z"; // bridge running on UTC machine
console.log("Case 2 (String with Z):", normalizeBiometricTimestamp(d2).toISOString());

const d3 = "2026-06-19 09:22:52"; // clean string
console.log("Case 3 (Raw String):", normalizeBiometricTimestamp(d3).toISOString());
