import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const { register } = useAuthStore();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'MARKETING_EXEC',
        department: 'MARKETING'
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/dashboard');
        } catch (err: any) {
            // handle Zod array errors or simple message
            const msg = Array.isArray(err.response?.data?.errors)
                ? err.response.data.errors.map((e: any) => e.message).join(', ')
                : err.response?.data?.message || 'Registration failed';
            setError(msg);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-10">
            <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg border border-border">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Join Qix Ads</h1>
                    <p className="text-muted-foreground mt-2">Create your account</p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="role">Role</label>
                            <select
                                id="role"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="MARKETING_EXEC">Marketer</option>
                                <option value="DESIGNER">Designer</option>
                                <option value="WEB_SEO">Web/SEO</option>
                                <option value="MANAGER">Manager</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium" htmlFor="dept">Department</label>
                            <select
                                id="dept"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                value={formData.department}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            >
                                <option value="MARKETING">Marketing</option>
                                <option value="CREATIVE">Creative</option>
                                <option value="WEB">Web</option>
                                <option value="MANAGEMENT">Management</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                    >
                        Create Account
                    </button>
                </form>

                <div className="text-center text-sm">
                    <span className="text-muted-foreground">Already have an account? </span>
                    <Link to="/login" className="text-primary hover:underline">Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
