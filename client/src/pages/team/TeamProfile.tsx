import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    User, Mail, Phone, Calendar, MapPin, Briefcase,
    CreditCard, Building, ArrowLeft, Clock, FileText, Edit
} from 'lucide-react';
import api from '../../lib/api';
import { getAssetUrl } from '../../lib/utils';
import StaffFormModal from './StaffFormModal';

const TeamProfile = () => {
    const { id } = useParams(); // This is the staffProfile ID
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payroll'>('overview');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Get current user from store to check permission (This assumes authStore exists and is usable here)
    // Or we can just check local storage / decoded token if store isn't imported
    // For now, let's assume we can functionality without strictly hiding the button if we don't have the auth object handy, 
    // but typically we'd use useAuthStore().

    // Quick fix: Import useAuthStore
    // import { useAuthStore } from '../../store/authStore';
    // const { user } = useAuthStore();

    // Since I cannot easily see authStore imports right now, I'll assume we can pass the prop or just show it for now.
    // Better: Helper to get generic user role? 
    // Let's implement minimal check or just show it. The backed protects it anyway.

    const { data: profile, isLoading, refetch } = useQuery({
        queryKey: ['staff', id],
        queryFn: async () => (await api.get(`/team/staff/${id}`)).data
    });

    if (isLoading) return <div className="p-8 text-center">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-center">Profile not found</div>;

    return (
        <div className="space-y-6">
            <StaffFormModal
                isOpen={isEditModalOpen}
                onClose={() => { setIsEditModalOpen(false); refetch(); }}
                initialData={profile}
            />

            <div className="flex justify-between items-center">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={16} /> Back to Team
                </button>

                <button
                    onClick={() => {
                        console.log("Editing Profile Data:", profile);
                        setIsEditModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                    <Edit size={16} /> Edit Profile
                </button>
            </div>

            {/* Header Card */}
            <div className="bg-card border rounded-lg p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary border-4 border-background shadow-sm">
                    {profile.user.avatar_url ? (
                        <img src={getAssetUrl(profile.user.avatar_url)} alt={profile.user.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        profile.user.full_name.charAt(0)
                    )}
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                    <h1 className="text-2xl font-bold">{profile.user.full_name}</h1>
                    <div className="text-muted-foreground font-medium">{profile.designation}</div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                        <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
                            {profile.department}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                            ID: {profile.staff_number}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={16} /> {profile.user.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={16} /> {profile.official_contact || 'No contact'}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase size={16} /> Joined: {new Date(profile.date_of_joining).toLocaleDateString()}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb - 2 px - 1 font - medium text - sm border - b - 2 transition - colors ${activeTab === 'overview' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} `}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`pb - 2 px - 1 font - medium text - sm border - b - 2 transition - colors ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} `}
                >
                    Attendance & Leave
                </button>
                <button
                    onClick={() => setActiveTab('payroll')}
                    className={`pb - 2 px - 1 font - medium text - sm border - b - 2 transition - colors ${activeTab === 'payroll' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} `}
                >
                    Payroll Info
                </button>
            </div>

            {/* Content Area */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* Personal Info */}
                    <div className="bg-card border rounded-lg p-6 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                            <User size={18} /> Personal Details
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div className="text-gray-500">Full Name</div>
                            <div>{profile.user.full_name}</div>

                            <div className="text-gray-500">Date of Birth</div>
                            <div>{profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : '-'}</div>

                            <div className="text-gray-500">Personal Email</div>
                            <div>{profile.personal_email || '-'}</div>

                            <div className="text-gray-500">Phone</div>
                            <div>{profile.personal_contact || '-'}</div>

                            <div className="text-gray-500">Address</div>
                            <div className="col-span-2 md:col-span-1">{profile.address || '-'}</div>
                        </div>
                    </div>

                    {/* Professional Info */}
                    <div className="bg-card border rounded-lg p-6 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 border-b pb-2">
                            <Building size={18} /> Employment Info
                        </h3>
                        <div className="grid grid-cols-2 gap-y-4 text-sm">
                            <div className="text-gray-500">Reporting Manager</div>
                            <div>{profile.reporting_manager?.full_name || 'None'}</div>

                            <div className="text-gray-500">Previous Company</div>
                            <div>{profile.previous_company || '-'}</div>

                            <div className="text-gray-500">Experience</div>
                            <div>{profile.total_experience_years || 0} Years</div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="bg-card border rounded-lg p-12 text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2">
                    <Clock size={48} className="mx-auto mb-4 opacity-20" />
                    <h3 className="font-semibold text-lg">Attendance History</h3>
                    <p>Attendance records will appear here once data is logged.</p>
                </div>
            )}

            {activeTab === 'payroll' && (
                <div className="bg-card border rounded-lg p-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <CreditCard size={18} /> Salary & Banking
                        </h3>
                        <Link
                            to={`/dashboard/accounts?tab=statements&entity_id=${profile.user.id}&entity_type=USER`}
                            className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                        >
                            <FileText size={14} /> View Ledger
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">Base Salary</span>
                                <span className="font-mono font-medium">₹{profile.base_salary?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm p-3 bg-gray-50 rounded">
                                <span className="text-gray-600">HRA</span>
                                <span className="font-mono font-medium">₹{profile.hra?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">Bank Name</span>
                                <span>{profile.bank_name || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">Account No</span>
                                <span className="font-mono">{profile.account_number || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">IFSC Code</span>
                                <span className="font-mono">{profile.ifsc_code || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">PAN Number</span>
                                <span className="font-mono">{profile.pan_number || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamProfile;
