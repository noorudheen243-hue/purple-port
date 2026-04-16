import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, RefreshCw, Pencil, Trash2, Plus, PlayCircle } from 'lucide-react';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import api from '../../lib/api';

interface AttendanceRule {
    id: string;
    rule_type: 'PRESENT' | 'HALF_DAY' | 'ABSENT';
    rule_code: string;
    name: string;
    description: string;
    is_enabled: boolean;
    parameters: string;
}

const AttendanceCriteriaPanel = () => {
    const [rules, setRules] = useState<AttendanceRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState<string | null>(null);
    const [editingRule, setEditingRule] = useState<Partial<AttendanceRule> | null>(null);
    const [editParams, setEditParams] = useState<any>({});

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/attendance/admin/criteria/configs');
            setRules(data);
        } catch (error) {
            console.error("Failed to fetch rules", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        setIsSaving(id);
        try {
            await api.patch(`/attendance/admin/criteria/configs/${id}`, { is_enabled: !currentStatus });
            setRules(prev => prev.map(r => r.id === id ? { ...r, is_enabled: !currentStatus } : r));
        } catch (error) {
            alert("Failed to update rule status");
        } finally {
            setIsSaving(null);
        }
    };

    const handleEditStart = (rule: AttendanceRule) => {
        setEditingRule(rule);
        setEditParams(JSON.parse(rule.parameters || '{}'));
    };

    const handleAddStart = (type: 'PRESENT' | 'HALF_DAY' | 'ABSENT') => {
        setEditingRule({
            rule_type: type,
            rule_code: '',
            name: '',
            description: '',
            parameters: '{}',
            is_enabled: true
        });
        setEditParams({});
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this rule? This may affect future attendance calculations.")) return;
        try {
            await api.delete(`/attendance/admin/criteria/configs/${id}`);
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            alert("Failed to delete rule");
        }
    };

    const handleSyncDefaults = async () => {
        if (!confirm("This will add any missing standard rules. Continue?")) return;
        setIsLoading(true);
        try {
            const { data } = await api.post('/attendance/admin/criteria/sync-defaults');
            alert(data.message);
            fetchRules();
        } catch (error) {
            alert("Failed to sync default rules");
        } finally {
            setIsLoading(false);
        }
    };

    const handleParamChange = (key: string, value: any) => {
        setEditParams((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSaveRule = async () => {
        if (!editingRule) return;
        
        const payload = {
            ...editingRule,
            parameters: editParams
        };

        try {
            if (editingRule.id) {
                setIsSaving(editingRule.id);
                await api.patch(`/attendance/admin/criteria/configs/${editingRule.id}`, payload);
                setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...payload, parameters: JSON.stringify(editParams) } as AttendanceRule : r));
            } else {
                const { data } = await api.post('/attendance/admin/criteria/configs', payload);
                setRules(prev => [...prev, data]);
            }
            setEditingRule(null);
        } catch (error: any) {
            alert(error.response?.data?.message || "Failed to save rule");
        } finally {
            setIsSaving(null);
        }
    };

    const renderRuleGroup = (type: string, title: string, colorClass: string) => {
        const groupRules = rules.filter(r => r.rule_type === type);
        return (
            <div className="space-y-4">
                <div className={`flex items-center gap-2 border-l-4 ${colorClass} pl-3 py-1 mb-4`}>
                    <h3 className="text-lg font-bold uppercase tracking-wider">{title}</h3>
                    <Badge variant="outline" className="ml-2">{groupRules.length} Rules</Badge>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="ml-auto h-7 gap-1 text-xs hover:bg-primary/5"
                        onClick={() => handleAddStart(type as any)}
                    >
                        <Plus className="h-3 w-3" /> Add Rule
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {groupRules.map(rule => (
                        <Card key={rule.id} className={`relative overflow-hidden ${!rule.is_enabled ? 'opacity-60 bg-muted/20' : 'bg-card'}`}>
                            {!rule.is_enabled && (
                                <div className="absolute top-2 right-12 z-10">
                                    <Badge variant="secondary" className="bg-gray-200">Disabled</Badge>
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-muted p-1 rounded font-mono text-xs font-bold w-7 h-7 flex items-center justify-center">
                                            {rule.rule_code}
                                        </div>
                                        <CardTitle className="text-base">{rule.name}</CardTitle>
                                    </div>
                                    <Switch 
                                        checked={rule.is_enabled}
                                        onCheckedChange={() => handleToggle(rule.id, rule.is_enabled)}
                                        disabled={isSaving === rule.id}
                                    />
                                </div>
                                <CardDescription className="text-xs leading-relaxed mt-1">
                                    {rule.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {Object.entries(JSON.parse(rule.parameters || '{}')).map(([key, value]) => (
                                        <div key={key} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-[10px] font-medium border">
                                            <span className="text-muted-foreground uppercase">{key.replace('_', ' ')}:</span>
                                            <span className="text-primary font-bold">{value as any}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1 ml-auto">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                            onClick={() => handleEditStart(rule)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDelete(rule.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
                <p className="text-muted-foreground font-medium">Loading attendance rules...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-10">
            <div className="flex items-center justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Attendance Engine Configuration</h2>
                        <p className="text-sm text-muted-foreground">Define global criteria for classification of attendance status.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={handleSyncDefaults} className="gap-2 border-primary/20 text-primary hover:bg-primary/5">
                        <PlayCircle className="h-4 w-4" /> Sync Default Rules
                     </Button>
                     <Button variant="outline" size="sm" onClick={fetchRules} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                     </Button>
                </div>
            </div>

            {renderRuleGroup('PRESENT', 'Present Rules', 'border-green-500 text-green-700')}
            {renderRuleGroup('HALF_DAY', 'Half-Day Rules', 'border-orange-500 text-orange-700')}
            {renderRuleGroup('ABSENT', 'Absent Rules', 'border-red-500 text-red-700')}

            {editingRule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader className="border-b pb-4 mb-4">
                            <CardTitle className="flex items-center gap-2">
                                {editingRule.id ? <Pencil className="h-5 w-5 text-purple-600" /> : <Plus className="h-5 w-5 text-green-600" />}
                                {editingRule.id ? 'Edit Attendance Rule' : 'Add New Attendance Rule'}
                            </CardTitle>
                            <CardDescription>Configure the criteria logic and parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Rule Code</Label>
                                    <Input 
                                        placeholder="e.g. A1" 
                                        value={editingRule.rule_code}
                                        onChange={(e) => setEditingRule({...editingRule, rule_code: e.target.value.toUpperCase()})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rule Type</Label>
                                    <select 
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                        value={editingRule.rule_type}
                                        onChange={(e) => setEditingRule({...editingRule, rule_type: e.target.value as any})}
                                    >
                                        <option value="PRESENT">PRESENT</option>
                                        <option value="HALF_DAY">HALF_DAY</option>
                                        <option value="ABSENT">ABSENT</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Rule Name</Label>
                                <Input 
                                    placeholder="Brief name for the rule" 
                                    value={editingRule.name}
                                    onChange={(e) => setEditingRule({...editingRule, name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <textarea 
                                    className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-sm"
                                    placeholder="Explain when this rule applies..."
                                    value={editingRule.description}
                                    onChange={(e) => setEditingRule({...editingRule, description: e.target.value})}
                                />
                            </div>

                            <div className="pt-2 border-t">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Parameters (JSON Configuration)</Label>
                                {Object.entries(editParams).map(([key, value]) => (
                                    <div key={key} className="space-y-2 mb-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="capitalize text-xs">{key.replace('_', ' ')}</Label>
                                            <Button variant="ghost" size="sm" className="h-5 text-[10px] text-destructive" onClick={() => {
                                                const newParams = {...editParams};
                                                delete newParams[key];
                                                setEditParams(newParams);
                                            }}>Remove</Button>
                                        </div>
                                        <Input 
                                            type={typeof value === 'number' ? 'number' : 'text'}
                                            value={value as any}
                                            onChange={(e) => handleParamChange(key, typeof value === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                        />
                                    </div>
                                ))}
                                
                                <div className="flex gap-2 mt-4">
                                    <Input id="new-param-key" placeholder="New Parameter Key" className="h-8 text-xs" />
                                    <Button size="sm" variant="secondary" className="h-8" onClick={() => {
                                        const keyInput = document.getElementById('new-param-key') as HTMLInputElement;
                                        if (keyInput.value) {
                                            handleParamChange(keyInput.value, "");
                                            keyInput.value = "";
                                        }
                                    }}>Add Param</Button>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                                <Button onClick={handleSaveRule} className="gap-2 bg-purple-700 hover:bg-purple-800">
                                    <Save className="h-4 w-4" /> {editingRule.id ? 'Update Rule' : 'Create Rule'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                    <p className="font-bold mb-1">Important Implementation Note:</p>
                    <p>Changing these rules will affect all <strong>future</strong> attendance calculations. Historical records will remain unchanged unless you specifically use the "Bulk Recalculate" feature.</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCriteriaPanel;
