import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
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
    Folder,
    CalendarClock,
    Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';

interface BackupFile {
    filename: string;
    sizeKB: string;
    createdAt: string;
}

// Detect whether we're running on the online server
const isOnlineHost = typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

const BackupRestore: React.FC = () => {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [savingBackup, setSavingBackup] = useState(false);
    const [restoringBackup, setRestoringBackup] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [togglingAuto, setTogglingAuto] = useState(false);
    const [lastBackup, setLastBackup] = useState<BackupFile | null>(null);
    const [backupDir, setBackupDir] = useState('');

    const fetchBackups = useCallback(async () => {
        setLoadingList(true);
        try {
            const res = await api.get('/backup/list-local');
            setBackups(res.data.backups || []);
            setBackupDir(res.data.backupDir || '');
            if (res.data.backups?.length > 0) {
                setLastBackup(res.data.backups[0]);
                if (!selectedFile) setSelectedFile(res.data.backups[0].filename);
            }
        } catch (err) {
            console.error('Failed to list backups:', err);
        } finally {
            setLoadingList(false);
        }
    }, []);

    const fetchAutoSetting = useCallback(async () => {
        try {
            const res = await api.get('/backup/auto-backup-setting');
            setAutoBackupEnabled(res.data.enabled);
        } catch { }
    }, []);

    useEffect(() => {
        fetchBackups();
        if (isOnlineHost) fetchAutoSetting();
    }, [fetchBackups, fetchAutoSetting]);

    const handleBackupNow = async () => {
        const result = await Swal.fire({
            title: 'Create Backup?',
            html: `This will save a full backup of<br><b>all data, files & settings</b> to:<br><code style="font-size:12px;background:#f3f4f6;padding:3px 8px;border-radius:4px;">${backupDir || 'backup folder'}</code>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#7c3aed',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Backup Now',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;

        setSavingBackup(true);
        try {
            const res = await api.post('/backup/save-to-disk');
            await fetchBackups();
            Swal.fire({
                icon: 'success',
                title: 'Backup Saved!',
                html: `<b>${res.data.filename}</b><br>Size: ${res.data.sizeKB} KB`,
                confirmButtonColor: '#7c3aed',
                timer: 4000,
                timerProgressBar: true
            });
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Backup Failed',
                text: err.response?.data?.message || err.message || 'Unknown error',
                confirmButtonColor: '#7c3aed'
            });
        } finally {
            setSavingBackup(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedFile) {
            Swal.fire({ icon: 'warning', title: 'No Backup Selected', text: 'Please select a backup file to restore.', confirmButtonColor: '#7c3aed' });
            return;
        }

        const result = await Swal.fire({
            title: '⚠️ Confirm Restore',
            html: `<p>This will <b>permanently replace ALL current data</b> with:</p>
                   <code style="font-size:12px;background:#fef2f2;color:#991b1b;padding:4px 10px;border-radius:4px;display:block;margin:8px 0;">${selectedFile}</code>
                   <p style="color:#6b7280;font-size:13px;">This action cannot be undone.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '🔄 Yes, Restore Now',
            cancelButtonText: 'Cancel'
        });
        if (!result.isConfirmed) return;

        setRestoringBackup(true);
        try {
            await api.post('/backup/restore-from-disk', { filename: selectedFile }, { timeout: 1800000 });
            Swal.fire({
                icon: 'success',
                title: 'Restore Complete!',
                text: 'The application has been restored. Page will reload now.',
                confirmButtonColor: '#7c3aed',
                timer: 3000,
                timerProgressBar: true
            }).then(() => window.location.reload());
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Restore Failed',
                text: err.response?.data?.message || err.message || 'Unknown error',
                confirmButtonColor: '#7c3aed'
            });
        } finally {
            setRestoringBackup(false);
        }
    };

    const handleToggleAuto = async () => {
        const newState = !autoBackupEnabled;
        setTogglingAuto(true);
        try {
            await api.post('/backup/auto-backup-setting', { enabled: newState });
            setAutoBackupEnabled(newState);
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Failed to toggle auto-backup',
                text: err.response?.data?.message || err.message,
                confirmButtonColor: '#7c3aed'
            });
        } finally {
            setTogglingAuto(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch { return iso; }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Environment Banner */}
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${isOnlineHost
                ? 'bg-violet-50 border-violet-200 text-violet-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                {isOnlineHost ? <Server className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                <span>{isOnlineHost ? '📡 Online Server (www.qixport.com)' : '💻 Local Development (localhost)'}</span>
                <span className="ml-auto text-xs opacity-70">
                    Backup folder: <code className="bg-white/70 px-1 rounded">{backupDir || '...'}</code>
                </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* ─── BACKUP CARD ─── */}
                <Card className="border-violet-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-violet-700">
                            <div className="p-2 bg-violet-100 rounded-lg">
                                <HardDriveDownload className="h-5 w-5 text-violet-600" />
                            </div>
                            Backup
                        </CardTitle>
                        <CardDescription>
                            Save a complete snapshot of all data, uploads and settings to the backup folder.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {lastBackup && (
                            <div className="flex items-start gap-2 p-3 bg-violet-50 rounded-lg text-xs text-violet-700">
                                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Last backup</p>
                                    <p className="opacity-80">{formatDate(lastBackup.createdAt)}</p>
                                    <p className="opacity-70">{lastBackup.filename} · {lastBackup.sizeKB} KB</p>
                                </div>
                            </div>
                        )}
                        {!lastBackup && !loadingList && (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                                <AlertTriangle className="h-4 w-4" />
                                No backups found yet. Create your first backup below.
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Folder className="h-3.5 w-3.5" />
                            <span className="truncate">{backupDir || 'Loading...'}</span>
                        </div>

                        <Button
                            onClick={handleBackupNow}
                            disabled={savingBackup}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {savingBackup ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Backing up...</>
                            ) : (
                                <><HardDriveDownload className="h-4 w-4 mr-2" /> Backup Now</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* ─── RESTORE CARD ─── */}
                <Card className="border-red-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <RotateCcw className="h-5 w-5 text-red-600" />
                            </div>
                            Restore
                        </CardTitle>
                        <CardDescription>
                            Roll back the entire application to a previous backup.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                            <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                            <p><b>Warning:</b> Restoring will permanently overwrite all current data with the selected backup. This cannot be undone.</p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-600">Select backup to restore:</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedFile}
                                    onChange={(e) => setSelectedFile(e.target.value)}
                                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    {backups.length === 0 && <option value="">No backups available</option>}
                                    {backups.map(b => (
                                        <option key={b.filename} value={b.filename}>
                                            {formatDate(b.createdAt)} · {b.sizeKB} KB
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={fetchBackups}
                                    disabled={loadingList}
                                    className="shrink-0"
                                    title="Refresh list"
                                >
                                    <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        <Button
                            onClick={handleRestore}
                            disabled={restoringBackup || !selectedFile || backups.length === 0}
                            variant="destructive"
                            className="w-full"
                        >
                            {restoringBackup ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Restoring...</>
                            ) : (
                                <><RotateCcw className="h-4 w-4 mr-2" /> Restore Selected Backup</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ─── AUTO-BACKUP CARD (online only) ─── */}
            {isOnlineHost && (
                <Card className="border-blue-100 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <CalendarClock className="h-5 w-5 text-blue-600" />
                            </div>
                            Daily Auto-Backup
                            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${autoBackupEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {autoBackupEnabled ? 'Active' : 'Inactive'}
                            </span>
                        </CardTitle>
                        <CardDescription>
                            Automatically saves a backup every day at midnight (IST) to the server's backup folder.
                            Old backups are pruned after 30 are stored.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-blue-800">Schedule: Every day at 12:00 AM IST</p>
                                <p className="text-xs text-blue-600">Saves to: <code className="bg-white/80 px-1 rounded">{backupDir}/auto-backup-*.zip</code></p>
                                <p className="text-xs text-blue-500">Retains last 30 backups automatically</p>
                            </div>
                            <button
                                onClick={handleToggleAuto}
                                disabled={togglingAuto}
                                className="flex items-center gap-2 text-sm font-medium focus:outline-none"
                                title={autoBackupEnabled ? 'Click to disable' : 'Click to enable'}
                            >
                                {togglingAuto ? (
                                    <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                                ) : autoBackupEnabled ? (
                                    <ToggleRight className="h-10 w-10 text-green-500" />
                                ) : (
                                    <ToggleLeft className="h-10 w-10 text-gray-400" />
                                )}
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Backup List ─── */}
            {backups.length > 0 && (
                <Card className="border-gray-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Backup History ({backups.length} files)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                            {backups.map((b, i) => (
                                <div
                                    key={b.filename}
                                    onClick={() => setSelectedFile(b.filename)}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-colors
                                        ${selectedFile === b.filename
                                            ? 'bg-violet-50 border-violet-300'
                                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {selectedFile === b.filename && (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                                        )}
                                        <div>
                                            <p className="font-medium text-gray-700">{b.filename}</p>
                                            <p className="text-gray-400">{formatDate(b.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-2">
                                        <p className="text-gray-500">{b.sizeKB} KB</p>
                                        {i === 0 && <span className="text-violet-500 font-semibold">Latest</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default BackupRestore;
