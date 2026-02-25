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
    Settings,
    Save,
    Calendar
} from 'lucide-react';
import Swal from 'sweetalert2';
import { ShiftConfigurationModal } from '../../components/attendance/ShiftConfigurationModal';
import { ShiftAssignmentModal } from '../../components/attendance/ShiftAssignmentModal';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { format } from 'date-fns';

// API Functions
const getDeviceInfo = async () => (await api.get('/attendance/biometric/status')).data;
const getDeviceUsers = async () => (await api.get('/attendance/biometric/users')).data;
const syncAllLogs = async () => (await api.post('/attendance/biometric/sync-all')).data;
const syncTime = async () => (await api.post('/attendance/biometric/sync-time')).data;
const getSyncHistory = async () => (await api.get('/attendance/biometric/sync-history')).data;
const restartDevice = async () => (await api.post('/attendance/biometric/restart')).data;
const clearLogs = async () => (await api.post('/attendance/biometric/clear-logs')).data;
const addUser = async (data: any) => (await api.post('/attendance/biometric/users/add', data)).data;
const deleteUser = async (uid: any) => (await api.post('/attendance/biometric/users/delete', { uid })).data;
const getUnlinkedUsers = async () => (await api.get('/attendance/biometric/users/unlinked')).data;
const linkUser = async (data: { deviceUserId: string, staffProfileId: string }) => (await api.post('/attendance/biometric/users/link', data)).data;
const uploadUsers = async () => (await api.post('/attendance/biometric/users/upload')).data;
const getShifts = async () => (await api.get('/attendance/shifts')).data;
const importUsers = async () => (await api.post('/attendance/biometric/users/import')).data;
const getAuditData = async () => (await api.get('/attendance/biometric/audit')).data;
const getStaffList = async () => (await api.get('/team/staff')).data;

