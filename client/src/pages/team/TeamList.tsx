import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { Search, UserPlus, Filter, Mail, Phone, Trash2, Edit, ChevronDown, ChevronRight, LogOut, CheckCircle } from 'lucide-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import OnboardingModal from './OnboardingModal';
import ExitWorkflow from './ExitWorkflow';
import StaffFormModal from './StaffFormModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';

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
                                                    <th className="px-4 py-3">Contact</th>
                                                    <th className="px-4 py-3">Date of Joining</th>
                                                    <th className="px-4 py-3 text-right pr-6">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {members.map((member: any) => {
                                                    // Ensure user object exists to avoid crash
                                                    const user = member.user || {};

                                                    return (
                                                        <tr key={member.id} className="hover:bg-gray-50/30 group">
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
                                                                    <button
                                                                        onClick={() => handleEdit(member)}
                                                                        className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                                        title="Edit Member"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    {user.role !== 'DEVELOPER_ADMIN' && (
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


        </div>
    );
};

export default TeamList;
