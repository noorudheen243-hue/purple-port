
import { AttendanceService } from './modules/attendance/service';

const testCases = [
  '2026-07-01T09:31:24.000Z',
  '2026-07-01T04:01:24.000Z',
  '2026-07-01 09:31:24',
  new Date('2026-07-01T04:01:24.000Z'),
  new Date('2026-07-01T09:31:24.000Z')
];

for (const tc of testCases) {
  console.log('Input:', tc);
  console.log('Output:', AttendanceService.normalizeBiometricTimestamp(tc).toISOString());
}

