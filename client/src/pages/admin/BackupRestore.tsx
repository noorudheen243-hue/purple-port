import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import axios from 'axios';
import {
    HardDriveDownload,
    RotateCcw,
    Clock,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Server,
    Monitor,
    ToggleLeft,
    ToggleRight,
    Shield,
    Globe,
    History,
    FileJson,
    Zap,
    UploadCloud,
    DownloadCloud
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Swal from 'sweetalert2';

interface BackupFile {
    filename: string;
    sizeKB: string;
    createdAt: string;
    type: 'online' | 'offline' | 'auto' | 'unknown';
}

// Detect whether we're running on the online server
const isOnlineHost = typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

const REMOTE_URL = isOnlineHost
    ? '' // Relative if already on online
    : 'https://qixport.com';

const BackupRestore: React.FC = () => {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [savingBackup, setSavingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [togglingAuto, setTogglingAuto] = useState(false);
    const [latestBackup, setLatestBackup] = useState<BackupFile | null>(null);

    // Fetch unified history from the Online Server
    const fetchHistory = useCallback(async () => {
        setLoadingList(true);
        try {
            // Always fetch from the remote URL (which is qixport.com)
            const targetUrl = isOnlineHost ? 'backup/list-local' : `${REMOTE_URL}/api/backup/list-local`;

            const res = isOnlineHost
                ? await api.get(targetUrl)
                : await axios.get(targetUrl, { withCredentials: true, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

            const list = res.data.backups || [];
            setBackups(list);

            if (list.length > 0) {
                setLatestBackup(list[0]);
                if (!selectedFile) setSelectedFile(list[0].filename);
            }
        } catch (err) {
            console.error('Failed to fetch backup history:', err);
        } finally {
            setLoadingList(false);
        }
    }, [selectedFile]);

    const fetchAutoSetting = useCallback(async () => {
        try {
            const targetUrl = isOnlineHost ? 'backup/auto-backup-setting' : `${REMOTE_URL}/api/backup/auto-backup-setting`;
            const res = isOnlineHost
                ? await api.get(targetUrl)
                : await axios.get(targetUrl, { withCredentials: true, headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

            setAutoBackupEnabled(res.data.enabled);
        } catch { }
    }, []);

    useEffect(() => {
        fetchHistory();
        fetchAutoSetting();
    }, [fetchHistory, fetchAutoSetting]);

    const handleBackupNow = async () => {
        const result = await Swal.fire({
            title: 'Create Application Backup?',
            html: `This will back up the entire application data and database.<br><b>Storage:</b> Online Server Only`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#7c3aed',
            confirmButtonText: 'Yes, Backup Now',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;

        setSavingBackup(true);
        try {
            if (isOnlineHost) {
                await api.post('backup/save-to-disk', { type: 'online' });
            } else {
                Swal.update({ title: 'Step 1/2: Preparing backup locally...', text: '' });
                const localRes = await api.post('backup/save-to-disk', { type: 'offline' });
                const filename = localRes.data.filename;

                Swal.update({ title: 'Step 2/2: Uploading to Online Server...', text: 'Please wait, transferring file' });

                const downloadRes = await api.get(`backup/download/${filename}`, { responseType: 'blob' });

                const formData = new FormData();
                formData.append('file', downloadRes.data, filename);

                await axios.post(`${REMOTE_URL}/api/backup/upload`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    withCredentials: true
                });
            }

            await fetchHistory();
            Swal.fire({
                icon: 'success',
                title: 'Backup Successful',
                text: 'The backup has been saved and stored on the online server.',
                confirmButtonColor: '#7c3aed',
                timer: 3000
            });
        } catch (err: any) {
            const is404 = err.response?.status === 404;
            Swal.fire({
                icon: 'error',
                title: 'Backup Failed',
                text: is404 && !isOnlineHost
                    ? 'Online Server endpoint not found. Please click "Sync to Cloud" in the header to deploy recent changes to the VPS first.'
                    : err.response?.data?.message || err.message || 'Check your internet connection.',
                confirmButtonColor: '#7c3aed'
            });
        } finally {
            setSavingBackup(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile) return;

        const result = await Swal.fire({
            title: '⚠️ Confirm Restore',
            html: `<p>This will <b>permanently replace ALL current data</b> with:</p>
                   <code style="font-size:12px;background:#fef2f2;color:#991b1b;padding:4px 10px;border-radius:4px;display:block;margin:8px 0;">${selectedFile}</code>
                   <p style="color:#6b7280;font-size:13px;">This action cannot be undone and is performed on the <b>${isOnlineHost ? 'ONLINE' : 'LOCAL'}</b> server.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: '🔄 Yes, Restore Now',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;

        setRestoringBackup(true);
        try {
            if (!isOnlineHost) {
                Swal.fire({ title: 'Preparing Restore...', text: 'Checking file availability...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                const localList = await api.get('backup/list-local');
                const fileExistsLocally = (localList.data.backups as any[]).some(b => b.filename === selectedFile);

                if (!fileExistsLocally) {
                    Swal.update({ title: 'Pulling backup from Online Server...', text: 'Transferring file to local machine' });
                    await api.post('backup/download-from-remote', {
                        remoteUrl: REMOTE_URL,
                        filename: selectedFile,
                        token: localStorage.getItem('token')
                    });
                }
            }

            await api.post('backup/restore-from-disk', { filename: selectedFile }, { timeout: 1800000 });

            Swal.fire({
                icon: 'success',
                title: 'Restore Complete!',
                text: 'The application has been restored. Page will reload now.',
                confirmButtonColor: '#7c3aed',
                timer: 3000
            }).then(() => window.location.reload());
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Restore Failed',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#7c3aed'
            });
        } finally {
            setRestoringBackup(false);
        }
    };

    const handleToggleAuto = async () => {
        if (!isOnlineHost) {
            Swal.fire({
                icon: 'info',
                title: 'Online Setting Only',
                text: 'Auto-Backup can only be activated directly on the Online Server (qixport.com) to ensure data security.',
                confirmButtonColor: '#7c3aed'
            });
            return;
        }

        const newState = !autoBackupEnabled;
        setTogglingAuto(true);
        try {
            await api.post('backup/auto-backup-setting', { enabled: newState });
            setAutoBackupEnabled(newState);
            Swal.fire({
                icon: 'success',
                title: `Auto-Backup ${newState ? 'Activated' : 'Deactivated'}`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Action Failed', text: err.response?.data?.message || err.message });
        } finally {
            setTogglingAuto(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'online': return 'bg-violet-100 text-violet-700 border-violet-200';
            case 'offline': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'auto': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-500 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isOnlineHost ? 'bg-violet-100' : 'bg-emerald-100'}`}>
                        {isOnlineHost ? <Server className="h-6 w-6 text-violet-600" /> : <Monitor className="h-6 w-6 text-emerald-600" />}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Backup & Restore</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            {isOnlineHost ? <Globe className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {isOnlineHost ? 'Production VPS Environment' : 'Local Development Environment'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-1 bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Backup Storage Paths</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] font-semibold text-violet-500 uppercase">Production Server</p>
                            <p className="text-[11px] font-bold text-gray-700">/var/backups/antigravity</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-semibold text-emerald-500 uppercase">Local Machine</p>
                            <p className="text-[11px] font-bold text-gray-700">F:\Antigravity\Backup</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-right">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Latest Backup</p>
                        <p className="text-sm font-bold text-gray-700">{latestBackup ? formatDate(latestBackup.createdAt) : 'None'}</p>
                    </div>
                    {latestBackup && (
                        <Badge className={`capitalize py-1 px-3 ${getTypeColor(latestBackup.type)}`}>
                            {latestBackup.type}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-none shadow-xl shadow-violet-500/5 bg-gradient-to-br from-white to-violet-50/30 overflow-hidden">
                    <CardHeader className="pb-4 relative">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <UploadCloud className="h-24 w-24" />
                        </div>
                        <CardTitle className="text-2xl font-extrabold text-violet-900 flex items-center gap-2">
                            Manual Backup
                        </CardTitle>
                        <CardDescription className="text-violet-600/70 font-medium">
                            Snapshot entire application data including database & uploads to the server.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-violet-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-amber-500" /> Quick Backup
                                </h3>
                                <p className="text-xs text-gray-500">Backs up users, tasks, attendance, settings, and media files.</p>
                                <Button
                                    onClick={handleBackupNow}
                                    disabled={savingBackup}
                                    className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-violet-200"
                                >
                                    {savingBackup ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <DownloadCloud className="h-5 w-5 mr-2" />}
                                    Backup Now
                                </Button>
                            </div>

                            <div className="space-y-3 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 group-hover:scale-110 transition-transform">
                                    <Clock className="h-12 w-12" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <History className="h-4 w-4 text-blue-500" /> Daily Auto-Backup
                                    </h3>
                                    <Badge variant="outline" className={autoBackupEnabled ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}>
                                        {autoBackupEnabled ? 'Enabled' : 'Disabled'}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500">Schedule: Midnight 00:00 IST</p>
                                <Button
                                    onClick={handleToggleAuto}
                                    disabled={togglingAuto}
                                    variant="outline"
                                    className={`w-full h-11 rounded-xl font-bold transition-all ${autoBackupEnabled ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                                >
                                    {togglingAuto ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : autoBackupEnabled ? <ToggleRight className="h-5 w-5 mr-2" /> : <ToggleLeft className="h-5 w-5 mr-2" />}
                                    {autoBackupEnabled ? 'Deactivate Auto-Backup' : 'Activate Auto-Backup'}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white/60 rounded-2xl border border-gray-100 p-1">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Last Backup History</h4>
                                <Button variant="ghost" size="sm" onClick={fetchHistory} className="h-7 text-violet-600 px-2 rounded-lg hover:bg-violet-50">
                                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingList ? 'animate-spin' : ''}`} /> Sync History
                                </Button>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto px-1 py-1 custom-scrollbar">
                                {backups.length > 0 ? (
                                    backups.slice(0, 5).map((b, i) => (
                                        <div key={b.filename} className="flex items-center justify-between p-3 hover:bg-white rounded-xl transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${getTypeColor(b.type)} bg-opacity-50`}>
                                                    <FileJson className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700">{b.filename}</p>
                                                    <p className="text-[11px] text-gray-400">{formatDate(b.createdAt)} • {b.sizeKB} KB</p>
                                                </div>
                                            </div>
                                            <Badge className={`capitalize font-semibold border ${getTypeColor(b.type)}`}>
                                                {b.type}
                                            </Badge>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm">No backup history found.</div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-red-500/5 bg-gradient-to-br from-white to-red-50/20">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-extrabold text-red-900 flex items-center gap-2">
                            Restore System
                        </CardTitle>
                        <CardDescription className="text-red-600/70 font-medium">
                            Roll back your instance to any of the last 30 backups.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 space-y-2">
                            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                                <Shield className="h-4 w-4" /> Critical Warning
                            </div>
                            <p className="text-[11px] text-red-600 leading-relaxed font-medium">
                                Restoring will replace your current database and files permanently. This action is irreversible.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">Choose Backup Source (Last 30)</label>
                                <select
                                    value={selectedFile}
                                    onChange={(e) => setSelectedFile(e.target.value)}
                                    className="w-full h-12 rounded-xl border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all px-3 outline-none"
                                >
                                    {backups.length === 0 && <option value="">No backups available</option>}
                                    {backups.map(b => (
                                        <option key={b.filename} value={b.filename}>
                                            [{b.type.toUpperCase()}] {formatDate(b.createdAt)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <Button
                                onClick={handleRestore}
                                disabled={restoringBackup || !selectedFile}
                                className="w-full h-14 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {restoringBackup ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <RotateCcw className="h-5 w-5 mr-2" />}
                                Restore Selected Backup
                            </Button>

                            <div className="flex items-center gap-2 justify-center py-2">
                                <div className="h-1 w-1 bg-red-200 rounded-full" />
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Managed Restore Protocol</span>
                                <div className="h-1 w-1 bg-red-200 rounded-full" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {backups.length > 5 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 text-sm">Extended Backup History (Limit 30)</h3>
                        <Badge variant="secondary" className="bg-violet-100 text-violet-700">{backups.length} Files</Badge>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-[11px] font-bold text-gray-400 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-3">Timestamp / Date</th>
                                    <th className="px-6 py-3">Backup Filename</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Size</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {backups.map((b) => (
                                    <tr key={b.filename} className={`hover:bg-violet-50/30 transition-colors ${selectedFile === b.filename ? 'bg-violet-50 text-violet-700' : ''}`} onClick={() => setSelectedFile(b.filename)}>
                                        <td className="px-6 py-4 font-bold">{formatDate(b.createdAt)}</td>
                                        <td className="px-6 py-4 font-medium opacity-70">{b.filename}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className={`capitalize ${getTypeColor(b.type)}`}>
                                                {b.type}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-gray-500">{b.sizeKB} KB</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BackupRestore;
