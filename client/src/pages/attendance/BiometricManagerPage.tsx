import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Activity,
    Server,
    Users,
    Clock,
    RefreshCw,
    Power,
    Trash2,
    Shield,
    CheckCircle,
    AlertCircle,
    Fingerprint,
    ScanLine,
    Download,
    Upload,
    AlertTriangle,
    Wifi
} from 'lucide-react';
// Layout is provided by Dashboard wrapper
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';

// API Functions
const getDeviceInfo = async () => (await api.get('/attendance/biometric/info')).data;
const getDeviceUsers = async () => (await api.get('/attendance/biometric/users')).data;
const restartDevice = async () => (await api.post('/attendance/biometric/restart')).data;
const syncTime = async () => (await api.post('/attendance/biometric/sync-time')).data;
const clearLogs = async () => (await api.post('/attendance/biometric/clear-logs')).data;
const addUser = async (data: any) => (await api.post('/attendance/biometric/users/add', data)).data;
const deleteUser = async (uid: any) => (await api.post('/attendance/biometric/users/delete', { uid })).data;
const uploadUsers = async () => (await api.post('/attendance/biometric/users/upload')).data;
const importUsers = async () => (await api.post('/attendance/biometric/users/import')).data;
const getAuditData = async () => (await api.get('/attendance/biometric/audit')).data;
const enrollUser = async (data: any) => (await api.post('/attendance/biometric/enroll', data)).data;
const syncTemplates = async () => (await api.post('/attendance/biometric/sync-templates')).data;

