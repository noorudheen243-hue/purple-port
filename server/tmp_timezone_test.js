const IST_OFFSET = 330 * 60 * 1000;

// Mock database record (Midnight IST = 18:30 UTC of previous day)
const dbDateStr = "2026-02-28T18:30:00.000Z";
const recordDate = new Date(dbDateStr);

// Convert db record to IST DateKey
const istDate = new Date(recordDate.getTime() + IST_OFFSET);
const dateKeyRecord = istDate.toISOString().split('T')[0];

console.log('Record DateKey:', dateKeyRecord);

// Loop Date Object Generation (Local timezone of the running process)
const year = 2026;
const month = 3;
const d = new Date(year, month - 1, 1);

const d_year = d.getFullYear();
const d_month = String(d.getMonth() + 1).padStart(2, '0');
const d_date = String(d.getDate()).padStart(2, '0');
const dateKeyLoop = `${d_year}-${d_month}-${d_date}`;

console.log('Loop DateKey:', dateKeyLoop);

console.log('Match?', dateKeyRecord === dateKeyLoop);
