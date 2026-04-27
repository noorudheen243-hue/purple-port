import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    FolderOpen,
    CalendarClock,
    Shield,
    Trash2,
    Square,
    CheckSquare,
    Download,
    Upload,
    Globe,
    Laptop,
    MapPin,
    HardDrive,
    CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';

// ─── Types ───────────────────────────────────────────────────────────────────
interface BackupFile {
    filename: string;
    sizeKB: string;
    createdAt: string;
    type?: string;
}

// ─── Environment detection ────────────────────────────────────────────────────
const isOnlineHost = typeof window !== 'undefined' &&
    !['localhost', '127.0.0.1'].includes(window.location.hostname);

// File System Access API — Chrome/Edge 86+ only
const supportsFilePicker = typeof window !== 'undefined' &&
    'showSaveFilePicker' in window &&
    'showOpenFilePicker' in window;

// ─── Component ───────────────────────────────────────────────────────────────
const BackupRestore: React.FC = () => {
    // Online Server State
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
    const [togglingAuto, setTogglingAuto] = useState(false);
    const [serverBackupFolder, setServerBackupFolder] = useState<string>('');

    // Restore Selection State
    const [selectedRestoreFile, setSelectedRestoreFile] = useState<string>('');
    const [restoring, setRestoring] = useState(false);

    // Local-Upload-Restore State
    const [localFileToUpload, setLocalFileToUpload] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [stagedFilename, setStagedFilename] = useState<string | null>(null);

    // Bulk Delete State
    const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);

    // Backup Options
    const [includeMedia, setIncludeMedia] = useState(false);

    // ─── Data Fetching ───────────────────────────────────────────────────────
    const fetchBackups = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/backup/list-local');
            setBackups(res.data.backups || []);
            setServerBackupFolder(res.data.backupDir || '');
        } catch (err) {
            console.error('Failed to fetch backups:', err);
        } finally {
            setLoading(false);
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

    // ─── Actions: Backups ────────────────────────────────────────────────────

    /** Creates a backup and saves it to the SERVER disk. */
    const handleCreateOnlineBackup = async () => {
        setLoading(true);
        try {
            const res = await api.post('/backup/save-to-disk', { 
                type: 'online',
                includeUploads: includeMedia 
            });
            Swal.fire({
                icon: 'success',
                title: 'Backup Created',
                text: `Saved to server: ${res.data.filename}`,
                confirmButtonColor: '#7c3aed'
            });
            fetchBackups();
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Backup Failed', text: err.response?.data?.message || err.message });
        } finally {
            setLoading(false);
        }
    };

    /** Toggle daily auto-backup (online only) */
    const handleToggleAuto = async () => {
        const newState = !autoBackupEnabled;
        setTogglingAuto(true);
        try {
            await api.post('/backup/auto-backup-setting', { enabled: newState });
            setAutoBackupEnabled(newState);
            Swal.fire({
                title: newState ? 'Auto-Backup Enabled' : 'Auto-Backup Disabled',
                text: newState ? 'Daily backups will be saved at midnight IST.' : 'Automatic backups are now paused.',
                icon: 'info',
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: 'top-right'
            });
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message || err.message, confirmButtonColor: '#7c3aed' });
        } finally {
            setTogglingAuto(false);
        }
    };

    /** 
     * NEW: Manual Backup to Local PC Logic
     * Step 1: Call showSaveFilePicker IMMEDIATELY to satisfy "user gesture" security.
     * Step 2: Tell server to create a fresh backup.
     * Step 3: Stream and write to the picker handle (or fallback to standard download).
     */
    const handleManualLocalBackup = async () => {
        let fileHandle: any = null;

        // 1. Trigger File Picker IMMEDIATELY within the click handler
        if (supportsFilePicker) {
            try {
                // Use a local suggested name since we don't have server response yet
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const suggestedName = `backup-manual-${timestamp}.zip`;

                fileHandle = await (window as any).showSaveFilePicker({
                    suggestedName,
                    types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
                });
            } catch (e: any) {
                if (e.name === 'AbortError') return; // User simply clicked cancel; stop
                console.error('Picker error, falling back to standard download:', e);
            }
        }

        // 2. Start the heavy work (shows loading state)
        setLoading(true);
        try {
            // Trigger fresh backup generation
            const buildRes = await api.post('/backup/save-to-disk', { 
                type: 'manual',
                includeUploads: includeMedia 
            });
            const filename = buildRes.data.filename;

            // Fetch the resulting blob
            const response = await api.get(`/backup/download/${filename}`, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: 'application/zip' });

            if (fileHandle) {
                // If user picked a path via "Save As", write to it
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                Swal.fire({
                    icon: 'success',
                    title: 'Saved to Local PC',
                    text: 'Backup successfully written to your selected folder.',
                    confirmButtonColor: '#10b981'
                });
            } else {
                // Fallback: Use standard browser download logic
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                Swal.fire({
                    icon: 'success',
                    title: 'Download Started',
                    text: 'Backup saved to your default Downloads folder.',
                    confirmButtonColor: '#10b981'
                });
            }
            fetchBackups(); // Refresh history
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Backup Failed', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    // ─── Actions: Restores ───────────────────────────────────────────────────

    /** Restore from a file already on the SERVER */
    const handleRestoreOnline = async () => {
        if (!selectedRestoreFile) return;

        const result = await Swal.fire({
            title: 'Confirm Database Restore?',
            text: `Restoring from "${selectedRestoreFile}" will completely overwrite the current database. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Restore Now'
        });

        if (!result.isConfirmed) return;

        setRestoring(true);
        try {
            const res = await api.post('/backup/restore-from-disk', { filename: selectedRestoreFile });
            await Swal.fire({ icon: 'success', title: 'System Restored', text: res.data.message, confirmButtonColor: '#7c3aed' });
            window.location.reload();
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Restore Failed', text: err.response?.data?.message || err.message });
        } finally {
            setRestoring(false);
        }
    };

    /** 
     * Restore from a file on the LOCAL PC
     * Step 1: Upload the file to server (/api/backup/upload)
     * Step 2: Trigger restoration on the uploaded file
     */
    const handleRestoreFromLocal = async () => {
        if (!localFileToUpload) return;

        const result = await Swal.fire({
            title: 'Confirm Local Restore?',
            text: `Uploading and restoring "${localFileToUpload.name}" will replace all current data. Proceed?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Yes, Upload & Restore'
        });

        if (!result.isConfirmed) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', localFileToUpload);

            // Step 1: Upload
            const upRes = await api.post('/backup/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const filename = upRes.data.filename;

            // Step 2: Restore recorded file
            const res = await api.post('/backup/restore-from-disk', { filename });
            await Swal.fire({ icon: 'success', title: 'System Restored', text: res.data.message });
            window.location.reload();
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Local Restore Failed', text: err.response?.data?.message || err.message });
        } finally {
            setUploading(false);
        }
    };

    /** File browse handler for local restoration */
    const handleBrowseForRestore = async () => {
        if (supportsFilePicker) {
            try {
                const [handle] = await (window as any).showOpenFilePicker({
                    types: [{ description: 'Backup Files', accept: { 'application/zip': ['.zip'] } }],
                    multiple: false
                });
                const file = await handle.getFile();
                setLocalFileToUpload(file);
            } catch (e: any) {
                if (e.name === 'AbortError') return;
                console.error(e);
            }
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.zip';
            input.onchange = (e: any) => {
                if (e.target.files?.[0]) setLocalFileToUpload(e.target.files[0]);
            };
            input.click();
        }
    };

    // ─── Actions: Multi-Delete ───────────────────────────────────────────────
    const handleBulkDelete = async () => {
        const result = await Swal.fire({
            title: `Delete ${selectedForDelete.length} backups?`,
            text: 'These files will be permanently removed from the server.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Delete Permanently'
        });
        if (!result.isConfirmed) return;

        try {
            await api.post('/backup/delete-multiple', { filenames: selectedForDelete });
            setSelectedForDelete([]);
            fetchBackups();
            Swal.fire({ icon: 'success', title: 'Deleted', text: 'Backups removed successfully.', timer: 1500 });
        } catch (err: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || err.message });
        }
    };

    const toggleSelect = (filename: string) => {
        setSelectedForDelete(prev =>
            prev.includes(filename) ? prev.filter(f => f !== filename) : [...prev, filename]
        );
    };

    // ─── Render Helpers ──────────────────────────────────────────────────────
    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    // ─── UI ───────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 animate-in fade-in duration-700">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl text-white shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                        <HardDriveDownload className="h-7 w-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Backup &amp; Restore Module</h2>
                        <div className="flex items-center gap-2 text-violet-100 text-sm mt-1">
                            {isOnlineHost ? <Globe className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                            <span>{isOnlineHost ? 'Running on Online Hosting (qixport.com)' : 'Running on Local Development (localhost)'}</span>
                            <span className="h-1 w-1 bg-white/40 rounded-full mx-1"></span>
                            <span className="opacity-80">Server Path:</span>
                            <code className="bg-black/20 px-1.5 py-0.5 rounded text-xs">{serverBackupFolder || 'Detecting...'}</code>
                        </div>
                    </div>
                </div>

                {supportsFilePicker && (
                    <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full text-xs font-semibold backdrop-blur-sm">
                        <FolderOpen className="h-4 w-4 text-green-300" />
                        <span className="text-green-100">Folder Picker Available on this Browser</span>
                    </div>
                )}
            </div>

            {/* ── MAIN WORKFLOW AREA ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                {/* ── 1. CREATE BACKUP ── */}
                <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl">
                    <CardHeader className="bg-gray-50 border-b p-6">
                        <CardTitle className="flex items-center gap-3 text-gray-800">
                            <div className="p-2 bg-violet-100 rounded-lg">
                                <Download className="h-6 w-6 text-violet-600" />
                            </div>
                            Create New Backup
                        </CardTitle>
                        <CardDescription>
                            Generate a snapshot of your system. Choose whether to include heavy media files or just the database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">

                        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <HardDrive className="h-5 w-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-violet-900 leading-tight">Backup Strategy</h4>
                                        <p className="text-xs text-violet-700/70">Toggle including media files (Photos/Videos)</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${includeMedia ? 'text-violet-600' : 'text-gray-400'}`}>
                                        {includeMedia ? 'Full (1.2 GB)' : 'Fast (DB Only)'}
                                    </span>
                                    <button 
                                        onClick={() => setIncludeMedia(!includeMedia)}
                                        className="focus:outline-none"
                                    >
                                        {includeMedia ? 
                                            <ToggleRight className="h-9 w-9 text-violet-600" /> : 
                                            <ToggleLeft className="h-9 w-9 text-gray-300" />
                                        }
                                    </button>
                                </div>
                            </div>
                            
                            {includeMedia && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl animate-in fade-in slide-in-from-top-1 duration-300">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-amber-800 leading-relaxed">
                                        <b>Warning:</b> Including 1.2 GB of media will take several minutes to generate and download. 
                                        Fast mode (DB Only) is instantaneous and recommended for daily backups.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Manual Local Option */}
                            <div className="group relative p-6 border-2 border-dashed border-violet-200 hover:border-violet-500 hover:bg-violet-50 rounded-2xl transition-all duration-300 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-violet-100 group-hover:bg-violet-600 rounded-full transition-colors">
                                    <Monitor className="h-8 w-8 text-violet-600 group-hover:text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">Save to Local Computer</h4>
                                    <p className="text-sm text-gray-500 mt-1 px-4">
                                        Generates on server and prompts you to select a path on your PC to download.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleManualLocalBackup}
                                    disabled={loading}
                                    className="w-full h-12 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 rounded-xl"
                                >
                                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <HardDriveDownload className="h-4 w-4 mr-2" />}
                                    Manual Backup to PC
                                </Button>
                                {supportsFilePicker && <span className="text-[10px] uppercase tracking-wider text-violet-400 font-bold">Use Specified Folder Path</span>}
                            </div>

                            {/* Online Server Option */}
                            <div className="group relative p-6 border-2 border-dashed border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-2xl transition-all duration-300 text-center flex flex-col items-center gap-4">
                                <div className="p-4 bg-indigo-100 group-hover:bg-indigo-600 rounded-full transition-colors">
                                    <Server className="h-8 w-8 text-indigo-600 group-hover:text-white" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg">Save on Online Server</h4>
                                    <p className="text-sm text-gray-500 mt-1 px-4">
                                        Stores the snapshot in the server's backup folder for quick online restoration.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleCreateOnlineBackup}
                                    disabled={loading}
                                    variant="outline"
                                    className="w-full h-12 border-indigo-200 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                                >
                                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Cloud className="h-4 w-4 mr-2" />}
                                    Save Online Backup
                                </Button>
                            </div>
                        </div>

                        {/* Daily Auto Card */}
                        {isOnlineHost && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="p-2.5 bg-blue-100 rounded-xl h-fit">
                                        <CalendarClock className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-blue-900">Daily Auto-Backup</h4>
                                        <p className="text-sm text-blue-700/70">Midnight IST cron job. Retains last 30 backups.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold uppercase ${autoBackupEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                                        {autoBackupEnabled ? 'Active' : 'Paused'}
                                    </span>
                                    <button 
                                        onClick={handleToggleAuto}
                                        disabled={togglingAuto}
                                        className="focus:outline-none"
                                    >
                                        {autoBackupEnabled ? 
                                            <ToggleRight className="h-9 w-9 text-blue-600" /> : 
                                            <ToggleLeft className="h-9 w-9 text-gray-300" />
                                        }
                                    </button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── 2. RESTORE DATABASE ── */}
                <Card className="border-0 shadow-2xl overflow-hidden rounded-3xl">
                    <CardHeader className="bg-gray-50 border-b p-6">
                        <CardTitle className="flex items-center gap-3 text-gray-800">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <RotateCcw className="h-6 w-6 text-orange-600" />
                            </div>
                            Restore Database
                        </CardTitle>
                        <CardDescription>
                            Revert the system to a previous state. You can upload a file from your computer or pick one from the server's history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">

                        <div className="space-y-6">
                            {/* Option A: Restore from Local PC */}
                            <div className="p-6 border-2 border-dashed border-orange-200 rounded-2xl bg-orange-50/30">
                                <h4 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                                    <Laptop className="h-5 w-5" /> 1. Restore from Local Backup
                                </h4>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Button 
                                                variant="outline"
                                                onClick={handleBrowseForRestore}
                                                className="w-full h-14 justify-start pl-12 rounded-xl bg-white border-orange-200 text-gray-600 italic font-normal hover:bg-orange-50 hover:border-orange-400 transition-all"
                                            >
                                                <Folder className="absolute left-4 h-6 w-6 text-orange-500" />
                                                {localFileToUpload ? localFileToUpload.name : (supportsFilePicker ? 'Browse Local PC (Specific Path)...' : 'Choose local .zip file...')}
                                            </Button>
                                            {localFileToUpload && (
                                                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                                                    <CheckCircle className="h-3 w-3" /> Ready
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleRestoreFromLocal}
                                        disabled={!localFileToUpload || uploading}
                                        className="h-12 bg-orange-600 hover:bg-orange-700 rounded-xl shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
                                    >
                                        {uploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                        {uploading ? 'Uploading & Restoring...' : 'Upload & Restore from Local'}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center">
                                <div className="h-px bg-gray-200 flex-1"></div>
                                <span className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">OR</span>
                                <div className="h-px bg-gray-200 flex-1"></div>
                            </div>

                            {/* Option B: Restore from Online History */}
                            <div className="p-6 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/30">
                                <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                                    <Clock className="h-5 w-5" /> 2. Restore from Online History
                                </h4>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select 
                                                value={selectedRestoreFile}
                                                onChange={(e) => setSelectedRestoreFile(e.target.value)}
                                                className="w-full h-14 pl-12 pr-10 appearance-none bg-white border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-600 text-gray-700 transition-all font-medium"
                                            >
                                                <option value="">Select a backup file from the server list...</option>
                                                {backups.map(b => (
                                                    <option key={b.filename} value={b.filename}>
                                                        {b.filename} ({b.sizeKB} KB)
                                                    </option>
                                                ))}
                                            </select>
                                            <Server className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500" />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <RotateCcw className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={handleRestoreOnline}
                                        disabled={!selectedRestoreFile || restoring}
                                        className="h-12 bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-all disabled:opacity-50"
                                    >
                                        {restoring ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                        Restore Selected Online Backup
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </CardContent>
                </Card>

            </div>

            {/* ── SERVER BACKUP HISTORY TABLE ── */}
            <Card className="border-0 shadow-xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-gray-800 text-white p-6 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-indigo-400" />
                            Server Backup History
                        </CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                            List of all backups currently stored in <code className="bg-black/40 px-1 rounded text-gray-300">{serverBackupFolder || '/var/backups'}</code>
                        </CardDescription>
                    </div>
                    {selectedForDelete.length > 0 && (
                        <div className="flex items-center gap-4 animate-in slide-in-from-right duration-500">
                            <span className="text-sm font-bold text-orange-400">{selectedForDelete.length} selected</span>
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={handleBulkDelete}
                                className="bg-red-600 hover:bg-red-700 rounded-lg shadow-lg shadow-red-900/50"
                            >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Permanently
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/50 text-[11px] uppercase tracking-widest text-gray-500 font-black">
                                    <th className="px-6 py-4 w-12">
                                        <button 
                                            onClick={() => setSelectedForDelete(selectedForDelete.length === backups.length ? [] : backups.map(b => b.filename))}
                                            className="text-gray-400 hover:text-indigo-600"
                                        >
                                            {selectedForDelete.length === backups.length && backups.length > 0 ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Filename</th>
                                    <th className="px-6 py-4">Created At</th>
                                    <th className="px-6 py-4">Size</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {backups.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                            No backups found on server disk.
                                        </td>
                                    </tr>
                                ) : (
                                    backups.map((backup) => (
                                        <tr key={backup.filename} className={`hover:bg-violet-50/30 transition-colors ${selectedForDelete.includes(backup.filename) ? 'bg-violet-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button onClick={() => toggleSelect(backup.filename)} className="text-gray-300 hover:text-indigo-600 transition-colors">
                                                    {selectedForDelete.includes(backup.filename) ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <Square className="h-5 w-5" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-gray-700">{backup.filename}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">{formatDate(backup.createdAt)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[11px] font-bold">
                                                    {backup.sizeKB} KB
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight ${
                                                    backup.type === 'auto' ? 'bg-blue-100 text-blue-700' : 
                                                    backup.type === 'online' ? 'bg-indigo-100 text-indigo-700' : 
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {backup.type || 'Manual'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => {
                                                        const url = `${api.defaults.baseURL}/backup/download/${backup.filename}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="text-violet-600 hover:text-violet-700 hover:bg-violet-100 rounded-lg"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── FOOTER WARNING ── */}
            <div className="flex items-center gap-4 p-5 bg-orange-50 border border-orange-200 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-orange-600 shrink-0" />
                <div className="text-sm text-orange-800">
                    <p className="font-bold">Important Security Note:</p>
                    <p className="opacity-90">Only **Developer Admins** have access to these core database utilities. Restoring a database file will permanently replace all customers, tasks, financial data, and system logs. Always keep a local copy of your most recent backup on your personal computer.</p>
                </div>
            </div>

        </div>
    );
};

/** Shorthand for Cloud icon as it was missing from imports */
const Cloud: React.FC<any> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.4-1.9-4.3-4.3-4.4-.3-2.6-2.4-4.6-5-4.6-1.8 0-3.4 1-4.3 2.5C6.1 7.4 4 9.5 4 12c0 2.8 2.2 5 5 5h8.5Z"/>
    </svg>
);

export default BackupRestore;
