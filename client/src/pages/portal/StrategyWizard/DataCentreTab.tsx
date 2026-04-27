import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Button } from '../../../components/ui/button';
import { 
    Search, 
    Plus, 
    Eye, 
    Pencil, 
    Trash2, 
    FileText, 
    Calendar,
    User,
    ChevronRight,
    Loader2,
    Database,
    ExternalLink,
    CheckSquare,
    Square,
    Download
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Swal from 'sweetalert2';
import { exportStrategyTemplateDOCX } from '../../../utils/strategyExport';
import { Checkbox } from "@/components/ui/checkbox";

interface DataCentreTabProps {
    clientId: string;
    onEdit: (masterId: string) => void;
    onView: (masterId: string) => void;
}

const DataCentreTab: React.FC<DataCentreTabProps> = ({ clientId, onEdit, onView }) => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { data: masters, isLoading } = useQuery({
        queryKey: ['strategy-masters', clientId],
        queryFn: async () => (await api.get(`/marketing/strategy/data/masters?clientId=${clientId}`)).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => await api.delete(`/marketing/strategy/data/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategy-masters', clientId] });
            Swal.fire('Deleted', 'Strategy data has been removed.', 'success');
        }
    });

    const bulkDeleteMutation = useMutation({
        mutationFn: async (ids: string[]) => await api.post(`/marketing/strategy/data/bulk-delete`, { ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['strategy-masters', clientId] });
            setSelectedIds([]);
            Swal.fire('Deleted', 'Selected strategy records have been removed.', 'success');
        }
    });

    const handleDelete = (id: string, name: string) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete "${name}". This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete it'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(id);
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        
        Swal.fire({
            title: 'Bulk Delete',
            text: `Are you sure you want to delete ${selectedIds.length} selected records?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, delete all'
        }).then((result) => {
            if (result.isConfirmed) {
                bulkDeleteMutation.mutate(selectedIds);
            }
        });
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (selectedIds.length === filteredMasters?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredMasters?.map((m: any) => m.id) || []);
        }
    };

    const handleDownloadTemplate = async () => {
        await exportStrategyTemplateDOCX();
    };

    const filteredMasters = masters?.filter((m: any) => 
        m.strategy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 size={40} className="animate-spin text-indigo-600" />
                <p className="text-gray-500 font-bold">Accessing Data Centre...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <Database className="text-indigo-600" /> Central Data Centre
                    </h3>
                    <p className="text-gray-500 font-medium text-sm mt-1">Manage and reuse all raw strategy inputs and progressive drafts.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-grow lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 rounded-2xl bg-gray-50 border-none shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium"
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={handleDownloadTemplate}
                        className="rounded-2xl h-11 px-6 border-indigo-100 text-indigo-600 font-bold hover:bg-indigo-50"
                    >
                        <Download className="w-4 h-4 mr-2" /> Download Template
                    </Button>
                    {selectedIds.length > 0 && (
                        <Button 
                            variant="destructive" 
                            onClick={handleBulkDelete}
                            className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-red-100"
                        >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Selected ({selectedIds.length})
                        </Button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-indigo-100/20 overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow className="border-none hover:bg-transparent">
                            <TableHead className="w-12 pl-8">
                                <Checkbox 
                                    checked={selectedIds.length > 0 && selectedIds.length === filteredMasters?.length}
                                    onCheckedChange={toggleAll}
                                />
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 h-14">Strategy Details</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 h-14">Client</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 h-14">Last Updated</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 h-14">Status</TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 h-14 text-right pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMasters?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3 opacity-30">
                                        <Database size={48} />
                                        <p className="font-bold">No records found in the Data Centre</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredMasters?.map((master: any) => (
                                <TableRow key={master.id} className={`group border-b border-gray-50 transition-colors ${selectedIds.includes(master.id) ? 'bg-indigo-50/50' : 'hover:bg-indigo-50/30'}`}>
                                    <TableCell className="pl-8">
                                        <Checkbox 
                                            checked={selectedIds.includes(master.id)}
                                            onCheckedChange={() => toggleSelection(master.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                {master.strategy_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{master.strategy_name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">ID: {master.strategy_id || master.id.substring(0, 8)}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <User size={14} className="text-gray-400" />
                                            {master.client?.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                            <Calendar size={14} className="text-gray-400" />
                                            {new Date(master.updatedAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-wider ${
                                            master.status === 'Completed' ? 'bg-green-100 text-green-600 border-green-200' : 'bg-amber-100 text-amber-600 border-amber-200'
                                        }`}>
                                            {master.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => onEdit(master.id)}
                                                className="rounded-xl h-10 px-4 font-bold text-indigo-600 hover:bg-indigo-100/50"
                                            >
                                                <Pencil size={14} className="mr-2" /> Edit
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={() => handleDelete(master.id, master.strategy_name)}
                                                className="rounded-xl h-10 w-10 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default DataCentreTab;
