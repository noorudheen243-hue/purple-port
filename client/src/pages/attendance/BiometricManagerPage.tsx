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
const getStaffList = async () => (await api.get('/team/staff')).data;
const getShifts = async () => (await api.get('/attendance/shifts')).data;

const BiometricManagerPage = () => {
    const queryClient = useQueryClient();
    const [actionLog, setActionLog] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'console' | 'audit' | 'policies' | 'shifts'>('console');
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

    // Assignment Modal State
    const [assignmentModal, setAssignmentModal] = useState<{ isOpen: boolean, staffId: string, staffName: string }>({
        isOpen: false, staffId: '', staffName: ''
    });

    // Policy Edit State (Grace Time / Criteria only)
    const [editPolicy, setEditPolicy] = useState<{ [key: string]: { grace: number, criteria: string } }>({});


    // 1. Fetch Device Info (Robust)
    const { data: deviceInfo, isLoading: infoLoading, refetch: refetchInfo, isRefetching } = useQuery({
        queryKey: ['biometric-info'],
        queryFn: getDeviceInfo,
        refetchInterval: 30000
    });

    const isOnline = deviceInfo?.status === 'ONLINE' || (deviceInfo?.userCount !== undefined && deviceInfo?.userCount > 0);

    // 2. Fetch Users
    const { data: deviceUsers, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['biometric-users'],
        queryFn: getDeviceUsers
    });

    // 3. Fetch Staff for Policies
    const { data: staffList, isLoading: staffLoading, refetch: refetchStaff } = useQuery({
        queryKey: ['staff-list-policies'],
        queryFn: getStaffList,
        enabled: activeTab === 'policies'
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
        },
        onError: (err: any) => addToLog(`Error: ${err.response?.data?.error || err.message}`)
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
                        {['console', 'audit', 'shifts', 'policies'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                {tab === 'shifts' ? 'Shift Management' : tab === 'policies' ? 'Staff Policies' : tab}
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
                                <Button variant="outline" className="w-full justify-start text-xs" onClick={() => syncTimeMutation.mutate()} disabled={syncTimeMutation.isPending}>
                                    <Clock className="w-3 h-3 mr-2" /> Sync Time
                                </Button>
                                <Button variant="outline" className="w-full justify-start text-xs text-red-600 hover:bg-red-50" onClick={() => { if (window.confirm('Restart Device?')) restartMutation.mutate(); }} disabled={restartMutation.isPending}>
                                    <Power className="w-3 h-3 mr-2" /> Restart
                                </Button>

                                <div className="col-span-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                                    <Button className="w-full justify-center text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => { if (window.confirm('Import User Data From Device?')) importUsersMutation.mutate(); }} disabled={importUsersMutation.isPending}>
                                        <Server className="w-3 h-3 mr-2" /> Import Users
                                    </Button>
                                    <Button className="w-full justify-center text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { if (window.confirm('Upload User Data To Device?')) uploadUsersMutation.mutate(); }} disabled={uploadUsersMutation.isPending}>
                                        <Users className="w-3 h-3 mr-2" /> Upload Users
                                    </Button>
                                </div>

                                <div className="col-span-2 pt-2 border-t border-gray-100 flex gap-2">
                                    <Button variant="outline" className="w-full justify-center text-xs text-red-600 hover:bg-red-50" onClick={() => { if (window.confirm('DANGER: Clear ALL logs?')) clearLogsMutation.mutate(); }} disabled={clearLogsMutation.isPending}>
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
                                            <th className="px-4 py-2">Grace (Min)</th>
                                            <th className="px-4 py-2">Criteria</th>
                                            <th className="px-4 py-2 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {staffList?.map((staff: any) => {
                                            const isEditing = editPolicy[staff.id] !== undefined;
                                            const grace = isEditing ? editPolicy[staff.id].grace : (staff.grace_time || 15);
                                            const criteria = isEditing ? editPolicy[staff.id].criteria : (staff.punch_in_criteria || 'GRACE_TIME');

                                            // Determine Active Shift
                                            const activeAssignment = staff.shift_assignments?.[0]; // Assuming ordered or just pick first active
                                            const shiftDisplay = activeAssignment
                                                ? `${activeAssignment.shift.name} (${format(new Date(activeAssignment.from_date), 'MMM d')} - ${activeAssignment.to_date ? format(new Date(activeAssignment.to_date), 'MMM d') : 'Indefinite'})`
                                                : (staff.shift_timing ? `Legacy: ${staff.shift_timing}` : 'No Active Shift');

                                            return (
                                                <tr key={staff.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">{staff.user.full_name}</div>
                                                        <div className="text-xs text-gray-500">{staff.staff_number}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className={`text-xs px-2 py-1 rounded ${activeAssignment ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {shiftDisplay}
                                                            </span>
                                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setAssignmentModal({ isOpen: true, staffId: staff.id, staffName: staff.user.full_name })}>
                                                                <Calendar className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="border rounded p-1 text-xs w-16"
                                                                value={grace}
                                                                onChange={e => setEditPolicy(prev => ({
                                                                    ...prev,
                                                                    [staff.id]: { ...prev[staff.id], grace: parseInt(e.target.value) || 0 }
                                                                }))}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-700">{staff.grace_time} min</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {isEditing ? (
                                                            <select
                                                                className="border rounded p-1 text-xs w-32"
                                                                value={criteria}
                                                                onChange={e => setEditPolicy(prev => ({
                                                                    ...prev,
                                                                    [staff.id]: { ...prev[staff.id], criteria: e.target.value }
                                                                }))}
                                                            >
                                                                <option value="GRACE_TIME">Grace Time</option>
                                                                <option value="HOURS_8">8 Hours</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`px-2 py-0.5 rounded text-xs ${criteria === 'HOURS_8' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {criteria === 'HOURS_8' ? '8 Hours' : 'Grace Time'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {isEditing ? (
                                                            <div className="flex justify-end gap-2">
                                                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => {
                                                                    const newPolicy = { ...editPolicy };
                                                                    delete newPolicy[staff.id];
                                                                    setEditPolicy(newPolicy);
                                                                }}>Cancel</Button>
                                                                <Button size="sm" className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => {
                                                                    api.patch(`/team/staff/${staff.id}`, {
                                                                        grace_time: editPolicy[staff.id].grace,
                                                                        punch_in_criteria: editPolicy[staff.id].criteria
                                                                    }).then(() => {
                                                                        const newPolicy = { ...editPolicy };
                                                                        delete newPolicy[staff.id];
                                                                        setEditPolicy(newPolicy);
                                                                        refetchStaff();
                                                                        Swal.fire({
                                                                            icon: 'success',
                                                                            title: 'Updated!',
                                                                            timer: 1000,
                                                                            showConfirmButton: false
                                                                        });
                                                                    });
                                                                }}>
                                                                    <Save className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" variant="ghost" className="h-7 px-2 text-blue-600" onClick={() => setEditPolicy(prev => ({
                                                                ...prev,
                                                                [staff.id]: {
                                                                    grace: staff.grace_time || 15,
                                                                    criteria: staff.punch_in_criteria || 'GRACE_TIME'
                                                                }
                                                            }))}>
                                                                Edit Policy
                                                            </Button>
                                                        )}
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
