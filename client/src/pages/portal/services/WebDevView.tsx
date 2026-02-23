import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api';
import { WebDevProjectForm } from '../forms/WebDevProjectForm';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/authStore';
import { ArrowLeft, ExternalLink, Code, CheckCircle, Circle, Clock } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';

const WebDevView = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Manage Mode State
    const [editingProject, setEditingProject] = useState<any>(null); // For editing specific project

    const urlClientId = searchParams.get('clientId');
    const mode = searchParams.get('mode');

    const clientId = user?.role === 'CLIENT'
        ? user?.linked_client_id
        : urlClientId;

    const canManage = user?.role === 'ADMIN'
        || user?.role === 'MANAGER'
        || user?.role === 'DEVELOPER_ADMIN'
        || user?.role === 'MARKETING_EXEC'
        || user?.role === 'DM_EXECUTIVE'
        || user?.role === 'WEB_SEO_EXECUTIVE'
        || user?.role === 'CREATIVE_DESIGNER'
        || user?.role === 'OPERATIONS_EXECUTIVE';

    const isManageMode = canManage && mode === 'manage';

    const { data: projects, isLoading } = useQuery({
        queryKey: ['web-dev-projects', clientId],
        queryFn: async () => {
            if (!clientId) return [];
            const { data } = await api.get(`/client-portal/tracking/web-dev?clientId=${clientId}`);
            return data;
        },
        enabled: !!clientId
    });

    const { data: clientDetails } = useQuery({
        queryKey: ['client-details-web', clientId],
        queryFn: async () => (await api.get(`/clients/${clientId}`)).data,
        enabled: !!clientId
    });

    if (!clientId) return <div className="p-8 text-center">No Client Selected</div>;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PLANNING': return 'bg-gray-100 text-gray-800';
            case 'DESIGN': return 'bg-purple-100 text-purple-800';
            case 'DEVELOPMENT': return 'bg-blue-100 text-blue-800';
            case 'AMENDS': return 'bg-orange-100 text-orange-800';
            case 'TESTING': return 'bg-yellow-100 text-yellow-800';
            case 'DEPLOYED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Web Development Projects</h1>
                            {clientDetails && <p className="text-muted-foreground">{clientDetails.name}</p>}
                        </div>
                    </div>
                </div>
                {canManage && !isManageMode && (
                    <Button variant="outline" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>
                        Add Entry / Manage
                    </Button>
                )}
                {isManageMode && (
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        Management Mode
                    </div>
                )}
            </div>

            {isManageMode && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        {editingProject && (
                            <Button variant="ghost" onClick={() => setEditingProject(null)} className="mr-2">Cancel Edit</Button>
                        )}
                    </div>
                    {/* If editing, show form pre-filled. If not editing but in manage mode, show generic 'Add New' form (handled by same component logic typically, but let's be explicit) */}
                    <WebDevProjectForm
                        clientId={clientId}
                        existingProject={editingProject}
                        onSuccess={() => setEditingProject(null)}
                    />
                </div>
            )}

            <div className="space-y-6">
                {isLoading && <div className="text-center py-8">Loading projects...</div>}

                {projects?.map((project: any) => {
                    const milestones = typeof project.milestones_json === 'string' ? JSON.parse(project.milestones_json) : project.milestones_json;

                    // Calc progress
                    const totalM = milestones?.length || 0;
                    const completedM = milestones?.filter((m: any) => m.status === 'COMPLETED').length || 0;
                    const progress = totalM === 0 ? 0 : Math.round((completedM / totalM) * 100);

                    return (
                        <Card key={project.id} className="overflow-hidden border-l-4 border-l-blue-500">
                            <CardHeader className="bg-gray-50/50 border-b flex flex-row items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <CardTitle className="text-xl flex items-center gap-2">
                                            <Code size={20} className="text-blue-500" /> {project.project_name}
                                        </CardTitle>
                                        <Badge variant="secondary" className={`${getStatusColor(project.status)}`}>
                                            {project.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        Started on {new Date(project.createdAt).toLocaleDateString()}
                                    </CardDescription>
                                </div>
                                {isManageMode && (
                                    <Button size="sm" variant="outline" onClick={() => { setEditingProject(project); window.scrollTo(0, 0); }}>Edit</Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-6">
                                {/* Links & Progress */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Parameters</h3>
                                        <div className="flex items-center justify-between bg-white border p-3 rounded-md">
                                            <span className="text-sm font-medium">Progress</span>
                                            <div className="flex items-center gap-3 w-1/2">
                                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <span className="text-sm font-bold text-blue-600">{progress}%</span>
                                            </div>
                                        </div>
                                        {project.staging_url && (
                                            <div className="flex items-center justify-between bg-white border p-3 rounded-md hover:border-blue-300 transition-colors">
                                                <span className="text-sm font-medium">Staging URL</span>
                                                <a href={project.staging_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                                    Visit <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                        {project.live_url && (
                                            <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-md">
                                                <span className="text-sm font-medium text-green-900">Live URL</span>
                                                <a href={project.live_url} target="_blank" rel="noreferrer" className="text-sm text-green-700 hover:underline flex items-center gap-1 font-bold">
                                                    Visit Live <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Milestone Timeline</h3>
                                        <div className="space-y-0 relative border-l-2 border-gray-100 ml-3">
                                            {milestones?.map((m: any, idx: number) => (
                                                <div key={idx} className="mb-6 ml-6 relative">
                                                    <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 ${m.status === 'COMPLETED' ? 'bg-green-500 border-green-500' : (m.status === 'IN_PROGRESS' ? 'bg-white border-blue-500 animate-pulse' : 'bg-white border-gray-300')}`}></span>
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-sm font-medium ${m.status === 'COMPLETED' ? 'text-gray-900 line-through opacity-70' : 'text-gray-900'}`}>{m.name}</h4>
                                                        {m.date && <span className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString()}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {m.status === 'COMPLETED' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} /> Completed</span>}
                                                        {m.status === 'IN_PROGRESS' && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10} /> In Progress</span>}
                                                        {m.status === 'PENDING' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1"><Circle size={10} /> Pending</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!milestones || milestones.length === 0) && <p className="text-sm text-muted-foreground ml-6 italic">No milestones defined.</p>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {projects?.length === 0 && !isLoading && (
                    <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
                        <Code className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">No Web Projects Tracking</h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto mt-2">Activate a new project in management mode to start tracking milestones and progress.</p>
                        {canManage && !isManageMode && (
                            <Button className="mt-4" onClick={() => navigate(`?mode=manage&clientId=${clientId}`)}>Add First Project</Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebDevView;
