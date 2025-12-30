import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '../../lib/api';
import { Download, Eye, Printer, X } from 'lucide-react';
import { Button } from '../../components/ui/button';

const SalarySlipModal = ({ slip, onClose }: { slip: any; onClose: () => void }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0 print:z-[100]">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 print:shadow-none print:w-full print:max-w-none print:my-0">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg print:hidden">
                    <h3 className="font-bold text-lg">Salary Slip</h3>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print / PDF</Button>
                        <Button variant="ghost" size="sm" onClick={onClose}><X className="w-5 h-5" /></Button>
                    </div>
                </div>

                <div className="p-8 bg-white print:p-0">
                    {/* LETTERHEAD HEADER */}
                    <div className="text-center border-b pb-6 mb-6">
                        <h1 className="text-3xl font-bold text-primary uppercase tracking-wide">Qix Ads</h1>
                        <p className="text-gray-500 text-sm mt-1">Digital Marketing Agency</p>
                        <h2 className="text-xl font-semibold mt-4 text-gray-800">Payslip for {new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'long' })} {slip.run.year}</h2>
                    </div>

                    {/* EMPLOYEE DETAILS */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
                        <div>
                            <p className="text-gray-500">Employee Name</p>
                            <p className="font-bold text-gray-900 text-lg">{slip.user?.full_name || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Designation</p>
                            <p className="font-semibold text-gray-900">{slip.user?.staffProfile?.designation || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Department</p>
                            <p className="font-semibold text-gray-900">{slip.user?.staffProfile?.department || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Staff ID</p>
                            <p className="font-semibold text-gray-900">{slip.user?.staffProfile?.staff_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500">Days Worked</p>
                            <p className="font-semibold text-gray-900">{30 - (slip.lop_days || 0)} Days</p>
                        </div>
                        <div>
                            <p className="text-gray-500">LOP Days</p>
                            <p className="font-semibold text-red-600">{slip.lop_days || 0} Days</p>
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="border rounded-lg overflow-hidden mb-8">
                        <div className="grid grid-cols-2 bg-gray-100 border-b">
                            <div className="p-3 font-bold text-gray-700 border-r text-center">EARNINGS</div>
                            <div className="p-3 font-bold text-gray-700 text-center">DEDUCTIONS</div>
                        </div>
                        <div className="grid grid-cols-2">
                            {/* Earnings Column */}
                            <div className="border-r">
                                <Row label="Basic Salary" value={slip.basic_salary} />
                                <Row label="HRA" value={slip.hra} />
                                <Row label="Conveyance" value={slip.conveyance_allowance} />
                                <Row label="Accommodation" value={slip.accommodation_allowance} />
                                <Row label="Allowances" value={slip.allowances} />
                                <Row label="Incentives" value={slip.incentives} />
                                <div className="p-3 flex justify-between font-bold border-t bg-green-50">
                                    <span>Total Earnings</span>
                                    <span>₹ {calculateTotalEarnings(slip).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                            {/* Deductions Column */}
                            <div>
                                <Row label="LOP Deduction" value={slip.lop_deduction} isDeduction />
                                <Row label="Salary Advance" value={slip.advance_salary} isDeduction />
                                <Row label="Other Deductions" value={slip.other_deductions} isDeduction />
                                <Row label="" value={0} hidden />
                                <Row label="" value={0} hidden />
                                <Row label="" value={0} hidden />

                                <div className="p-3 flex justify-between font-bold border-t bg-red-50">
                                    <span>Total Deductions</span>
                                    <span>₹ {calculateTotalDeductions(slip).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* NET PAY */}
                    <div className="bg-gray-900 text-white p-6 rounded-lg flex justify-between items-center shadow-lg print:bg-gray-200 print:text-black print:border-2 print:border-black">
                        <div>
                            <p className="text-sm opacity-80 uppercase tracking-widest">Net Payable</p>
                            <p className="text-xs opacity-60">Earnings - Deductions</p>
                        </div>
                        <div className="text-3xl font-bold">
                            ₹ {slip.net_pay.toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t flex justify-between text-xs text-gray-400">
                        <p>Generated by Qix Ads System</p>
                        <p>{new Date().toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Row = ({ label, value, isDeduction, hidden }: any) => {
    if (hidden) return <div className="p-2 h-8"></div>; // Spacer
    return (
        <div className="flex justify-between p-2 px-3 text-sm border-b last:border-0 hover:bg-gray-50">
            <span className="text-gray-600">{label}</span>
            <span className={`font-medium ${isDeduction ? 'text-red-600' : 'text-gray-900'}`}>
                {value ? `₹ ${value.toLocaleString('en-IN')}` : '-'}
            </span>
        </div>
    );
}

const calculateTotalEarnings = (s: any) => (s.basic_salary || 0) + (s.hra || 0) + (s.conveyance_allowance || 0) + (s.accommodation_allowance || 0) + (s.allowances || 0) + (s.incentives || 0);
const calculateTotalDeductions = (s: any) => (s.lop_deduction || 0) + (s.advance_salary || 0) + (s.other_deductions || 0);


const Payslips = () => {
    const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

    const { data: payslips, isLoading } = useQuery({
        queryKey: ['payslips'],
        queryFn: () => backend.get('/payroll/history').then(res => res.data)
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading payslips...</div>;

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {selectedSlip && <SalarySlipModal slip={selectedSlip} onClose={() => setSelectedSlip(null)} />}

            {(!payslips || payslips.length === 0) ? (
                <div className="p-12 text-center text-gray-500">
                    No payslips found. Generate one from Salary Calculator.
                </div>
            ) : (
                <ul role="list" className="divide-y divide-gray-200">
                    {payslips.map((slip: any) => (
                        <li key={slip.id} className="hover:bg-gray-50 transition">
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-indigo-600 truncate">
                                            {new Date(0, slip.run.month - 1).toLocaleString('default', { month: 'long' })} {slip.run.year}
                                        </p>
                                        <p className="text-xs text-gray-500">{slip.user?.full_name}</p>
                                    </div>
                                    <div className="ml-2 flex-shrink-0 flex">
                                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Paid
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between items-center">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500">
                                            Net Pay: <span className="font-medium text-gray-900 ml-1">₹{slip.net_pay.toLocaleString('en-IN')}</span>
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 gap-4">
                                        <button
                                            onClick={() => setSelectedSlip(slip)}
                                            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition"
                                        >
                                            <Eye className="h-4 w-4" /> View Slip
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default Payslips;
