
import { LeavePlannerService } from '../modules/attendance/leave-planner.service';

async function test() {
    try {
        console.log('Testing Holiday Service...');
        const holidays = await LeavePlannerService.getHolidays(2026);
        console.log('Holidays found:', holidays.length);

        console.log('Testing Allocations Service...');
        const allocs = await LeavePlannerService.getLeaveAllocations(2026);
        console.log('Allocations found:', allocs.length);

        console.log('SUCCESS: Service logic is working.');
    } catch (e: any) {
        console.error('FAILURE: Service logic failed.');
        console.error(e);
    }
}

test();
