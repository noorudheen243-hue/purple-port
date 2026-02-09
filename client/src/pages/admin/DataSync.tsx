
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { Download, Upload, AlertTriangle } from 'lucide-react';

const DataSync = () => {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>('');

    // Export Mutation
    const handleExport = async () => {
        try {
            setStatus('Downloading export...');
            const response = await api.get('/backup/export-json', { responseType: 'blob' });

            // Trigger Download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `purple-port-backup-${new Date().toISOString().split('T')[0]}.zip`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setStatus('Export Complete!');
        } catch (e: any) {
            console.error(e);
            // Try to extract backend error message
            let errMsg = 'Export Failed';
            if (e.response && e.response.data && e.response.data instanceof Blob) {
                // Blobs are hard to read in interceptors, but let's try
                const text = await e.response.data.text();
                try { const json = JSON.parse(text); errMsg = json.message || errMsg; } catch { /* ignore */ }
            } else if (e.message) {
                errMsg = e.message;
            }
            setStatus(errMsg);
        }
    };

    // Import Mutation
    const importMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            return await api.post('/backup/import-json', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 1800000 // 30 Minutes
            });
        },
        onSuccess: () => {
            setStatus('SUCCESS: Data Restored! Please refresh the page.');
            setFile(null);
            // Optional: reload window
            setTimeout(() => window.location.reload(), 2000);
        },
        onError: async (err: any) => {
            console.error('Import Error:', err);
            let errMsg = 'Import Failed';
            if (err.response?.data instanceof Blob) {
                const text = await err.response.data.text();
                try { const json = JSON.parse(text); errMsg = json.message || errMsg; } catch { }
            } else if (err.response?.data?.message) {
                errMsg = err.response.data.message;
            } else if (err.message) {
                errMsg = err.message;
            }
            setStatus(`Error: ${errMsg}`);
        }
    });

    const handleImport = () => {
        if (!file) return;
        if (!window.confirm("WARNING: This will DELETE all existing data on this server and replace it with the file data. Are you sure?")) return;

        const formData = new FormData();
        formData.append('file', file);
        setStatus('Restoring data... This may take a minute...');
        importMutation.mutate(formData);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800">Data Synchronization</h1>
            <p className="text-gray-600">Sync data between your Local Application and the Online Server.</p>

            <div className="grid md:grid-cols-2 gap-6">
                {/* EXPORT CARD */}
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Download className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold">Export Data</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        Download all current database records (Users, Clients, Tasks, etc.) as a JSON file.
                    </p>
                    <button
                        onClick={handleExport}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                    >
                        Download Backup (.zip)
                    </button>
                </div>

                {/* IMPORT CARD */}
                <div className="bg-white p-6 rounded-xl shadow border border-red-50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <Upload className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold">Import Data</h3>
                    </div>

                    <div className="bg-red-50 p-3 rounded border border-red-100 mb-4 flex gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-xs text-red-800">
                            <strong>Warning:</strong> Importing will Permanently DELETE existing data on this server and replace it.
                        </p>
                    </div>

                    <input
                        type="file"
                        accept=".zip,.json"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 mb-4"
                    />

                    <button
                        onClick={handleImport}
                        disabled={!file || importMutation.isPending}
                        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg transition"
                    >
                        {importMutation.isPending ? 'Restoring...' : 'Restore Data'}
                    </button>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-lg text-center font-medium ${status.includes('SUCCESS') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default DataSync;
