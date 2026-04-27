import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, History, LayoutDashboard, Search } from 'lucide-react';
import StrategyWizard from './index';
import SavedStrategiesTab from './SavedStrategiesTab';
import StrategyDashboard from './StrategyDashboard';
import { Button } from '../../../components/ui/button';
import { useSearchParams } from 'react-router-dom';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import api from '../../../lib/api';
import Swal from 'sweetalert2';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { ROLES } from '../../../utils/roles';
import DataSheetForm from './DataSheetForm';
import DataCentreTab from './DataCentreTab';
import { Database, FileText } from 'lucide-react';

interface StrategyManagerProps {
    clientId: string;
    selectedClient?: any;
    clients?: any[];
}

const StrategyManager: React.FC<StrategyManagerProps> = ({ clientId: propClientId, selectedClient, clients }) => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Strategy Switching Logic
    const [strategyMode, setStrategyMode] = useState<'prospect' | 'existing'>('prospect');
    const [prospectName, setProspectName] = useState('');
    const [selectedExistingId, setSelectedExistingId] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const { user } = useAuthStore();
    const isDeveloperAdmin = user?.role === ROLES.DEVELOPER_ADMIN;

    const [showDataSheet, setShowDataSheet] = useState(false);
    const [activeMasterId, setActiveMasterId] = useState<string | undefined>(undefined);

    const handleStartStrategy = async () => {
        if (strategyMode === 'prospect') {
            if (!prospectName.trim()) {
                Swal.fire('Required', 'Please enter a prospect name', 'warning');
                return;
            }
            setIsStarting(true);
            try {
                const res = await api.post('/clients', { 
                    name: prospectName, 
                    status: 'PROSPECT',
                    ledger_options: { create: false }
                });
                const newClient = res.data;
                await queryClient.invalidateQueries({ queryKey: ['clients-all'] });
                await queryClient.invalidateQueries({ queryKey: ['strategy-versions'] });
                await queryClient.refetchQueries({ queryKey: ['strategy-versions'] });
                
                const params = new URLSearchParams(searchParams);
                params.set('clientId', newClient.id);
                setSearchParams(params);
                setProspectName('');
                setActiveSubTab('saved');
                
                Swal.fire({
                    icon: 'success',
                    title: 'Strategy Started',
                    text: `Starting strategy: ${prospectName}`,
                    timer: 1500,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            } catch (error: any) {
                Swal.fire('Error', error.response?.data?.message || 'Failed to create prospect', 'error');
            } finally {
                setIsStarting(false);
            }
        } else {
            if (!selectedExistingId) {
                Swal.fire('Required', 'Please select a client from the list', 'warning');
                return;
            }
            const params = new URLSearchParams(searchParams);
            params.set('clientId', selectedExistingId);
            setSearchParams(params);
        }
    };
    
    const [activeSubTab, setActiveSubTab] = useState('wizard');
    const [viewingVersion, setViewingVersion] = useState<any>(null);
    const [editingVersion, setEditingVersion] = useState<any>(null);

    // Use current search param clientId if prop is empty
    const clientId = propClientId || searchParams.get('clientId') || '';

    const handleViewVersion = (version: any) => {
        setViewingVersion(version);
        setActiveSubTab('view');
    };

    const handleEditVersion = (version: any) => {
        setEditingVersion(version);
        setActiveSubTab('wizard');
        
        // If it's a draft, update the URL clientId to that prospect
        if (version.isDraft) {
            const params = new URLSearchParams(window.location.search);
            params.set('clientId', version.clientId);
            setSearchParams(params);
        }
    };

    const handleCloseView = () => {
        setViewingVersion(null);
        setActiveSubTab('saved');
    };

    return (
        <div className="w-full space-y-4">
            <Tabs value={activeSubTab} onValueChange={(v) => {
                setActiveSubTab(v);
                if (v !== 'view') setViewingVersion(null);
                if (v !== 'wizard') setEditingVersion(null);
            }} className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 px-1">
                    <TabsList className="bg-gray-100/80 p-1 rounded-2xl h-auto gap-1">
                        <TabsTrigger 
                            value="wizard" 
                            className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all"
                        >
                            <Sparkles className="w-4 h-4 mr-2" /> Construction
                        </TabsTrigger>
                        <TabsTrigger 
                            value="saved" 
                            className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all"
                        >
                            <History className="w-4 h-4 mr-2" /> Created Strategies
                        </TabsTrigger>
                        {isDeveloperAdmin && (
                            <TabsTrigger 
                                value="datacentre" 
                                className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all"
                            >
                                <Database className="w-4 h-4 mr-2" /> Data Centre
                            </TabsTrigger>
                        )}
                        {viewingVersion && (
                            <TabsTrigger 
                                value="view" 
                                className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all"
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" /> View Mode
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {activeSubTab === 'wizard' && (
                        <div className="bg-white/80 backdrop-blur-md p-1.5 pl-3 rounded-[1.5rem] border border-gray-100 shadow-lg shadow-indigo-50/20 flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${strategyMode === 'prospect' ? 'text-indigo-600' : 'text-gray-400'}`}>Strategy Name</span>
                                <Switch 
                                    checked={strategyMode === 'existing'} 
                                    onCheckedChange={(checked) => setStrategyMode(checked ? 'existing' : 'prospect')}
                                    className="scale-75 data-[state=checked]:bg-indigo-600"
                                />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${strategyMode === 'existing' ? 'text-indigo-600' : 'text-gray-400'}`}>Existing Client</span>
                            </div>

                            {strategyMode === 'prospect' ? (
                                <Input 
                                    placeholder="Enter Strategy Title..." 
                                    value={prospectName}
                                    onChange={(e) => setProspectName(e.target.value)}
                                    className="bg-white border-none shadow-none focus-visible:ring-0 font-bold text-xs h-9 w-64"
                                />
                            ) : (
                                <Select value={selectedExistingId} onValueChange={setSelectedExistingId}>
                                    <SelectTrigger className="bg-white border-none shadow-none focus:ring-0 font-bold text-xs h-9 w-64">
                                        <SelectValue placeholder="Select Client..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-2xl">
                                        {clients?.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Button 
                                size="sm" 
                                onClick={handleStartStrategy}
                                disabled={isStarting}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-4 h-9 shadow-md shadow-indigo-100 transition-all hover:scale-105 uppercase text-[10px] tracking-widest"
                            >
                                {isStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
                            </Button>

                            {isDeveloperAdmin && (
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => {
                                        setActiveMasterId(undefined);
                                        setShowDataSheet(true);
                                    }}
                                    className="border-indigo-100 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold px-4 h-9 uppercase text-[10px] tracking-widest"
                                >
                                    <FileText className="w-3 h-3 mr-2" /> Data Sheet
                                </Button>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'view' && (
                        <Button 
                            variant="ghost" 
                            onClick={handleCloseView}
                            className="text-gray-400 hover:text-gray-600 font-bold"
                        >
                            Back to Archive
                        </Button>
                    )}
                </div>

                <TabsContent value="wizard" className="mt-0 focus-visible:outline-none w-full">
                    {!clientId && !editingVersion ? (
                        <div className="w-full min-h-[500px] flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 text-indigo-200">
                                <Search size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">No Client Selected</h2>
                            <p className="text-gray-500 font-medium text-center max-w-sm mb-8">
                                Please select or create a prospect using the switcher in the top header to start building a strategy.
                            </p>
                        </div>
                    ) : (
                        <StrategyWizard 
                            clientId={clientId} 
                            selectedClient={selectedClient} 
                            initialData={editingVersion ? {
                                input: editingVersion.input_snapshot ? JSON.parse(editingVersion.input_snapshot) : null,
                                output: editingVersion.output_snapshot ? JSON.parse(editingVersion.output_snapshot) : null
                            } : null}
                            onSaveSuccess={() => setActiveSubTab('saved')}
                        />
                    )}
                </TabsContent>

                <TabsContent value="datacentre" className="mt-0 focus-visible:outline-none w-full">
                    <DataCentreTab 
                        clientId={clientId} 
                        onEdit={(id) => {
                            setActiveMasterId(id);
                            setShowDataSheet(true);
                        }}
                        onView={(id) => {
                            setActiveMasterId(id);
                            setShowDataSheet(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="saved" className="mt-0 focus-visible:outline-none w-full">
                    <SavedStrategiesTab 
                        clientId={clientId} 
                        onView={handleViewVersion} 
                        onEdit={handleEditVersion}
                    />
                </TabsContent>

                <TabsContent value="view" className="mt-0 focus-visible:outline-none w-full">
                    {viewingVersion && (
                        <div className="space-y-8 w-full">
                            <div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4 w-full">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600">
                                        <LayoutDashboard size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-indigo-900">Viewing Archived Strategy</h3>
                                        <p className="text-sm text-indigo-600/70 font-bold uppercase tracking-widest">Saved on {new Date(viewingVersion.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={() => handleEditVersion(viewingVersion)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold h-11 px-6 shadow-lg shadow-indigo-100">
                                        Edit this Version
                                    </Button>
                                    <Button variant="outline" onClick={handleCloseView} className="rounded-xl border-indigo-200 text-indigo-600 font-bold h-11 px-6">
                                        Close Preview
                                    </Button>
                                </div>
                            </div>
                            <div className="w-full">
                                <StrategyDashboard 
                                    strategy={{
                                        output: JSON.parse(viewingVersion.output_snapshot),
                                        assumptions: JSON.parse(viewingVersion.output_snapshot).assumptions || []
                                    }} 
                                    onReset={handleCloseView} 
                                />
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Data Sheet Modal Overlay */}
            {showDataSheet && (
                <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-4 md:p-8">
                    <div className="w-full max-w-7xl h-[95vh] animate-in zoom-in-95 duration-300">
                        <DataSheetForm 
                            clientId={clientId} 
                            masterId={activeMasterId}
                            onClose={() => {
                                setShowDataSheet(false);
                                setActiveMasterId(undefined);
                                queryClient.invalidateQueries({ queryKey: ['strategy-masters', clientId] });
                            }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StrategyManager;
