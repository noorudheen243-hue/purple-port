import React, { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { ROLES } from '../../../utils/roles';
import { MyResignationView } from './MyResignationView';
import { ResignationManagerView } from './ResignationManagerView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs'; // Assuming shadcn tabs
import { FileText, Users } from 'lucide-react';

const ResignationPage = () => {
    const { user } = useAuthStore();
    const canManage = user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER || user?.role === ROLES.DEVELOPER_ADMIN;

    // If regular staff, just show MyResignationView
    if (!canManage) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Relieve / Resignation</h1>
                <MyResignationView />
            </div>
        );
    }

    // Determine default tab? usually team view for managers
    return (
        <div className="p-6 h-full flex flex-col">
            <h1 className="text-2xl font-bold mb-6">Relieve / Resignation</h1>

            <Tabs defaultValue="team" className="h-full flex flex-col">
                <TabsList className="bg-muted w-fit mb-6">
                    <TabsTrigger value="team" className="flex items-center gap-2">
                        <Users size={16} /> Team Requests
                    </TabsTrigger>
                    <TabsTrigger value="my" className="flex items-center gap-2">
                        <FileText size={16} /> My Application
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="team" className="flex-1 overflow-auto">
                    <ResignationManagerView />
                </TabsContent>

                <TabsContent value="my" className="flex-1 overflow-auto">
                    <div className="max-w-4xl mx-auto">
                        <MyResignationView />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ResignationPage;
