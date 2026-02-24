import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Loader2, CheckCircle, AlertCircle, Edit2, Save, X } from 'lucide-react';

const EditSalaryModal = ({ isOpen, onClose, staff, month, year, onSave }: any) => {
    const [formData, setFormData] = useState({
        basic: 0,
        hra: 0,
        allowances: 0,
        conveyance: 0,
        accommodation: 0,
        incentives: 0,
        leaveDeduction: 0,
        advance: 0
    });

    useEffect(() => {
        if (staff) {
            setFormData({
                basic: staff.basic || 0,
                hra: staff.hra || 0,
                allowances: staff.allowances || 0,
                conveyance: staff.conveyance || 0,
                accommodation: staff.accommodation || 0,
                incentives: staff.incentives || 0,
                leaveDeduction: staff.leaveDeduction || 0,
                advance: staff.advance || 0
            });
        }
    }, [staff]);

    const calculateTotals = () => {
        const gross = formData.basic + formData.hra + formData.allowances + formData.conveyance + formData.accommodation + formData.incentives;
        const deductions = formData.leaveDeduction + formData.advance;
        return { gross, net: gross - deductions };
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="text-xl font-bold">Edit Salary: {staff.name}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {/* Earnings */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-green-700 border-b pb-1">Earnings</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Basic Salary</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.basic}
                                onChange={e => setFormData({ ...formData, basic: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">HRA</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.hra}
                                onChange={e => setFormData({ ...formData, hra: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Allowances</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.allowances}
                                onChange={e => setFormData({ ...formData, allowances: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Conveyance Allowance</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.conveyance}
                                onChange={e => setFormData({ ...formData, conveyance: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Accommodation Allowance</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.accommodation}
                                onChange={e => setFormData({ ...formData, accommodation: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Incentives & Bonus</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2 bg-yellow-50"
                                value={formData.incentives}
                                onChange={e => setFormData({ ...formData, incentives: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-4">
                        <h4 className="font-semibold text-red-700 border-b pb-1">Deductions</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Leave Amount</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2"
                                value={formData.leaveDeduction}
                                onChange={e => setFormData({ ...formData, leaveDeduction: parseFloat(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Calculated based on {staff.effectiveLeaveDays} LOP days</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Salary Advance</label>
                            <input
                                type="number"
                                className="mt-1 w-full rounded-md border-gray-300 shadow-sm border p-2 bg-yellow-50"
                                value={formData.advance}
                                onChange={e => setFormData({ ...formData, advance: parseFloat(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Totals */}
                        <div className="mt-8 pt-4 border-t space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Total Gross Earnings:</span>
                                <span className="font-semibold">₹{calculateTotals().gross.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-indigo-700 bg-indigo-50 p-2 rounded">
                                <span>Net Payable:</span>
                                <span>₹{calculateTotals().net.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
                    <button
                        onClick={() => onSave(formData)}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Save size={18} /> Save Changes
                    </button>
                    <p className="text-xs text-gray-400 self-center">* Updates Master Data & Payroll Draft</p>
                </div>
            </div>
        </div>
    );
};

const SalaryOverview: React.FC = () => {
    const queryClient = useQueryClient();
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Modal State
    const [editingStaff, setEditingStaff] = useState<any>(null);

    // Fetch Preview Data
    const { data: previewData, isLoading, error } = useQuery({
        queryKey: ['payroll-preview', month, year],
        queryFn: async () => {
            const res = await api.get(`/payroll/preview?month=${month}&year=${year}`);
            return res.data;
        }
    });

    // Mutations
    const saveSlipMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.post('/payroll/slip/save', {
                month,
                year,
                userId: editingStaff.user_id,
                data
            });
        },
        onSuccess: () => {
            setEditingStaff(null);
            queryClient.invalidateQueries({ queryKey: ['payroll-preview'] });
        },
        onError: (err: any) => alert(err.message)
    });

    const processMutation = useMutation({
        mutationFn: async () => {
            await api.post('/payroll/process', {
                month,
                year,
                confirmedData: previewData.previews
            });
        },
        onSuccess: () => {
            alert("Payroll Processed Successfully!");
            queryClient.invalidateQueries({ queryKey: ['payroll-preview'] });
        },
        onError: (err: any) => {
            alert("Failed to process payroll: " + err.response?.data?.message);
        }
    });

    if (isLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-600" /></div>;
    if (error) return <div className="p-10 text-red-600">Failed to load payroll data.</div>;

    const staffSalaryData = previewData?.previews || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">Salary Overview</h2>
                    <p className="text-sm text-gray-500">
                        {staffSalaryData.length} Active Staff Members for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                    </select>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to process payroll for this month? This will lock the data and post journal entries.")) {
                                processMutation.mutate();
                            }
                        }}
                        disabled={processMutation.isPending || staffSalaryData.length === 0}
                        className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                        {processMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                        Process Payroll
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Employee</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Earnings</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Deductions</th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Net Pay</th>
                            <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {staffSalaryData.map((person: any) => (
                            <tr key={person.staff_id} className={person.isDraft ? 'bg-indigo-50/30' : ''}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                    {person.name}
                                    <div className="text-gray-500 text-xs">{person.designation}</div>
                                    {person.isDraft && <span className="text-[10px] text-indigo-600 font-bold bg-indigo-100 px-1 rounded ml-2">EDITED</span>}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <div className="flex flex-col text-xs space-y-0.5">
                                        <span>Basic: {person.basic.toLocaleString()}</span>
                                        <span>HRA: {person.hra.toLocaleString()}</span>
                                        {person.incentives > 0 && <span className="text-green-600 font-semibold">Bonus: {person.incentives.toLocaleString()}</span>}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <div className="flex flex-col text-xs space-y-0.5">
                                        <span className="text-red-500">Leave: {person.leaveDeduction.toFixed(0)}</span>
                                        {person.advance > 0 && <span className="text-red-500">Adv: {person.advance.toLocaleString()}</span>}
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm font-bold text-gray-900">₹{person.netPay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                                    <button
                                        onClick={() => setEditingStaff(person)}
                                        className="text-indigo-600 hover:text-indigo-900 p-2 hover:bg-indigo-50 rounded-full transition"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            <EditSalaryModal
                isOpen={!!editingStaff}
                staff={editingStaff}
                onClose={() => setEditingStaff(null)}
                onSave={saveSlipMutation.mutate}
            />
        </div>
    );
};

export default SalaryOverview;
