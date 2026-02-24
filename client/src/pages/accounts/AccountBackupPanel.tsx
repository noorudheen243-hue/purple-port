import React, { useRef, useState } from 'react';
import { Download, Upload, AlertTriangle, FileSpreadsheet, FileJson } from 'lucide-react';
import api from '../../lib/api';
import Swal from 'sweetalert2';

const AccountBackupPanel = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleDownloadExcel = async () => {
        try {
            const response = await api.get('/accounting/backup/excel', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Account_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            Swal.fire('Error', 'Failed to download Excel backup. Check your permissions.', 'error');
        }
    };

    const handleDownloadJSON = async () => {
        try {
            const response = await api.get('/accounting/backup/json', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Account_System_Backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            Swal.fire('Error', 'Failed to download JSON backup. Check your permissions.', 'error');
        }
    };

    const handleRestoreClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            Swal.fire('Invalid File', 'Please upload a valid JSON backup file.', 'error');
            return;
        }

        // Confirm
        const result = await Swal.fire({
            title: 'Are you absolutely sure?',
            text: "Restoring a backup will ERASE ALL CURRENT ACCOUNTING DATA and replace it with the data from this file. This action cannot be undone!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, overwrite everything!'
        });

        if (!result.isConfirmed) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);

        try {
            // Read file as JSON text
            const text = await file.text();
            const jsonData = JSON.parse(text);

            await api.post('/accounting/backup/restore', jsonData);

            Swal.fire('Restored!', 'Your accounting system has been fully restored from the backup.', 'success');
            // Hard reload might be good to refresh all state
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            Swal.fire('Restore Failed', error.response?.data?.message || 'Failed to parse or restore backup. Verify file format.', 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Download Section */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Download className="text-primary" size={20} />
                    Export & Backup
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                    Download copies of your accounting data. Use the Excel format for reporting and the JSON format for storing full system backups.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Excel Card */}
                    <div className="border rounded-lg p-5 flex flex-col items-start gap-3 hover:border-green-300 hover:bg-green-50/30 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                            <FileSpreadsheet size={24} />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">Download Excel Report</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Contains Ledgers, Transaction History, Income/Expense Summary, and Cash balances in a readable format.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadExcel}
                            className="mt-auto w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md text-sm font-medium transition-colors"
                        >
                            Download .XLSX
                        </button>
                    </div>

                    {/* JSON Card */}
                    <div className="border rounded-lg p-5 flex flex-col items-start gap-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <FileJson size={24} />
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900">System Backup (JSON)</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                Exact database export. Required format for restoring the system to a previous state. Keep this safe.
                            </p>
                        </div>
                        <button
                            onClick={handleDownloadJSON}
                            className="mt-auto w-full px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md text-sm font-medium transition-colors"
                        >
                            Download .JSON
                        </button>
                    </div>
                </div>
            </div>

            {/* Restore Section */}
            <div className="bg-red-50 border border-red-100 p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Restore System from Backup
                </h3>
                <p className="text-sm text-red-700 mb-6 max-w-3xl">
                    Warning: Restoring from a backup will completely overwrite all current financial data (ledgers, accounts, transactions).
                    Only use a valid .JSON backup file generated from this system.
                </p>

                <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                />

                <button
                    onClick={handleRestoreClick}
                    disabled={isUploading}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                    {isUploading ? (
                        <>Processing Restore...</>
                    ) : (
                        <>
                            <Upload size={18} />
                            Upload JSON Backup to Restore
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AccountBackupPanel;
