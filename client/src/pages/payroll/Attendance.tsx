import React, { useState } from 'react';

const Attendance: React.FC = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    // Mock Data
    const attendanceSummary = {
        totalWorkingDays: 24,
        holidays: 2,
        totalWeekends: 4,
        leaveTaken: 1,
        paidLeaveEligibility: 1,
        effectiveLeave: 0,
        effectiveWorkingDays: 24
    };

    return (
        <div className="max-w-2xl">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">Attendance Summary for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Working Days</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">{attendanceSummary.totalWorkingDays}</dd>
                    </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <dt className="text-sm font-medium text-gray-500 truncate">Effective Leave Days</dt>
                        <dd className="mt-1 text-3xl font-semibold text-red-600">{attendanceSummary.effectiveLeave}</dd>
                        <p className="text-xs text-gray-400 mt-1">
                            (Taken: {attendanceSummary.leaveTaken} - Paid: {attendanceSummary.paidLeaveEligibility})
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Detailed Calculation</h3>
                </div>
                <div className="border-t border-gray-200">
                    <dl>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Calendar Days</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">30</dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Holidays</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{attendanceSummary.holidays}</dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Paid Leave Credit</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{attendanceSummary.paidLeaveEligibility}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
