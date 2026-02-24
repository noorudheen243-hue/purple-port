import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Key, Lock, RefreshCw, Save, Search, UserCheck, Eye, EyeOff } from 'lucide-react';

interface ClientCredential {
    id: string;
    name: string;
    portalUser: {
        id: string;
        email: string;
    } | null;
}

const ClientCredentialsPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Mode State: Track which Client ID is being edited and the form values
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ username: string, password: string, showPassword?: boolean }>({ username: '', password: '' });

    const { data: credentials, isLoading } = useQuery({
        queryKey: ['client-credentials'],
        queryFn: async () => {
            const { data } = await api.get('/clients/credentials');
            return data as ClientCredential[];
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ clientId, data }: { clientId: string, data: { username?: string, password?: string } }) => {
            // Only send fields that have values (Password might be empty if not changed, but here we likely want to set both if provided)
            await api.put(`/clients/credentials/${clientId}`, data);
        },
        onSuccess: () => {
            setEditingId(null);
            setEditForm({ username: '', password: '' });
            queryClient.invalidateQueries({ queryKey: ['client-credentials'] });
        },
        onError: (err: any) => {
            alert("Update Failed: " + (err.response?.data?.message || err.message));
        }
    });

    const startEdit = (cred: ClientCredential) => {
        setEditingId(cred.id);
        const currentEmail = cred.portalUser?.email || '';
        // If "No Account", we might pre-fill default format? The user said "by default make all...". 
        // But here we just show what is there.
        setEditForm({
            username: currentEmail,
            password: '' // Always blank for security/reset
        });
    };

    const handleSave = (clientId: string) => {
        if (!editForm.username) return alert("Username is required");

        const payload: any = { username: editForm.username };
        if (editForm.password) payload.password = editForm.password;

        updateMutation.mutate({ clientId, data: payload });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ username: '', password: '' });
    };

    const filteredCredentials = credentials?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.portalUser?.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="p-8 text-center">Loading Credentials...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Client Access</h1>
                    <p className="text-muted-foreground">Manage login credentials for the Client Portal.</p>
                </div>
                {/* Generate Button Removed as requested */}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Accounts</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search clients..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Client Name</TableHead>
                                    <TableHead className="w-[300px]">Username (Email)</TableHead>
                                    <TableHead className="w-[300px]">Password</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCredentials?.map((cred) => {
                                    const isEditing = editingId === cred.id;

                                    return (
                                        <TableRow key={cred.id} className={isEditing ? "bg-muted/50" : ""}>
                                            <TableCell className="font-medium align-middle">
                                                {cred.name}
                                            </TableCell>

                                            {/* Username Cell */}
                                            <TableCell className="align-middle">
                                                {isEditing ? (
                                                    <Input
                                                        value={editForm.username}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                                        placeholder="company@qix.com"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={!cred.portalUser ? "text-muted-foreground italic" : ""}>
                                                            {cred.portalUser?.email || "No Account"}
                                                        </span>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Password Cell */}
                                            <TableCell className="align-middle">
                                                {isEditing ? (
                                                    <div className="relative">
                                                        <Input
                                                            type={editForm.showPassword ? "text" : "password"}
                                                            value={editForm.password}
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                                            placeholder={cred.portalUser ? "Reset Password" : "Set Password"}
                                                            className="pr-10"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                            onClick={() => setEditForm(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                                                        >
                                                            {editForm.showPassword ? (
                                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 group">
                                                        <span className="text-muted-foreground">••••••••</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                                            onClick={() => alert("For security reasons, saved passwords cannot be viewed in plain text.\n\nYou can reset the password by clicking 'Modify'.")}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Status Cell */}
                                            <TableCell className="align-middle">
                                                {cred.portalUser ? (
                                                    <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                                                        <UserCheck className="h-4 w-4" />
                                                        Configured
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground text-sm">Not Configured</div>
                                                )}
                                            </TableCell>

                                            {/* Actions Cell */}
                                            <TableCell className="text-right align-middle">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button size="sm" onClick={() => handleSave(cred.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                                            <Save className="h-4 w-4 mr-1" /> Save
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => startEdit(cred)}>
                                                        Modify
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ClientCredentialsPage;
