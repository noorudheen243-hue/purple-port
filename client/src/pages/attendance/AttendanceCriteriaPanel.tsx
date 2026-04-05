import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, RefreshCw, Pencil, Power, PowerOff } from 'lucide-react';
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
    const [editingRule, setEditingRule] = useState<AttendanceRule | null>(null);
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

    const handleParamChange = (key: string, value: any) => {
        setEditParams((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSaveParams = async () => {
        if (!editingRule) return;
        setIsSaving(editingRule.id);
        try {
            const { data } = await api.patch(`/attendance/admin/criteria/configs/${editingRule.id}`, { 
                parameters: editParams 
            });
            setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, parameters: JSON.stringify(editParams) } : r));
            setEditingRule(null);
        } catch (error) {
            alert("Failed to save parameters");
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
                    <Badge variant="outline" className="ml-auto">{groupRules.length} Rules</Badge>
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
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 ml-auto"
                                        onClick={() => handleEditStart(rule)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
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
                     <Button variant="outline" size="sm" onClick={fetchRules} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Sync
                     </Button>
                </div>
            </div>

            {renderRuleGroup('PRESENT', 'Present Rules', 'border-green-500 text-green-700')}
            {renderRuleGroup('HALF_DAY', 'Half-Day Rules', 'border-orange-500 text-orange-700')}
            {renderRuleGroup('ABSENT', 'Absent Rules', 'border-red-500 text-red-700')}

            {editingRule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5 text-purple-600" />
                                Edit Rule: {editingRule.rule_code}
                            </CardTitle>
                            <CardDescription>{editingRule.name}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {Object.entries(editParams).map(([key, value]) => (
                                <div key={key} className="space-y-2">
                                    <Label className="capitalize">{key.replace('_', ' ')}</Label>
                                    <Input 
                                        type={typeof value === 'number' ? 'number' : 'text'}
                                        value={value as any}
                                        onChange={(e) => handleParamChange(key, typeof value === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                    />
                                </div>
                            ))}
                            {Object.entries(editParams).length === 0 && (
                                <div className="text-center py-6 text-muted-foreground italic text-sm">
                                    No configurable parameters for this rule.
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setEditingRule(null)}>Cancel</Button>
                                <Button onClick={handleSaveParams} className="gap-2 bg-purple-700 hover:bg-purple-800">
                                    <Save className="h-4 w-4" /> Save Configuration
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
