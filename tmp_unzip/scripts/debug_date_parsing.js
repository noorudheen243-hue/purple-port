"use strict";
// Simulate UTC Environment
process.env.TZ = 'UTC';
function testParsing() {
    console.log("Testing Date Parsing in UTC...");
    // Scenario: Bridge sends "2026-02-19 18:00:00" (IST Time, but raw string)
    const rawString = "2026-02-19 18:00:00";
    // 1. naive parsing
    const d1 = new Date(rawString);
    console.log(`Raw: "${rawString}" -> Parsed (UTC): ${d1.toISOString()}`);
    // 2. ISO like string
    const isoString = "2026-02-19T18:00:00";
    const d2 = new Date(isoString);
    console.log(`ISO: "${isoString}" -> Parsed (UTC): ${d2.toISOString()}`);
    // Analysis
    // If parsed as UTC, it is 18:00 UTC = 23:30 IST.
    // Real time was 18:00 IST = 12:30 UTC.
    // Difference = 5hr 30min.
    // Impact on Date Key
    // Timestamp = 18:00 UTC.
    // IST Offset (+5:30) -> 23:30 UTC? No.
    // Our Logic: istDate = timestamp + 5:30.
    // 18:00 + 5:30 = 23:30.
    // setUTCHours(0) -> 00:00 (Feb 19).
    // dateKeyIST = 00:00 - 5:30 = 18:30 (Feb 18).
    // MATCHES!
    // Impact on Check-Out Time
    // Saved URL: 18:00 UTC.
    // UI (Client) converts to Local (IST).
    // 18:00 UTC = 23:30 IST.
    // So the user would see 11:30 PM.
    // NOT "Missing".
    // What if parsing Fails? ("Invalid Date")
    if (isNaN(d1.getTime())) {
        console.log("Parsing Failed!");
    }
}
testParsing();