const BiometricManagerPage = () => {
    const queryClient = useQueryClient();
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'console' | 'audit'>('console');

    // 1. Fetch Device Info (Robust)
    const { data: deviceInfo, isLoading: infoLoading, refetch: refetchInfo, isRefetching } = useQuery({
        queryKey: ['biometric-info'],
        queryFn: getDeviceInfo,
        refetchInterval: 30000 // Poll every 30s
    });

    // Device Status Logic: Use "ONLINE" if backend says so OR if we have valid data even if status says OFFLINE implies partial connection
    const isOnline = deviceInfo?.status === 'ONLINE' || (deviceInfo?.userCount !== undefined && deviceInfo?.userCount > 0);

    // 2. Fetch Users
    const { data: deviceUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['biometric-users'],
        queryFn: getDeviceUsers
    });

    // Audit Query (Manual Trigger mainly)
    const { data: auditData, isLoading: auditLoading, refetch: refetchAudit, isRefetching: isAuditing } = useQuery({
        queryKey: ['biometric-audit'],
        queryFn: getAuditData,
        enabled: false, // Trigger manually
        staleTime: Infinity // Keep data fresh until manual refetch
    });

    const addToLog = (msg: string) => setActionLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

    // Mutations
    const restartMutation = useMutation({
        mutationFn: restartDevice,
        onSuccess: (data) => addToLog(`Success: ${data.message}`),
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    const syncTimeMutation = useMutation({
        mutationFn: syncTime,
        onSuccess: (data) => addToLog(`Success: ${data.message}`),
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    const clearLogsMutation = useMutation({
        mutationFn: clearLogs,
        onSuccess: (data) => addToLog(`Success: ${data.message}`),
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    // User Mgmt Mutations
    const addUserMutation = useMutation({
        mutationFn: addUser,
        onSuccess: (data) => {
            addToLog(`Success: ${data.message}`);
            refetchUsers();
        },
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: (data) => {
            addToLog(`Success: ${data.message}`);
            refetchUsers();
            refetchAudit();
        },
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    const uploadUsersMutation = useMutation({
        mutationFn: uploadUsers,
        onSuccess: (data) => {
            addToLog(`Upload Success: ${data.message}`);
            refetchUsers(); // Refresh the list from device
            refetchAudit();
        },
        onError: (err: any) => addToLog(`Upload Error: ${err.response?.data?.error || err.message}`)
    });

    const importUsersMutation = useMutation({
        mutationFn: importUsers,
        onSuccess: (data) => {
            addToLog(`Import Success: ${data.message}`);
            refetchUsers();
            refetchAudit();
        },
        onError: (err: any) => addToLog(`Import Error: ${err.response?.data?.error || err.message}`)
    });

    const enrollMutation = useMutation({
        mutationFn: enrollUser,
        onSuccess: (data) => addToLog(`Enrollment Triggered: ${data.message}`),
        onError: (err: any) => addToLog(`Enrollment Error: ${err.response?.data?.error || err.message}`)
    });

    const syncTemplatesMutation = useMutation({
        mutationFn: syncTemplates,
        onSuccess: (data) => addToLog(`Template Sync: ${data.message}`),
        onError: (err: any) => addToLog(`Sync Error: ${err.response?.data?.error || err.message}`)
    });


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Biometric Device Console</h2>
                    <p className="text-muted-foreground">Manage ESSL device connection and data</p>
                </div>

                {/* Header Status Badge */}
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-4">
                        <button
                            onClick={() => setActiveTab('console')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'console' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Device Console
                        </button>
                        <button
                            onClick={() => setActiveTab('audit')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'audit' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Sync Audit
                        </button>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => refetchInfo()} disabled={infoLoading || isRefetching}>
                        <RefreshCw className={`w-4 h-4 ${infoLoading || isRefetching ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {activeTab === 'console' && (
                <>
                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-gray-700">Device Specs</h3>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Name:</span>
                                    <span className="font-medium text-gray-900">{deviceInfo?.deviceName || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Serial:</span>
                                    <span className="font-medium text-gray-900">{deviceInfo?.serialNumber || '-'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Platform:</span>
                                    <span className="font-medium text-gray-900">{deviceInfo?.platform || '-'}</span>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Users className="w-5 h-5 text-purple-500" />
                                <h3 className="font-semibold text-gray-700">Capacity Stats</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="bg-purple-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600">{deviceInfo?.userCount ?? '-'}</div>
                                    <div className="text-xs text-purple-400">Users Enrolled</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">{deviceInfo?.logCount ?? '-'}</div>
                                    <div className="text-xs text-blue-400">Attendance Logs</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-gray-700">Admin Actions</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-xs"
                                    onClick={() => syncTimeMutation.mutate()}
                                    disabled={syncTimeMutation.isPending}
                                >
                                    <Clock className="w-3 h-3 mr-2" /> Sync Time
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-xs text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                        if (window.confirm('Restart Device? This will take a moment.')) restartMutation.mutate();
                                    }}
                                    disabled={restartMutation.isPending}
                                >
                                    <Power className="w-3 h-3 mr-2" /> Restart
                                </Button>

                                <div className="col-span-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                                    <Button
                                        className="w-full justify-center text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                                        onClick={() => {
                                            if (window.confirm('Import User Data From Device?\n\nThis will scan users on the device and update local records if they match existing staff numbers.')) importUsersMutation.mutate();
                                        }}
                                        disabled={importUsersMutation.isPending}
                                    >
                                        <Server className="w-3 h-3 mr-2" /> Import Users
                                    </Button>
                                    <Button
                                        className="w-full justify-center text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                            if (window.confirm('Upload User Data To Device?\n\nThis will overwrite matching users on the device with data from the database.')) uploadUsersMutation.mutate();
                                        }}
                                        disabled={uploadUsersMutation.isPending}
                                    >
                                        <Users className="w-3 h-3 mr-2" /> Upload Users
                                    </Button>
                                </div>

                                <div className="col-span-2 pt-2 border-t border-gray-100 flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-center text-xs"
                                        onClick={() => {
                                            const uid = prompt('Enter User ID (UID):');
                                            const name = prompt('Enter Name:');
                                            const userid = prompt('Enter Device User ID (e.g. QIX001):');
                                            if (uid && name && userid) addUserMutation.mutate({ uid: parseInt(uid), name, userId: userid });
                                        }}
                                    >
                                        <Users className="w-3 h-3 mr-2" /> Add (Manual)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-center text-xs text-red-600 hover:bg-red-50"
                                        onClick={() => {
                                            if (window.confirm('DANGER: Clear ALL logs from device? This cannot be undone.')) clearLogsMutation.mutate();
                                        }}
                                        disabled={clearLogsMutation.isPending}
                                    >
                                        <Trash2 className="w-3 h-3 mr-2" /> Clear Logs
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Console Output (Logs) */}
                    {actionLog.length > 0 && (
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-40 overflow-y-auto shadow-inner">
                            <div className="font-bold text-gray-500 mb-2 uppercase tracking-wide">Console Output</div>
                            {actionLog.map((log, i) => (
                                <div key={i}>{log}</div>
                            ))}
                        </div>
                    )}

                    {/* Device Users Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Enrolled Users</h3>
                            <span className="text-xs text-gray-500">Fetched directly from device memory</span>
                        </div>
                        {usersLoading ? (
                            <div className="p-8 text-center text-gray-400">Loading users from device...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-3">User ID</th>
                                            <th className="px-6 py-3">Name</th>
                                            <th className="px-6 py-3">Role</th>

                                            <th className="px-6 py-3">UID</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {deviceUsers?.data?.map((u: any, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium">{u.userId}</td>
                                                <td className="px-6 py-3">{u.name || 'Unknown'}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${u.role === 0 ? 'bg-gray-100' : 'bg-purple-100 text-purple-700'}`}>
                                                        {u.role === 0 ? 'User' : 'Admin'}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-3 text-gray-400">{u.uid}</td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-2">

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                                                            title="Edit User on Device"
                                                            onClick={() => {
                                                                const newName = prompt('Enter New Name:', u.name);
                                                                const newRole = prompt('Enter Role (0=User, 14=Admin):', String(u.role));
                                                                if (newName && newRole) {
                                                                    api.put('/attendance/biometric/users/edit', {
                                                                        staffNumber: u.userId,
                                                                        name: newName,
                                                                        role: parseInt(newRole)
                                                                    }).then(() => {
                                                                        alert('Success');
                                                                        refetchUsers();
                                                                    }).catch((e: any) => alert(e.response?.data?.message || 'Failed'));
                                                                }
                                                            }}
                                                        >
                                                            <span className="sr-only">Edit</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                                            title="Delete User from Device"
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to delete ${u.userId} (${u.name}) from the device? This cannot be undone.`)) {
                                                                    api.delete(`/attendance/biometric/users/${u.userId}`)
                                                                        .then(() => {
                                                                            alert('Deleted Successfully');
                                                                            refetchUsers();
                                                                        })
                                                                        .catch((e: any) => alert(e.response?.data?.message || 'Failed'));
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!deviceUsers?.data || deviceUsers.data.length === 0) && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    No users found or connection failed.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* AUDIT VIEW */}
            {activeTab === 'audit' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Synchronization Status</h3>
                                <p className="text-sm text-gray-500">Compare application staff with device users</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setActionLog(p => ["Syncing logs (this may take 30s)...", ...p]);
                                        api.post('/attendance/biometric/sync-logs', {}, { timeout: 60000 }).then(res => {
                                            setActionLog(p => ["Success: " + res.data.message, ...p]);
                                        }).catch(err => {
                                            console.error("Sync Error:", err);
                                            setActionLog(p => ["Sync failed: " + (err.response?.data?.error || err.message || "Timeout"), ...p]);
                                        });
                                    }}
                                    disabled={isAuditing || auditLoading}
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    Sync Logs
                                </Button>
                                <Button onClick={() => { setActionLog(p => ["Scan started...", ...p]); refetchAudit(); }} disabled={isAuditing || auditLoading}>
                                    <RefreshCw className={`w-4 h-4 mr-2 ${isAuditing || auditLoading ? 'animate-spin' : ''}`} />
                                    {isAuditing || auditLoading ? 'Scanning...' : 'Run Audit Scan'}
                                </Button>
                            </div>
                        </div>

                        {(isAuditing || auditLoading) && <div className="text-center py-10 text-gray-500">Scanning device and database...</div>}

                        {!isAuditing && !auditLoading && auditData?.audit && (
                            <div className="space-y-8">
                                {/* 1. Missing on Device */}
                                <div className="border border-yellow-200 bg-yellow-50 rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 bg-yellow-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-yellow-800 font-semibold">
                                            <AlertCircle className="w-5 h-5" />
                                            Active Staff Missing on Device ({auditData.audit.missingOnDevice.length})
                                        </div>
                                        {auditData.audit.missingOnDevice.length > 0 && (
                                            <Button size="sm" className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => {
                                                if (window.confirm("Upload ALL visible users to device?")) uploadUsersMutation.mutate();
                                            }}>
                                                Push All to Device
                                            </Button>
                                        )}
                                    </div>
                                    {auditData.audit.missingOnDevice.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-yellow-700 bg-yellow-50/50">
                                                <tr>
                                                    <th className="px-4 py-2">Staff ID</th>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">Dep</th>
                                                    <th className="px-4 py-2 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditData.audit.missingOnDevice.map((m: any) => (
                                                    <tr key={m.staffId} className="border-t border-yellow-200">
                                                        <td className="px-4 py-2 font-mono">{m.staffId}</td>
                                                        <td className="px-4 py-2">{m.name}</td>
                                                        <td className="px-4 py-2 text-xs">{m.department}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <Button size="sm" variant="ghost" className="text-yellow-700 hover:text-yellow-900 h-6"
                                                                onClick={() => addUserMutation.mutate({ uid: parseInt(m.staffId.match(/\d+/)[0]), name: m.name, userId: m.staffId })}
                                                            >
                                                                Push
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-4 text-center text-yellow-600 text-sm">All active staff are present on the device.</div>
                                    )}
                                </div>

                                {/* 2. Orphans on Device */}
                                <div className="border border-red-200 bg-red-50 rounded-lg overflow-hidden">
                                    <div className="px-4 py-3 bg-red-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2 text-red-800 font-semibold">
                                            <AlertCircle className="w-5 h-5" />
                                            Extra Users on Device ({auditData.audit.orphanOnDevice.length})
                                        </div>
                                    </div>
                                    <div className="p-2 text-xs text-red-600 px-4">These users exist on the fingerprint scanner but NOT in the active staff list.</div>

                                    {auditData.audit.orphanOnDevice.length > 0 ? (
                                        <table className="w-full text-sm">
                                            <thead className="text-left text-red-700 bg-red-50/50">
                                                <tr>
                                                    <th className="px-4 py-2">Device ID</th>
                                                    <th className="px-4 py-2">Name</th>
                                                    <th className="px-4 py-2">UID</th>
                                                    <th className="px-4 py-2 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditData.audit.orphanOnDevice.map((o: any) => (
                                                    <tr key={o.userId} className="border-t border-red-200">
                                                        <td className="px-4 py-2 font-mono">{o.userId}</td>
                                                        <td className="px-4 py-2">{o.name}</td>
                                                        <td className="px-4 py-2 text-gray-500">{o.uid}</td>
                                                        <td className="px-4 py-2 text-right">
                                                            <Button size="sm" variant="ghost" className="text-red-700 hover:text-red-900 h-6"
                                                                onClick={() => {
                                                                    if (window.confirm(`Delete ${o.name}?`)) deleteUserMutation.mutate(o.userId);
                                                                }}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="p-4 text-center text-red-600 text-sm">No extra users found on device.</div>
                                    )}
                                </div>

                                {/* 3. Matches */}
                                <div className="border border-green-200 bg-green-50 rounded-lg">
                                    <div className="px-4 py-3 bg-green-100 flex items-center gap-2 text-green-800 font-semibold">
                                        <CheckCircle className="w-5 h-5" />
                                        Synced Users ({auditData.audit.matched.length})
                                    </div>
                                    {auditData.audit.matched.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="text-left text-green-700 bg-green-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2">ID</th>
                                                        <th className="px-4 py-2">Name (DB)</th>
                                                        <th className="px-4 py-2">Name (Device)</th>
                                                        <th className="px-4 py-2">UID</th>
                                                        <th className="px-4 py-2">Fingers</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {auditData.audit.matched.map((m: any) => (
                                                        <tr key={m.staffId} className="border-t border-green-100">
                                                            <td className="px-4 py-2 font-mono">{m.staffId}</td>
                                                            <td className="px-4 py-2">{m.dbName}</td>
                                                            <td className="px-4 py-2 text-gray-600">{m.deviceUser.name}</td>
                                                            <td className="px-4 py-2 text-gray-400">{m.deviceUser.uid}</td>
                                                            <td className="px-4 py-2 text-gray-400">
                                                                {m.deviceUser.fingerCount > 0 && <Fingerprint className="w-3 h-3 text-green-600" />}
                                                                {m.deviceUser.fingerCount === 0 && <span className="text-gray-300">-</span>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-green-600 text-sm">No synchronized users found.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
};

export default BiometricManagerPage;