const BiometricManagerPage = () => {
    const queryClient = useQueryClient();
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'console' | 'audit' | 'policies' | 'shifts' | 'link_users'>('console');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    // State for Link Users tab
    const [selectedStaffForLink, setSelectedStaffForLink] = useState<Record<string, string>>({});

    // Assignment Modal State
    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean, staffId: string, staffName: string }>({
        isOpen: false, staffId: '', staffName: ''
    });




    // 1. Fetch Device Info (Robust)
    const { data: deviceInfo, isLoading: infoLoading, refetch: refetchInfo, isRefetching } = useQuery({
        queryKey: ['biometric-info'],
        queryFn: getDeviceInfo,
        refetchInterval: 30000
    });

    const parsedDeviceInfo = React.useMemo(() => {
        if (!deviceInfo?.device_info) return {};
        try {
            return JSON.parse(deviceInfo.device_info);
        } catch (e) {
            console.error("Failed to parse device info", e);
            return {};
        }
    }, [deviceInfo?.device_info]);

    const isOnline = deviceInfo?.status === 'ONLINE';

    // 2. Fetch Users
    const { data: deviceUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['biometric-users'],
        queryFn: getDeviceUsers
    });

    // 3. Fetch Staff for Policies and Linking
    const { data: staffList, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
        queryKey: ['staff-list-policies'],
        queryFn: getStaffList,
        enabled: activeTab === 'policies' || activeTab === 'link_users'
    });

    // 4. Fetch Unlinked device users
    const { data: unlinkedUsers, isLoading: unlinkedLoading, refetch: refetchUnlinked } = useQuery({
        queryKey: ['biometric-unlinked-users'],
        queryFn: getUnlinkedUsers,
        enabled: activeTab === 'link_users'
    });

    const { data: shifts, refetch: refetchShifts } = useQuery({
        queryKey: ['shifts-list'],
        queryFn: getShifts,
        enabled: activeTab === 'policies' || activeTab === 'shifts'
    });

    const { data: auditData, isLoading: auditLoading, refetch: refetchAudit, isRefetching: isAuditing } = useQuery({
        queryKey: ['biometric-audit'],
        queryFn: getAuditData,
        enabled: false,
        staleTime: Infinity
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
            refetchUnlinked();
        },
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
    });

    const linkUserMutation = useMutation({
        mutationFn: linkUser,
        onSuccess: (data) => {
            addToLog(`Link Success: ${data.message}`);
            Swal.fire('Linked', 'Device user successfully linked to profile.', 'success');
            refetchUnlinked();
            refetchAudit();
        },
        onError: (err: any) => {
            addToLog(`Link Error: ${err.response?.data?.error || err.message}`);
            Swal.fire('Error', err.response?.data?.error || err.message, 'error');
        }
    });

    const uploadUsersMutation = useMutation({
        mutationFn: uploadUsers,
        onSuccess: (data) => {
            addToLog(`Upload Success: ${data.message}`);
            refetchUsers();
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

    // Helper to format time
    const format12 = (time: string) => {
        if (!time || !time.includes(':')) return time;
        const [h, m] = time.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${m} ${ampm}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Biometric Device Console</h2>
                    <p className="text-muted-foreground">Manage ESSL device connection and data</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-4">
                        {[
                            { id: 'console', label: 'CONSOLE' },
                            { id: 'link_users', label: 'Link Users' },
                            { id: 'audit', label: 'Audit' },
                            { id: 'shifts', label: 'Create Shift' },
                            { id: 'policies', label: 'Shift Management' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Activity className="w-5 h-5 text-blue-500" />
                                <h3 className="font-semibold text-gray-700">Device Specs</h3>
                            </div>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Name:</span>
                                    <span className="font-medium text-gray-900">
                                        {parsedDeviceInfo.deviceName || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Serial:</span>
                                    <span className="font-medium text-gray-900">
                                        {parsedDeviceInfo.serialNumber || '-'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Platform:</span>
                                    <span className="font-medium text-gray-900">
                                        {parsedDeviceInfo.platform || '-'}
                                    </span>
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
                                    <div className="text-2xl font-bold text-purple-600">
                                        {parsedDeviceInfo.userCount || '-'}
                                    </div>
                                    <div className="text-xs text-purple-400">Users Enrolled</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {parsedDeviceInfo.logCount || '-'}
                                    </div>
                                    <div className="text-xs text-blue-400">Attendance Logs</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-4">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="w-5 h-5 text-orange-500" />
                                <h3 className="font-semibold text-gray-700">Device Control</h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 group"
                                    onClick={async () => {
                                        try {
                                            addToLog("Initiating Import All Logs...");
                                            await api.post('/attendance/biometric/sync-all');
                                            addToLog("Import completed successfully.");
                                            Swal.fire('Success', 'Import All Logs Complete', 'success');
                                        } catch (e: any) {
                                            addToLog(`Import Failed: ${e.message}`);
                                            Swal.fire('Error', 'Import failed', 'error');
                                        }
                                    }}
                                >
                                    <RefreshCw className="w-5 h-5 mr-2 group-hover:animate-spin" />
                                    IMPORT ALL LOGS (Direct)
                                </Button>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="outline" className="text-xs" onClick={() => syncTimeMutation.mutate()} disabled={syncTimeMutation.isPending}>
                                        <Clock className="w-3 h-3 mr-2" /> Sync Time
                                    </Button>
                                    <Button variant="outline" className="text-xs text-red-600 px-0" onClick={() => { if (window.confirm('Restart Device?')) restartMutation.mutate(); }} disabled={restartMutation.isPending}>
                                        <Power className="w-3 h-3 mr-2" /> Restart
                                    </Button>
                                    <Button variant="outline" className="text-xs col-span-2 text-red-700" onClick={() => { if (window.confirm('DANGER: Clear ALL logs?')) clearLogsMutation.mutate(); }} disabled={clearLogsMutation.isPending}>
                                        <Trash2 className="w-3 h-3 mr-2" /> Clear Logs
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {actionLog.length > 0 && (
                        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-40 overflow-y-auto shadow-inner">
                            <div className="font-bold text-gray-500 mb-2 uppercase tracking-wide">Console Output</div>
                            {actionLog.map((log, i) => <div key={i}>{log}</div>)}
                        </div>
                    )}

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
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800" onClick={() => { if (window.confirm(`Delete ${u.userId}?`)) deleteUserMutation.mutate(u.userId); }}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'audit' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Synchronization Status</h3>
                                <p className="text-sm text-gray-500">Compare application staff with device users</p>
                            </div>
                            <Button onClick={() => refetchAudit()} disabled={isAuditing || auditLoading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${isAuditing || auditLoading ? 'animate-spin' : ''}`} />
                                {isAuditing || auditLoading ? 'Scanning...' : 'Run Audit Scan'}
                            </Button>
                        </div>
                        {(!isAuditing && auditData?.audit) && (
                            <div className="space-y-8">
                                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-800 mb-2">Missing on Device ({auditData.audit.missingOnDevice.length})</h4>
                                    {auditData.audit.missingOnDevice.length > 0 ? (
                                        <div className="text-sm text-yellow-700">Run "Upload Users" in Console to fix this.</div>
                                    ) : <div className="text-sm text-green-600">All staff present on device.</div>}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'link_users' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Fingerprint className="w-5 h-5 text-indigo-500" />
                                    Unlinked Device Users
                                </h3>
                                <p className="text-sm text-gray-500">Attach unmapped physical device IDs to existing web application profiles</p>
                            </div>
                            <Button onClick={() => refetchUnlinked()} disabled={unlinkedLoading}>
                                <RefreshCw className={`w-4 h-4 mr-2 ${unlinkedLoading ? 'animate-spin' : ''}`} />
                                Refresh List
                            </Button>
                        </div>

                        {unlinkedLoading || staffLoading ? (
                            <div className="p-8 text-center text-gray-400">Scanning for unmapped fingerprints...</div>
                        ) : unlinkedUsers?.data?.length === 0 ? (
                            <div className="p-8 text-center bg-green-50 rounded border border-green-100 shadow-inner">
                                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                                <h4 className="font-bold text-green-700">All Setup!</h4>
                                <p className="text-sm text-green-600">Every user on the physical device is matched to a web profile.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto border rounded-md shadow-sm">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3 border-b">Device ID (UID)</th>
                                            <th className="px-4 py-3 border-b">Device Name</th>
                                            <th className="px-4 py-3 border-b w-1/3">Match to Staff Profile</th>
                                            <th className="px-4 py-3 border-b text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {unlinkedUsers?.data?.map((user: any, i: number) => (
                                            <tr key={user.userId || i} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-4 py-4 font-mono font-bold text-indigo-700">{user.userId}</td>
                                                <td className="px-4 py-4 font-medium">{user.name || 'No Name'}</td>
                                                <td className="px-4 py-4">
                                                    <select
                                                        className="w-full p-2 border border-gray-200 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={selectedStaffForLink[user.userId] || ''}
                                                        onChange={(e) => setSelectedStaffForLink({ ...selectedStaffForLink, [user.userId]: e.target.value })}
                                                    >
                                                        <option value="">-- Select Staff Profile --</option>
                                                        {staffList?.map((staff: any) => (
                                                            <option key={staff.id} value={staff.id}>
                                                                {staff.user.full_name} ({staff.staff_number})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <Button
                                                        size="sm"
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-2 whitespace-nowrap"
                                                        disabled={!selectedStaffForLink[user.userId] || linkUserMutation.isPending}
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to permanently link Device ID "${user.userId}" to this profile?`)) {
                                                                linkUserMutation.mutate({
                                                                    deviceUserId: user.userId,
                                                                    staffProfileId: selectedStaffForLink[user.userId]
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        <CheckCircle className="w-4 h-4" /> Link Profile
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'shifts' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Shift Management</h3>
                                <p className="text-sm text-gray-500">Define shifts and their working hours</p>
                            </div>
                            <Button onClick={() => setIsShiftModalOpen(true)}>
                                <Settings className="w-4 h-4 mr-2" /> Add / Edit Shifts
                            </Button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-2">Shift Name</th>
                                        <th className="px-4 py-2">Start Time</th>
                                        <th className="px-4 py-2">End Time</th>
                                        <th className="px-4 py-2">Default Grace</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {shifts?.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{s.name}</td>
                                            <td className="px-4 py-3">{format12(s.start_time)}</td>
                                            <td className="px-4 py-3">{format12(s.end_time)}</td>
                                            <td className="px-4 py-3">{s.default_grace_time} min</td>
                                        </tr>
                                    ))}
                                    {(!shifts || shifts.length === 0) && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No shifts defined</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {activeTab === 'policies' && (
                <div className="space-y-6">
                    <Card className="p-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-6">Staff Attendance Policies</h3>
                        </div>

                        {staffLoading ? (
                            <div className="p-8 text-center text-gray-400">Loading staff details...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-2">Staff</th>
                                            <th className="px-4 py-2">Current Shift (Date Range)</th>
                                            <th className="px-4 py-2">Grace Time</th>
                                            <th className="px-4 py-2">Manage Shift</th>
                                            <th className="px-4 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {staffList?.map((staff: any) => {

                                            // Determine Active Assignment for Grace Time Display
                                            // We take the first active one that overlaps "now" or the most recent one
                                            const activeAssignment = staff.shift_assignments?.find((a: any) => {
                                                const now = new Date();
                                                const from = new Date(a.from_date);
                                                const to = a.to_date ? new Date(a.to_date) : null;
                                                return from <= now && (!to || to >= now);
                                            });

                                            const graceDisplay = activeAssignment
                                                ? (activeAssignment.grace_time ?? activeAssignment.shift.default_grace_time) + ' min'
                                                : '-';

                                            return (
                                                <tr key={staff.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{staff.user.full_name}</div>
                                                        <div className="text-xs text-gray-500">{staff.staff_number}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            {(staff.shift_assignments && staff.shift_assignments.length > 0) ? (
                                                                staff.shift_assignments.filter((a: any) => {
                                                                    // Filter for Current Month Overlap
                                                                    // Simple check: Start <= EndOfMonth AND (End >= StartOfMonth OR End is null)
                                                                    const now = new Date();
                                                                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                                                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

                                                                    const from = new Date(a.from_date);
                                                                    const to = a.to_date ? new Date(a.to_date) : null;

                                                                    return from <= endOfMonth && (!to || to >= startOfMonth);
                                                                }).map((assignment: any, idx: number) => (
                                                                    <div key={idx} className="flex items-center justify-between text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                                        <span>
                                                                            {assignment.shift.name}
                                                                            <span className="text-blue-400 ml-1">
                                                                                ({format(new Date(assignment.from_date), 'd MMM')} - {assignment.to_date ? format(new Date(assignment.to_date), 'd MMM') : 'Now'})
                                                                            </span>
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-gray-400">
                                                                    No Active Shift
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {graceDisplay}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Button size="sm" variant="outline" className="h-8 gap-2" onClick={() => setAssignmentModal({ isOpen: true, staffId: staff.id, staffName: staff.user.full_name })}>
                                                            <Settings className="w-3 h-3" /> Assign/Edit
                                                        </Button>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-green-600 hover:bg-green-700 text-white gap-2"
                                                            onClick={async () => {
                                                                try {
                                                                    await api.post('/attendance/shifts/sync-logs', { staffId: staff.user.id });
                                                                    Swal.fire({
                                                                        icon: 'success',
                                                                        title: 'Synced!',
                                                                        text: 'Attendance logs updated with current shift rules.',
                                                                        timer: 2000,
                                                                        showConfirmButton: false
                                                                    });
                                                                } catch (e: any) {
                                                                    Swal.fire('Error', e.response?.data?.error || 'Sync failed', 'error');
                                                                }
                                                            }}
                                                        >
                                                            <Save className="w-4 h-4" /> Save
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            <ShiftConfigurationModal
                isOpen={isShiftModalOpen}
                onClose={() => { setIsShiftModalOpen(false); refetchShifts(); }}
            />

            <ShiftAssignmentModal
                isOpen={assignmentModal.isOpen}
                onClose={() => setAssignmentModal({ ...assignmentModal, isOpen: false })}
                staffId={assignmentModal.staffId}
                staffName={assignmentModal.staffName}
                onSuccess={() => { refetchStaff(); }}
            />
        </div>
    );
};

export default BiometricManagerPage;
