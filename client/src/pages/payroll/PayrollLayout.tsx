import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';

const PayrollLayout: React.FC = () => {
    const location = useLocation();

    // Determine title based on path
    const getTitle = () => {
        if (location.pathname.includes('salary')) return 'Salary Overview';
        if (location.pathname.includes('leaves')) return 'Leaves & Holidays';
        if (location.pathname.includes('attendance')) return 'Attendance';
        if (location.pathname.includes('payslips')) return 'Payslips';
        return 'Payroll Management';
    };

    return (
        <div className="flex h-full flex-col space-y-6 p-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">{getTitle()}</h1>
                <p className="text-sm text-muted-foreground">Manage your payroll, leaves, and attendance.</p>
            </div>

            <div className="flex-1">
                <Outlet />
            </div>
        </div>
    );
};

export default PayrollLayout;
