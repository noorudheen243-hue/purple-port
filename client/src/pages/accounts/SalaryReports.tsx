
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download, Filter, Calendar } from 'lucide-react';

const SalaryReports = () => {
    const [activeTab, setActiveTab] = useState<'summary' | 'ledger'>('summary');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Ledger View State
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Fetch Payroll Summary
    const { data: reportData, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['salary-report', month, year],
        queryFn: async () => (await api.get(`/payroll/run`, { params: { month, year } })).data,
        enabled: activeTab === 'summary'
    });

    // Fetch Staff List for Dropdown
    const { data: staffList } = useQuery({
        queryKey: ['staff-list-simple'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    // Fetch Staff Ledger Statement
    const { data: ledgerData, isLoading: isLoadingLedger } = useQuery({
        queryKey: ['staff-ledger', selectedStaffId, startDate, endDate],
        queryFn: async () => {
            if (!selectedStaffId) return null;
            // Fetch by entity type USER to get the staff ledger
            // We assume the backend resolves the correct ledger for the user entity
            const res = await api.get('/accounting/reports/statement', {
                params: {
                    entity_type: 'USER',
                    entity_id: selectedStaffId,
                    start_date: startDate,
                    end_date: endDate
                }
            });
            return res.data;
        },
        enabled: activeTab === 'ledger' && !!selectedStaffId
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Salary & Wages Report</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Monthly Summary
                    </button>
                    <button
                        onClick={() => setActiveTab('ledger')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Staff Ledgers
                    </button>
                </div>
            </div>

            {/* TAB: MONTHLY SUMMARY */}
            {activeTab === 'summary' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                    {/* Controls */}
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div className="flex gap-2 items-center">
                            <span className="text-sm font-medium text-gray-600">Period:</span>
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
                                <option value={2026}>2026</option>
                            </select>
                        </div>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-md text-sm hover:bg-gray-50 text-gray-700">
                            <Download size={16} /> Export CSV
                        </button>
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
                                {isLoadingSummary ? (
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
                                {!isLoadingSummary && (!reportData?.slips || reportData.slips.length === 0) && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payroll records found for this month.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: STAFF LEDGERS */}
            {activeTab === 'ledger' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="flex flex-wrap gap-4 items-end bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Select Staff Member</label>
                            <select
                                value={selectedStaffId}
                                onChange={(e) => setSelectedStaffId(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                            >
                                <option value="">-- Choose Staff --</option>
                                {staffList?.map((s: any) => (
                                    <option key={s.user.id} value={s.user.id}>
                                        {s.user.full_name} ({s.designation})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                            />
                        </div>
                    </div>

                    {/* Ledger Report Content */}
                    {selectedStaffId ? (
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800">Ledger Statement</h3>
                                    <p className="text-xs text-gray-500">
                                        Opening Balance: <span className={ledgerData?.opening_balance < 0 ? 'text-red-600' : 'text-green-600'}>₹{Math.abs(ledgerData?.opening_balance || 0).toLocaleString()} {ledgerData?.opening_balance < 0 ? 'Dr' : 'Cr'}</span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Closing Balance</p>
                                    <span className={`font-bold text-lg ${ledgerData?.ending_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ₹{Math.abs(ledgerData?.ending_balance || 0).toLocaleString()} {ledgerData?.ending_balance < 0 ? 'Dr' : 'Cr'}
                                    </span>
                                </div>
                            </div>

                            <div className="dash-table-container max-h-[500px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b sticky top-0 bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 w-[120px]">Date</th>
                                            <th className="px-6 py-3">Description</th>
                                            <th className="px-6 py-3 text-right w-[120px]">Debit</th>
                                            <th className="px-6 py-3 text-right w-[120px]">Credit</th>
                                            <th className="px-6 py-3 text-right w-[150px]">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {isLoadingLedger ? (
                                            <tr><td colSpan={5} className="text-center py-8">Loading Ledger...</td></tr>
                                        ) : ledgerData?.transactions?.map((tx: any) => (
                                            <tr key={tx.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-3 text-gray-600 font-mono text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-3 font-medium text-gray-900">{tx.description}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">{tx.debit > 0 ? `₹${tx.debit.toLocaleString()}` : '-'}</td>
                                                <td className="px-6 py-3 text-right text-gray-600">{tx.credit > 0 ? `₹${tx.credit.toLocaleString()}` : '-'}</td>
                                                <td className="px-6 py-3 text-right font-medium">
                                                    <span className={tx.running_balance < 0 ? 'text-red-600' : 'text-green-600'}>
                                                        {Math.abs(tx.running_balance).toLocaleString()} {tx.running_balance < 0 ? 'Dr' : 'Cr'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {!isLoadingLedger && (!ledgerData?.transactions || ledgerData.transactions.length === 0) && (
                                            <tr><td colSpan={5} className="text-center py-12 text-gray-400">No transactions in this period.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <p className="text-gray-400">Select a staff member to view their ledger statement.</p>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .dash-table-container { scrollbar-width: thin; }
            `}</style>
        </div>
    );
};

export default SalaryReports;
