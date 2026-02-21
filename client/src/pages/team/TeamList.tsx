import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Search, UserPlus, Filter, Mail, Phone, Trash2, Edit, ChevronDown, ChevronRight, LogOut, Save, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import OnboardingModal from './OnboardingModal';
import ExitWorkflow from './ExitWorkflow';
import StaffFormModal from './StaffFormModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { ROLES, ROLE_LABELS } from '../../utils/roles';

const TeamList = () => {
    const location = useLocation();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('ALL');
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [exitStaff, setExitStaff] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any>(null);
    const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({
        'MANAGEMENT': true,
        'MARKETING': true,
        'CREATIVE': true,
        'WEB_SEO': true,
        'WEB': true,
        'ADMIN': true
    });

    // Role Management State
    const [changedRoles, setChangedRoles] = useState<Record<string, string>>({});
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);

    const toggleDept = (dept: string) => {
        setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }));
    };

    // Mutations
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/team/staff/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] });
        },
        onError: (err: any) => {
            alert("Failed to delete member: " + (err.response?.data?.message || err.message));
        }
    });

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id);
    };

    // Bulk Update Logic
    const handleRoleChange = (id: string, newRole: string) => {
        setChangedRoles(prev => ({ ...prev, [id]: newRole }));
    };

    const pendingUpdates = useMemo(() => {
        return Object.keys(changedRoles).length;
    }, [changedRoles]);

    const handleBulkSaveClick = () => {
        if (pendingUpdates > 0) {
            setIsBulkConfirmOpen(true);
        }
    };

    const confirmBulkSave = async () => {
        setIsBulkConfirmOpen(false);
        try {
            await Promise.all(
                Object.entries(changedRoles).map(([id, role]) =>
                    api.patch(`/team/staff/${id}`, { role })
                )
            );
            queryClient.invalidateQueries({ queryKey: ['staff'] });
            setChangedRoles({}); // Clear changes
        } catch (err: any) {
            console.error("Bulk save error:", err);
            const msg = err.response?.data?.message;
            alert("Failed to update roles: " + (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : (msg || err.message)));
        }
    };

    const handleEdit = (staff: any) => {
        setEditingStaff(staff);
        setIsEditModalOpen(true);
    };

    const handleInitiateExit = (staff: any) => {
        setExitStaff(staff);
    };

    React.useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setIsOnboardingOpen(true);
        }
    }, [location.search]);

    const { data: staffList, isLoading, error } = useQuery({
        queryKey: ['staff'],
        queryFn: async () => (await api.get('/team/staff')).data
    });

    const filteredStaff = useMemo(() => {
        if (!Array.isArray(staffList)) return [];
        return staffList.filter((staff: any) => {
            // Safety check for user relation
            const user = staff.user || {};
            const fullName = user.full_name || '';
            const designation = staff.designation || '';
            const staffNo = staff.staff_number || '';

            const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                staffNo.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = filterDept === 'ALL' || filterDept === 'ALL_LIST' || staff.department === filterDept;
            return matchesSearch && matchesDept;
        });
    }, [staffList, searchTerm, filterDept]);

    const groupedStaff = useMemo(() => {
        if (filterDept === 'ALL_LIST') {
            return { 'All Team Members': filteredStaff };
        }

        const groups: Record<string, any[]> = {};
        const depts = ['MANAGEMENT', 'MARKETING', 'CREATIVE', 'WEB_SEO', 'WEB', 'ADMIN'];

        // Initialize order
        depts.forEach(d => groups[d] = []);

        filteredStaff.forEach((staff: any) => {
            const dept = staff.department || 'OTHER';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(staff);
        });

        return groups;
    }, [filteredStaff, filterDept]);

    if (error) {
        return <div className="p-8 text-center text-red-500">Failed to load team data.</div>;
    }

    return (
        <div className="space-y-6">
            {isOnboardingOpen && (
                <OnboardingModal
                    onClose={() => setIsOnboardingOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['staff'] });
                        setIsOnboardingOpen(false);
                    }}
                />
            )}

            {isEditModalOpen && (
                <StaffFormModal
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingStaff(null); }}
                    initialData={editingStaff}
                />
            )}

            {exitStaff && (
                <ExitWorkflow
                    staffId={exitStaff.id}
                    staffName={exitStaff.user?.full_name || 'Staff Member'}
                    onClose={() => setExitStaff(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['staff'] });
                    }}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
                    <p className="text-muted-foreground">Manage your employees, their roles, and performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    {pendingUpdates > 0 && (
                        <Button
                            onClick={handleBulkSaveClick}
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save {pendingUpdates} Role Updates
                        </Button>
                    )}
                    <Link
                        to="/dashboard/team/onboard"
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <UserPlus size={16} />
                        Add Member
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or designation..."
                        className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-muted-foreground" />
                    <select
                        className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none"
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                    >
                        <option value="ALL">All Departments (Grouped)</option>
                        <option value="ALL_LIST">All Team Members (List)</option>
                        <option value="MANAGEMENT">Management</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="CREATIVE">Creative</option>
                        <option value="WEB_SEO">Web & SEO</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
            </div>

            {/* Department-wise Table View */}
            {isLoading ? (
                <div className="text-center py-12">Loading team...</div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedStaff).map(([dept, members]) => {
                        if (members.length === 0) return null;
                        const isExpanded = expandedDepts[dept] ?? true;

                        return (
                            <div key={dept} className="border rounded-lg bg-card overflow-hidden shadow-sm">
                                <button
                                    onClick={() => toggleDept(dept)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors border-b"
                                >
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
                                        <h3 className="font-semibold text-lg text-gray-800">{dept.replace('_', ' ')}</h3>
                                        <span className="bg-white border px-2 py-0.5 rounded-full text-xs text-gray-500 font-medium">{members.length}</span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50/50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400 font-medium border-b dark:border-gray-700">
                                                <tr>
                                                    <th className="px-4 py-3 pl-6">Name</th>
                                                    <th className="px-4 py-3 text-center">Ledger</th>
                                                    <th className="px-4 py-3">ID Number</th>
                                                    <th className="px-4 py-3">Designation</th>
                                                    <th className="px-4 py-3">System Role</th>
                                                    <th className="px-4 py-3">Contact</th>
                                                    <th className="px-4 py-3">Date of Joining</th>
                                                    <th className="px-4 py-3 text-right pr-6">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {members.map((member: any) => {
                                                    // Ensure user object exists to avoid crash
                                                    const user = member.user || {};
                                                    const currentRole = changedRoles[member.id] || user.role || 'N/A';
                                                    const isChanged = changedRoles[member.id] && changedRoles[member.id] !== user.role;

                                                    return (
                                                        <tr key={member.id} className={`hover:bg-gray-50/30 group ${isChanged ? 'bg-yellow-50/30' : ''}`}>
                                                            <td className="px-4 py-3 pl-6">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                                        {user.avatar_url ? (
                                                                            <img src={getAssetUrl(user.avatar_url)} className="w-full h-full rounded-full object-cover" />
                                                                        ) : (
                                                                            (user.full_name || '?').charAt(0)
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                                                            {user.full_name || 'Unknown'}
                                                                        </div>
                                                                        <Link to={`/dashboard/team/${member.id}`} className="text-[10px] text-primary hover:underline">View Profile</Link>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {member.ledger_options?.create ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[10px] font-medium" title="Ledger Account Active">
                                                                        <CheckCircle size={10} className="fill-green-100" /> Active
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-gray-300 text-[10px]">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600 font-mono text-xs">{member.staff_number}</td>
                                                            <td className="px-4 py-3 text-gray-600">{member.designation}</td>
                                                            <td className="px-4 py-3">
                                                                {currentRole === ROLES.DEVELOPER_ADMIN ? (
                                                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-600 text-white font-bold text-xs shadow-sm w-fit opacity-100 cursor-not-allowed select-none">
                                                                        <span>Developer Admin</span>
                                                                    </div>
                                                                ) : (
                                                                    <select
                                                                        value={currentRole}
                                                                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                                                        className={`border-none text-xs font-medium focus:ring-0 cursor-pointer rounded px-1 py-0.5 transition-colors bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 ${isChanged ? 'text-amber-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                                                                    >
                                                                        {Object.entries(ROLE_LABELS).map(([role, label]) => {
                                                                            if (role === ROLES.DEVELOPER_ADMIN || role === ROLES.CLIENT) return null;
                                                                            return <option key={role} value={role}>{label}</option>
                                                                        })}
                                                                    </select>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Mail size={12} /> {user.email || '-'}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Phone size={12} /> {member.official_contact || member.personal_contact || '-'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-600">
                                                                {member.date_of_joining ? new Date(member.date_of_joining).toLocaleDateString() : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right pr-6">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <Link
                                                                        to={`/dashboard/team/edit/${member.id}`}
                                                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                                        title="Edit Member"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </Link>
                                                                    {currentRole !== 'DEVELOPER_ADMIN' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (window.confirm("Are you sure you want to delete this team member?")) {
                                                                                        handleDelete(member.id);
                                                                                    }
                                                                                }}
                                                                                className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors"
                                                                                title="Delete Member"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleInitiateExit(member)}
                                                                                className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                                                                                title="Initiate Exit"
                                                                            >
                                                                                <LogOut size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredStaff.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                            No team members found matching your filters.
                        </div>
                    )}
                </div>
            )}

            {/* Bulk Save Confirmation Dialog */}
            <Dialog open={isBulkConfirmOpen} onOpenChange={setIsBulkConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Role Updates</DialogTitle>
                        <DialogDescription>
                            You are about to update the system roles for <strong>{pendingUpdates}</strong> team members.
                            <br /><br />
                            Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkConfirmOpen(false)}>Cancel</Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={confirmBulkSave}>Yes, Update All</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TeamList;
