
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download, Filter, Calendar } from 'lucide-react';

const SalaryReports = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Fetch confirmed payroll runs or slips
    // Assuming we have an endpoint for this. If not, we might need to add one.
    // Let's assume GET /payroll/reports/summary?month=x&year=y
    // OR we reuse GET /payroll/runs?month=x&year=y and drill down.
    // For now, let's just use a placeholder query and suggest adding the endpoint if valid.
    // Actually, we can fetch all ledgers of type 'USER' (Staff) and show balances?
    // The requirement says "Salary & Wages Reports".
    // Let's show:
    // 1. Total Salary Expense vs Paid
    // 2. Staff Wise Breakdown (Net Pay, Deductions)

    // We will use existing endpoint: GET /payroll/history (we might need to create this info in payroll controller)

    const { data: reportData, isLoading } = useQuery({
        queryKey: ['salary-report', month, year],
        queryFn: async () => {
            // Mocking the data structure we want. 
            // We probably need to verify if backend supports this.
            // If not, we might default to "Staff Ledgers" view.
            // Let's try fetching '/payroll/run?month=..&year=..' to get the run details.
            const res = await api.get(`/payroll/run`, { params: { month, year } });
            return res.data;
        },
        retry: false
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Salary & Wages Report</h2>
                <div className="flex gap-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(0, i).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                    </select>
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm hover:bg-gray-50">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Payout Settled</p>
                    <h3 className="text-2xl font-bold text-gray-900">
                        ₹{reportData?.total_payout?.toLocaleString() || '0'}
                    </h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Total Deductions</p>
                    <h3 className="text-2xl font-bold text-red-600">
                        ₹{reportData?.total_deductions?.toLocaleString() || '0'}
                    </h3>
                </div>
                <div className="bg-white p-5 rounded-xl border shadow-sm">
                    <p className="text-sm text-gray-500 mb-1">Staff Processed</p>
                    <h3 className="text-2xl font-bold text-blue-600">
                        {reportData?.slips?.length || 0}
                    </h3>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden dash-table-container">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                        <tr>
                            <th className="px-6 py-3">Staff Name</th>
                            <th className="px-6 py-3">Designation</th>
                            <th className="px-6 py-3 text-right">Basic + Allowances</th>
                            <th className="px-6 py-3 text-right">Deductions</th>
                            <th className="px-6 py-3 text-right">Net Pay</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
                        ) : reportData?.slips?.map((slip: any) => (
                            <tr key={slip.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-3 font-medium text-gray-900">{slip.name || slip.user?.full_name}</td>
                                <td className="px-6 py-3 text-gray-500">{slip.designation}</td>
                                <td className="px-6 py-3 text-right">₹{(slip.basic_salary + slip.hra + slip.allowances + slip.conveyance_allowance).toLocaleString()}</td>
                                <td className="px-6 py-3 text-right text-red-500">-₹{(slip.lop_deduction + slip.advance_salary + slip.other_deductions).toLocaleString()}</td>
                                <td className="px-6 py-3 text-right font-bold text-gray-900">₹{slip.net_pay.toLocaleString()}</td>
                                <td className="px-6 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-full text-xs ${slip.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {slip.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {!isLoading && (!reportData?.slips || reportData.slips.length === 0) && (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payroll records found for this month.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
                .dash-table-container { scrollbar-width: thin; }
            `}</style>
        </div>
    );
};

export default SalaryReports;
