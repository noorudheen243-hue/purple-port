import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import { AlertTriangle, Banknote, Calendar, Lock } from 'lucide-react';

interface ExitWorkflowProps {
    staffId: string;
    staffName: string;
    onClose: () => void;
    onSuccess: () => void;
}

const ExitWorkflow: React.FC<ExitWorkflowProps> = ({ staffId, staffName, onClose, onSuccess }) => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [step, setStep] = useState(1);
    const [settlementData, setSettlementData] = useState<any>(null);

    const onSubmit = async (data: any) => {
        try {
            const res = await api.post(`/team/staff/${staffId}/exit`, data);
            setSettlementData(res.data);
            setStep(2);
        } catch (error) {
            console.error("Exit failed", error);
            alert("Failed to initiate exit.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <div className="flex items-center gap-3 text-red-600 mb-6 border-b pb-4">
                    <AlertTriangle size={28} />
                    <h2 className="text-xl font-bold">Initiate Exit: {staffName}</h2>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="bg-red-50 p-4 rounded-md text-sm text-red-800">
                            <strong>Warning:</strong> This action will:
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                                <li>Disable user login access after the Exit Date.</li>
                                <li>Lock the Salary Ledger.</li>
                                <li>Post a Final Settlement Journal Entry.</li>
                            </ul>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Last Working Day (Exit Date)</label>
                            <input
                                type="date"
                                {...register('exitDate', { required: true })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reason for Exit</label>
                            <textarea
                                {...register('reason', { required: true })}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border"
                                placeholder="Resignation, Termination, etc."
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium">Initiate Exit</button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                <Lock size={24} />
                            </div>
                            <h3 className="text-lg font-medium">Exit Process Initiated</h3>
                            <p className="text-gray-500">Access has been scheduled for locking.</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                            <h4 className="font-medium flex items-center gap-2">
                                <Banknote size={18} /> Final Settlement Preview
                            </h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pro-rata Salary:</span>
                                <span className="font-mono font-medium">₹{settlementData?.estimatedSettlement?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pending Deductions:</span>
                                <span className="font-mono font-medium text-red-600">- ₹0.00</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-bold">
                                <span>Net Payable:</span>
                                <span>₹{settlementData?.estimatedSettlement?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => { onSuccess(); onClose(); }} className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExitWorkflow;
