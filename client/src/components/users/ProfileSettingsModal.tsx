import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { User, Mail, Lock, AlertCircle, Check } from 'lucide-react';


const schema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof schema>;

interface ProfileSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
    const { user, login } = useAuthStore(); // Login used to update store if needed, or we just rely on refresh

    const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            full_name: user?.full_name || '',
            email: user?.email || '',
            password: ''
        }
    });

    const updateMutation = useMutation({
        mutationFn: async (data: ProfileFormData) => {
            const payload: any = {
                full_name: data.full_name,
                email: data.email,
            };
            if (data.password) {
                payload.password = data.password; // Controller will map this to password_hash
            }
            return await api.patch(`/users/${user?.id}`, payload);
        },
        onSuccess: (res) => {
            alert("Profile updated successfully");
            onClose();
            window.location.reload();
        },
        onError: (err: any) => {
            alert(err.message || "Failed to update profile");
        }
    });

    const onSubmit = (data: ProfileFormData) => {
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-purple-50 to-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <User className="text-purple-600" />
                        Profile Settings
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6 pt-4 space-y-4">

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                {...register('full_name')}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                            />
                        </div>
                        {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                {...register('email')}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">New Password (Optional)</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="password"
                                {...register('password')}
                                placeholder="Leave blank to keep current"
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-200 outline-none"
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ProfileSettingsModal;
