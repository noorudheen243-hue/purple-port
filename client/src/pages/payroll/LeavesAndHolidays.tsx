import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Plus, Trash2, CheckCircle, XCircle, Calendar as CalendarIcon, Filter, User } from 'lucide-react';

const LeavesAndHolidays: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'leaves' | 'holidays'>('leaves');
    const [leaveSubTab, setLeaveSubTab] = useState<'summary' | 'requests'>('summary');

    // Summary State
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [summaryUserRole, setSummaryUserRole] = useState<string>(''); // To detect if admin

    // Holiday State
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ name: '', date: '', description: '' });

    // Queries
    const { data: staffList } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    const { data: currentUser } = useQuery({
        queryKey: ['me'],
        queryFn: async () => {
            const res = await api.get('/team/staff/me');
            // Auto-select self initially
            if (!selectedStaffId) setSelectedStaffId(res.data.user_id);
            setSummaryUserRole(res.data.user.role || '');
            return res.data;
        }
    });

    const { data: leaveSummary, isLoading: loadingSummary } = useQuery({
        queryKey: ['leave-summary', selectedStaffId, summaryYear],
        enabled: !!selectedStaffId,
        queryFn: async () => (await api.get(`/team/leave/summary?userId=${selectedStaffId}&year=${summaryYear}`)).data
    });

    const { data: leaveRequests, isLoading: loadingRequests } = useQuery({
        queryKey: ['leave-requests'],
        queryFn: async () => (await api.get('/team/leaves')).data
    });

    const { data: holidays, isLoading: loadingHolidays } = useQuery({
        queryKey: ['holidays'],
        queryFn: async () => (await api.get('/payroll/holidays')).data
    });

    // Mutations
    // Apply Leave State
    const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
    const [leaveForm, setLeaveForm] = useState({
        type: 'CASUAL', // Default to a Paid type
        start_date: '',
        end_date: '',
        reason: ''
    });

    const applyLeaveMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.post('/team/leaves', data);
        },
        onSuccess: () => {
            setIsApplyLeaveOpen(false);
            setLeaveForm({ type: 'CASUAL', start_date: '', end_date: '', reason: '' });
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leave-summary'] });
            alert("Leave Request Submitted");
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to apply")
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, status, reason }: { id: string, status: string, reason?: string }) => {
            // Updated to match Backend Route: PATCH /team/leaves/:id/approve
            await api.patch(`/team/leaves/${id}/approve`, { status, reason });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
            queryClient.invalidateQueries({ queryKey: ['leave-summary'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || "Action failed")
    });

    // ... (rest of mutations)


    const addHolidayMutation = useMutation({
        mutationFn: async () => {
            await api.post('/payroll/holidays', newHoliday);
        },
        onSuccess: () => {
            setIsAddHolidayOpen(false);
            setNewHoliday({ name: '', date: '', description: '' });
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to add holiday")
    });

    const deleteHolidayMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/payroll/holidays/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] });
        },
        onError: (err: any) => alert(err.response?.data?.message || "Failed to delete holiday")
    });

    const renderCalendar = () => {
        const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
        const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay();

        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 border-r border-b"></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Safe filter: Ensure holidays is an array and handle potential date formats
            const dayHolidays = Array.isArray(holidays) ? holidays.filter((h: any) => {
                if (!h.date) return false;
                // Handle both ISO string and potentially other formats safely
                const hDateStr = String(h.date).split('T')[0];
                return hDateStr === dateStr;
            }) : [];

            const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();

            days.push(
                <div key={day} className={`h-24 border-r border-b p-2 relative ${isToday ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                    <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</span>
                    <div className="mt-1 space-y-1">
                        {dayHolidays.map((h: any) => (
                            <div key={h.id} className="text-xs bg-green-100 text-green-800 p-1 rounded border border-green-200 truncate group relative">
                                {h.name}
                                {(currentUser?.user.role === 'ADMIN' || currentUser?.user.role === 'DEVELOPER_ADMIN') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete holiday?')) deleteHolidayMutation.mutate(h.id); }}
                                        className="absolute right-1 top-0.5 hidden group-hover:block text-red-600 font-bold"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="w-full space-y-6">
            {/* Main Tabs */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 max-w-sm">
                {(['leaves', 'holidays'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all capitalized
                            ${activeTab === tab ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* LEAVES TAB */}
            {activeTab === 'leaves' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b pb-2">
                        <div className="flex gap-4">
                            <button
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${leaveSubTab === 'summary' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                                onClick={() => setLeaveSubTab('summary')}
                            >
                                Leave Summary
                            </button>
                            <button
                                className={`px-4 py-2 text-sm font-medium border-b-2 ${leaveSubTab === 'requests' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
                                onClick={() => setLeaveSubTab('requests')}
                            >
                                Leave Requests
                            </button>
                        </div>

                        {/* Apply Button: Visible for everyone EXCEPT Admin (strictly per request, though typically Admins might want it too, skipping for now) */}
                        {currentUser?.user.role !== 'ADMIN' && (
                            <button
                                onClick={() => setIsApplyLeaveOpen(true)}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90 transition"
                            >
                                <Plus className="h-4 w-4" /> Apply Leave
                            </button>
                        )}
                    </div>

                    {/* ... (Summary View - Unchanged mainly) ... */}
                    {leaveSubTab === 'summary' && (
                        <div className="bg-card rounded-xl p-6 shadow-sm border">
                            <div className="flex gap-4 mb-6 items-end">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Select Staff</label>
                                    <select
                                        className="w-64 rounded-md border p-2 text-sm"
                                        value={selectedStaffId}
                                        onChange={(e) => setSelectedStaffId(e.target.value)}
                                        // Allow selection only if Admin/Manager, else locked to self usually (logic in hook, but UI can restrict)
                                        disabled={currentUser?.user.role !== 'ADMIN' && currentUser?.user.role !== 'MANAGER'}
                                    >
                                        {staffList?.map((s: any) => (
                                            <option key={s.user_id} value={s.user_id}>{s.user.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Year</label>
                                    <select
                                        className="w-32 rounded-md border p-2 text-sm"
                                        value={summaryYear}
                                        onChange={(e) => setSummaryYear(parseInt(e.target.value))}
                                    >
                                        <option value={2024}>2024</option>
                                        <option value={2025}>2025</option>
                                    </select>
                                </div>
                            </div>

                            {loadingSummary ? (
                                <div>Loading summary...</div>
                            ) : leaveSummary ? (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="text-sm text-blue-600 font-medium">Annual Entitlement</div>
                                        <div className="text-3xl font-bold text-blue-900 mt-2">{leaveSummary.entitled}</div>
                                        <div className="text-xs text-blue-500 mt-1">Days / Year</div>
                                    </div>
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                        <div className="text-sm text-orange-600 font-medium">Leaves Used</div>
                                        <div className="text-3xl font-bold text-orange-900 mt-2">{leaveSummary.used}</div>
                                        <div className="text-xs text-orange-500 mt-1">Approved Days</div>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                        <div className="text-sm text-green-600 font-medium">Balance Available</div>
                                        <div className="text-3xl font-bold text-green-900 mt-2">{leaveSummary.balance}</div>
                                        <div className="text-xs text-green-500 mt-1">Remaining</div>
                                    </div>

                                    <div className="col-span-1 border rounded-lg p-4">
                                        <h4 className="text-sm font-semibold mb-3">Breakdown by Type</h4>
                                        <div className="space-y-2 text-sm">
                                            {Object.entries(leaveSummary.typeBreakdown || {}).map(([type, count]: any) => (
                                                <div key={type} className="flex justify-between">
                                                    <span className="text-gray-600">{type}</span>
                                                    <span className="font-medium">{count} days</span>
                                                </div>
                                            ))}
                                            {Object.keys(leaveSummary.typeBreakdown || {}).length === 0 && (
                                                <div className="text-gray-400 italic text-xs">No leaves taken yet.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Monthly Breakdown Table */}
                                    <div className="md:col-span-4 mt-6">
                                        <h4 className="text-sm font-semibold mb-3">Monthly Breakdown ({summaryYear})</h4>
                                        <div className="overflow-x-auto border rounded-lg max-h-60 overflow-y-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Month</th>
                                                        <th className="px-4 py-2 text-right font-medium text-green-600">Paid Leave</th>
                                                        <th className="px-4 py-2 text-right font-medium text-red-600">Unpaid Leave</th>
                                                        <th className="px-4 py-2 text-right font-medium text-gray-900">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {leaveSummary.monthlyStats?.map((stat: any) => (
                                                        <tr key={stat.month} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-medium">{stat.monthName}</td>
                                                            <td className="px-4 py-2 text-right text-gray-600">{stat.paid > 0 ? stat.paid : '-'}</td>
                                                            <td className="px-4 py-2 text-right text-gray-600">{stat.unpaid > 0 ? stat.unpaid : '-'}</td>
                                                            <td className="px-4 py-2 text-right font-bold text-gray-900">{stat.total > 0 ? stat.total : '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                    {leaveSubTab === 'requests' && (
                        <div className="overflow-hidden border rounded-lg shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {leaveRequests?.map((req: any) => (
                                        <tr key={req.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900">{req.user.full_name}</div>
                                                <div className="text-xs text-gray-500">{req.user.staffProfile?.department}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 py-0.5 rounded text-xs border ${req.type === 'UNPAID' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                                    {req.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                                <div className="text-xs text-gray-400">
                                                    {Math.ceil(Math.abs(new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / (1000 * 3600 * 24)) + 1} Days
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {/* Allow Action only if PENDING and User is Admin/Manager */}
                                                {req.status === 'PENDING' && (currentUser?.user.role === 'ADMIN' || currentUser?.user.role === 'MANAGER' || currentUser?.user.role === 'DEVELOPER_ADMIN') && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => actionMutation.mutate({ id: req.id, status: 'APPROVED' })}
                                                            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt("Reason for rejection:");
                                                                if (reason !== null) actionMutation.mutate({ id: req.id, status: 'REJECTED', reason });
                                                            }}
                                                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                                {req.status === 'REJECTED' && req.rejection_reason && (
                                                    <span className="text-xs text-red-400" title={req.rejection_reason}>Reason provided</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!leaveRequests || leaveRequests.length === 0) && (
                                <div className="text-center py-8 text-gray-500">No leave requests found.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* HOLIDAYS TAB - Content omitted for brevity as it is unchanged */}
            {activeTab === 'holidays' && (
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <h3 className="text-lg font-medium text-gray-900">Holiday Calendar</h3>
                            <div className="flex bg-gray-100 rounded-md p-0.5">
                                <button onClick={() => setCurrentMonth(m => m === 0 ? 11 : m - 1)} className="px-2 hover:bg-white rounded">&lt;</button>
                                <span className="px-4 py-1 text-sm font-medium min-w-[120px] text-center">
                                    {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentMonth(m => m === 11 ? 0 : m + 1)} className="px-2 hover:bg-white rounded">&gt;</button>
                            </div>
                        </div>
                        {(currentUser?.user.role === 'ADMIN' || currentUser?.user.role === 'DEVELOPER_ADMIN') && (
                            <button
                                onClick={() => setIsAddHolidayOpen(true)}
                                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm hover:bg-primary/90 transition"
                            >
                                <Plus className="h-4 w-4" /> Add Holiday
                            </button>
                        )}
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-7 border-b bg-gray-50">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 bg-white">
                            {renderCalendar()}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Holiday Modal - Omitted details, assuming render is conditional */}
            {isAddHolidayOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Add New Holiday</h3>
                        {/* Wrapper to reuse form logic or just simplistic form */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Holiday Name</label>
                                <input type="text" className="w-full border rounded p-2" value={newHoliday.name} onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date</label>
                                <input type="date" className="w-full border rounded p-2" value={newHoliday.date} onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setIsAddHolidayOpen(false)} className="px-4 py-2 hover:bg-gray-100 rounded">Cancel</button>
                                <button onClick={() => addHolidayMutation.mutate()} className="px-4 py-2 bg-primary text-white rounded">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Apply Leave Modal */}
            {isApplyLeaveOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4">Apply for Leave</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Leave Type</label>
                                {/* Mapping "Paid" to CASUAL/SICK and "Unpaid" to UNPAID as per user request */}
                                <select
                                    className="w-full border rounded p-2 bg-white"
                                    value={leaveForm.type}
                                    onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                                >
                                    <optgroup label="Paid Leaves">
                                        <option value="CASUAL">Casual Leave (Paid)</option>
                                        <option value="SICK">Sick Leave (Paid)</option>
                                        <option value="EARNED">Earned Leave (Paid)</option>
                                        <option value="MATERNITY/PATERNITY">Maternity/Paternity (Paid)</option>
                                    </optgroup>
                                    <optgroup label="Unpaid">
                                        <option value="UNPAID">Loss of Pay (Unpaid)</option>
                                    </optgroup>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2"
                                        value={leaveForm.start_date}
                                        onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded p-2"
                                        value={leaveForm.end_date}
                                        onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reason</label>
                                <textarea
                                    className="w-full border rounded p-2 min-h-[80px]"
                                    placeholder="Brief reason for your leave..."
                                    value={leaveForm.reason}
                                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    onClick={() => setIsApplyLeaveOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md text-sm font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => applyLeaveMutation.mutate(leaveForm)}
                                    disabled={!leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {applyLeaveMutation.isPending ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeavesAndHolidays;
