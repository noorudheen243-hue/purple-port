import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Download, Upload, RefreshCw, Trash2, Zap, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';
import Swal from 'sweetalert2';

export const SystemToolsTab = () => {
    const [activeSubTab, setActiveSubTab] = useState<'sync' | 'cleanup' | 'optimize'>('sync');

    // --- Data Sync Logic ---
    const [file, setFile] = useState<File | null>(null);

    // Note: cleanup state is declared further down, moving it here for consistency


    const handleDownload = async () => {
        try {
            const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:4001/api'}/backup/export-json`, {
                credentials: 'include'
            });
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson.message || `Export failed: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `full_backup_${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            Swal.fire('Export Failed', err.message, 'error');
        }
    };

    const importMutation = useMutation({
        mutationFn: async () => {
            if (!file) throw new Error("Please select a file");
            const formData = new FormData();
            formData.append('file', file);
            return await api.post('/backup/import-json', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            Swal.fire({
                title: 'Sync Complete!',
                text: 'The system has been restored. Reloading...',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            }).then(() => window.location.reload());
        },
        onError: (err: any) => Swal.fire('Import Failed', err.message || "Import Failed", 'error')
    });

    // --- Cleanup State ---
    const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
    const [cleanupPassword, setCleanupPassword] = useState('');
    const [cleanupStatus, setCleanupStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // --- Cleanup Logic ---
    const cleanupMutation = useMutation({
        mutationFn: async () => await api.post('/system/cleanup-files'),
        onSuccess: (data: any) => {
            setCleanupStatus({ type: 'success', message: data.details || 'Cleanup Successful' });
            setShowCleanupConfirm(false);
            setCleanupPassword('');
            setTimeout(() => setCleanupStatus(null), 5000);
        },
        onError: (err: any) => {
            const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message;
            setCleanupStatus({ type: 'error', message: errorMessage });
        }
    });

    // --- Optimize Logic ---
    const optimizeMutation = useMutation({
        mutationFn: async () => await api.post('/system/optimize'),
        onSuccess: (data: any) => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Optimization Successful',
                showConfirmButton: false,
                timer: 3000
            });
        },
        onError: (err: any) => {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: 'Optimization Failed',
                text: err.message,
                showConfirmButton: false,
                timer: 3000
            });
        }
    });

    return (
        <div className="h-full flex flex-col">
            {/* Sub-tabs Navigation */}
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-1 overflow-x-auto">
                <button
                    onClick={() => setActiveSubTab('sync')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                        activeSubTab === 'sync'
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <Database size={16} /> Data Sync
                </button>
                <button
                    onClick={() => setActiveSubTab('cleanup')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                        activeSubTab === 'cleanup'
                            ? "border-red-500 text-red-600 dark:text-red-400"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <Trash2 size={16} /> Clear Attachments
                </button>
                <button
                    onClick={() => setActiveSubTab('optimize')}
                    className={clsx(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                        activeSubTab === 'optimize'
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
                    )}
                >
                    <Zap size={16} /> System Optimization
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pr-2">

                {/* --- Data Sync Content --- */}
                {activeSubTab === 'sync' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Export */}
                            <div className="border border-border rounded-xl p-6 bg-muted/30 hover:bg-card hover:shadow-md transition-all text-center group">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Download size={24} />
                                </div>
                                <h3 className="font-bold text-foreground">Export Local Data</h3>
                                <p className="text-xs text-muted-foreground mt-2 mb-4">Download complete JSON dump (Users, Clients, Campaigns, Settings) + Uploads as ZIP.</p>
                                <button onClick={handleDownload} className="w-full py-2 bg-background border border-border font-medium text-foreground rounded-lg hover:bg-muted flex items-center justify-center gap-2 transition-colors">
                                    <Download size={16} /> Download Backup
                                </button>
                            </div>

                            {/* Import */}
                            <div className="border border-red-200 dark:border-red-900 rounded-xl p-6 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 hover:shadow-md transition-all text-center group">
                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={24} />
                                </div>
                                <h3 className="font-bold text-red-900 dark:text-red-200">Import to VPS</h3>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-2 mb-4">Overwrite current environment with uploaded ZIP. <b>Irreversible!</b></p>

                                <div className="space-y-3">
                                    <input
                                        type="file"
                                        accept=".zip"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-red-100 dark:file:bg-red-900/30 file:text-red-700 dark:file:text-red-300 hover:file:bg-red-200 cursor-pointer"
                                    />
                                    <button
                                        onClick={() => {
                                            Swal.fire({
                                                title: 'Overwrite Server Data?',
                                                text: "This will permanently delete ALL existing data and replace it with the backup. This action cannot be undone!",
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonColor: '#d33',
                                                confirmButtonText: 'Yes, Overwrite Everything'
                                            }).then((result) => {
                                                if (result.isConfirmed) {
                                                    importMutation.mutate();
                                                }
                                            });
                                        }}
                                        disabled={!file || importMutation.isPending}
                                        className="w-full py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                    >
                                        {importMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                                        {importMutation.isPending ? 'Restoring...' : 'Restore Data'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Cleanup Content --- */}
                {activeSubTab === 'cleanup' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-8 bg-background shadow-sm">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-lg shrink-0">
                                    <Trash2 size={32} />
                                </div>
                                <div className="space-y-3 flex-1">
                                    <h3 className="text-lg font-bold text-foreground">Clear Uploaded Files</h3>
                                    <div className="text-sm text-muted-foreground space-y-2">
                                        <p>This action will clean up the server's file storage:</p>
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>Deletes <b>ALL</b> files in the <code>uploads/</code> directory.</li>
                                            <li>Clears any temporary system files.</li>
                                            <li><b className="text-green-600 dark:text-green-400">Database records remain intact</b> (Clients, Users, Tasks, etc.)</li>
                                        </ul>
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-900 px-4 mt-4">
                                            <AlertTriangle size={18} className="shrink-0" />
                                            <span className="font-semibold text-xs">Warning: Uploaded files cannot be recovered after deletion.</span>
                                        </div>
                                    </div>

                                    {/* Inline Status Message */}
                                    {cleanupStatus && (
                                        <div className={clsx(
                                            "mt-4 p-4 rounded-lg flex items-center gap-3 text-sm font-medium animate-in fade-in zoom-in duration-300",
                                            cleanupStatus.type === 'success' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200"
                                        )}>
                                            {cleanupStatus.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                            {cleanupStatus.message}
                                        </div>
                                    )}

                                    <div className="pt-4">
                                        {!showCleanupConfirm ? (
                                            <button
                                                onClick={() => {
                                                    setShowCleanupConfirm(true);
                                                    setCleanupStatus(null);
                                                }}
                                                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                            >
                                                <Trash2 size={18} /> Execute Cleanup
                                            </button>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                                                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm mb-2">Confirm Action</h4>
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-xs text-red-600 dark:text-red-300">Are you sure you want to delete all uploaded files? This cannot be undone.</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => cleanupMutation.mutate()}
                                                            disabled={cleanupMutation.isPending}
                                                            className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                                                        >
                                                            {cleanupMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                                            {cleanupMutation.isPending ? 'Cleaning...' : 'Yes, Delete All Files'}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setShowCleanupConfirm(false);
                                                                setCleanupStatus(null);
                                                            }}
                                                            disabled={cleanupMutation.isPending}
                                                            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- Optimize Content --- */}
                {activeSubTab === 'optimize' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="border border-border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-lg">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">System Health & Optimization</h3>
                                        <p className="text-xs text-muted-foreground">Keep the server running smoothly.</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="text-sm text-foreground">
                                        <p className="mb-2">Clicking "Optimize" will perform the following actions:</p>
                                        <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                                            <li>Clear <code>uploads/temp</code> directory.</li>
                                            <li>Trigger Garbage Collection (if available).</li>
                                            <li>Free up unused memory resources.</li>
                                        </ul>
                                    </div>
                                    <button
                                        onClick={() => optimizeMutation.mutate()}
                                        disabled={optimizeMutation.isPending}
                                        className="w-full md:w-auto px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {optimizeMutation.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Zap size={16} />}
                                        {optimizeMutation.isPending ? 'Optimizing...' : 'Run Optimization'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
