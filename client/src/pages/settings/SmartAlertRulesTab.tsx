import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Sparkles, Save, Clock, Users, Activity, MessageSquare, Plus, Trash2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

const DEFAULT_RULES = [
    { name: 'Task Overdue Level 1', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 1 }), message_template: "Task '{task_name}' is pending beyond expected time. Please take action." },
    { name: 'Task Overdue Level 2 (Manager)', trigger_type: 'TASK_DELAY', config_json: JSON.stringify({ threshold_days: 3 }), message_template: "Urgent: '{task_name}' assigned to {staff_name} is delayed by {delay_days} days." },
    { name: 'Attendance Pattern Warning', trigger_type: 'ATTENDANCE_PATTERN', config_json: JSON.stringify({ threshold_count: 3, period_days: 7 }), message_template: "You have been marked late {late_count} times this week." },
    { name: 'Request Pending Alert', trigger_type: 'PENDING_REQUEST', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "A leave/regularization request by {staff_name} is pending for more than 24 hours." },
    { name: 'MoM Followup Alert', trigger_type: 'MEETING_FOLLOWUP', config_json: JSON.stringify({ threshold_hours: 24 }), message_template: "MoM for meeting '{meeting_title}' is pending over 24 hours." },
    { name: 'Payroll Reminder', trigger_type: 'PAYROLL', config_json: JSON.stringify({ expected_day: 1 }), message_template: "Payroll processing for the current cycle is pending." }
];

export const SmartAlertRulesTab = () => {
    const queryClient = useQueryClient();
    const { data: dbRules = [], isLoading } = useQuery({
        queryKey: ['aiRules'],
        queryFn: async () => (await api.get('/notifications/rules')).data,
        staleTime: 0 // Fetch every time to ensure up-to-date
    });

    const [rules, setRules] = React.useState<any[]>([]);
    const hasSyncedRef = React.useRef(false);

    React.useEffect(() => {
        if (!isLoading && !hasSyncedRef.current) {
            if (dbRules && dbRules.length > 0) {
                setRules(dbRules);
            } else {
                setRules(DEFAULT_RULES);
            }
            hasSyncedRef.current = true;
        }
    }, [dbRules, isLoading]);

    const saveMutation = useMutation({
        mutationFn: async (data: any[]) => await api.post('/notifications/rules/batch', { rules: data }),
        onSuccess: () => {
            Swal.fire('Success', 'AI Alert rules updated successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['aiRules'] });
        },
        onError: (err: any) => Swal.fire('Error', err.response?.data?.message || err.message, 'error')
    });

    const updateRuleField = (index: number, field: string, value: any) => {
        const updated = [...rules];
        updated[index] = { ...updated[index], [field]: value };
        setRules(updated);
    };

    const updateConfigField = (index: number, key: string, value: any) => {
        const updated = [...rules];
        const config = JSON.parse(updated[index].config_json || '{}');
        config[key] = value;
        updated[index].config_json = JSON.stringify(config);
        setRules(updated);
    };

    const addNewRule = () => {
        const newRule = {
            id: `new-${Date.now()}`,
            name: 'New Custom Alert Rule',
            trigger_type: 'CUSTOM',
            config_json: JSON.stringify({ threshold_days: 1 }),
            message_template: "Automated Alert: Action required for {staff_name}.",
            is_active: true
        };
        setRules([newRule, ...rules]); // Add to top for visibility
    };

    const removeRule = (idx: number) => {
        const updated = [...rules];
        updated.splice(idx, 1);
        setRules(updated);
    };

    if (isLoading) {
        return (
            <div className="p-20 text-center flex flex-col items-center gap-4 bg-white rounded-2xl shadow-sm border">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-x-0 inset-y-0 m-auto text-indigo-400" size={24} />
                </div>
                <p className="text-gray-500 font-semibold text-lg animate-pulse">Initializing AI Smart Triggers...</p>
                <span className="text-xs text-indigo-400/60 max-w-xs">Connecting to the business intelligence layer on qixport.com...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="bg-indigo-600 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 transform transition-all hover:scale-[1.01]">
                <div className="flex items-center gap-6">
                    <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                        <Sparkles size={40} className="text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.5)]" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black tracking-tight">AI Predictive Engine</h2>
                        <p className="text-indigo-100/80 text-sm font-medium">Fine-tune dynamic triggers for task escalations and business anomalies.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button 
                        onClick={addNewRule}
                        variant="ghost"
                        className="bg-indigo-500/30 hover:bg-white/20 text-white font-bold px-6 border border-white/10"
                    >
                        <Plus size={18} className="mr-2" /> New Rule
                    </Button>
                    <Button 
                        onClick={() => saveMutation.mutate(rules)} 
                        className="bg-white text-indigo-700 hover:bg-white/90 font-black px-10 h-12 shadow-xl shadow-indigo-900/20 active:scale-95 transition-all"
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? 'Syncing...' : <><Save size={20} className="mr-2" /> Sync Engine</>}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rules.map((rule, idx) => (
                    <Card key={rule.id || idx} className="border-indigo-100 hover:border-indigo-400 transition-all shadow-lg hover:shadow-indigo-100/50 rounded-2xl overflow-hidden group">
                        <CardHeader className="pb-4 border-b border-indigo-50 bg-indigo-50/20 px-6">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-md flex items-center gap-2 text-indigo-900 font-bold">
                                    {(rule.trigger_type === 'TASK_DELAY' || rule.trigger_type === 'CUSTOM') && <Clock size={16} className="text-blue-600" />}
                                    {rule.trigger_type === 'ATTENDANCE_PATTERN' && <Users size={16} className="text-indigo-600" />}
                                    {rule.trigger_type === 'PENDING_REQUEST' && <Activity size={16} className="text-red-500" />}
                                    {rule.trigger_type === 'MEETING_FOLLOWUP' && <MessageSquare size={16} className="text-teal-500" />}
                                    <input 
                                        className="bg-transparent border-none outline-none focus:ring-0 w-full"
                                        value={rule.name}
                                        onChange={(e) => updateRuleField(idx, 'name', e.target.value)}
                                    />
                                </CardTitle>
                                <div className="flex items-center gap-4">
                                    <Switch 
                                        checked={rule.is_active !== false} 
                                        onCheckedChange={(val: boolean) => updateRuleField(idx, 'is_active', val)} 
                                    />
                                    <button 
                                        onClick={() => removeRule(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <CardDescription className="capitalize font-medium text-indigo-600/60 text-xs">Target: Cross-Channel Notifications</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5 px-6 pb-6">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configuration Logic</label>
                                    <select 
                                        className="text-xs font-bold text-indigo-700 bg-indigo-50 border-none rounded-md px-2 py-1 outline-none appearance-none"
                                        value={rule.trigger_type}
                                        onChange={(e) => updateRuleField(idx, 'trigger_type', e.target.value)}
                                    >
                                        <option value="TASK_DELAY">Task Delay</option>
                                        <option value="ATTENDANCE_PATTERN">Attendance Pattern</option>
                                        <option value="PENDING_REQUEST">Pending Request</option>
                                        <option value="MEETING_FOLLOWUP">Meeting Followup</option>
                                        <option value="PAYROLL">Payroll cycle</option>
                                        <option value="CUSTOM">Custom Trigger</option>
                                    </select>
                                </div>
                                
                                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-inner flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle size={14} className="text-indigo-400" />
                                        <span className="text-sm font-semibold text-gray-700">Trigger Threshold:</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            className="w-20 h-9 rounded-lg border-indigo-100 text-center font-bold text-indigo-700" 
                                            value={JSON.parse(rule.config_json || '{}').threshold_days || JSON.parse(rule.config_json || '{}').threshold_count || JSON.parse(rule.config_json || '{}').threshold_hours || JSON.parse(rule.config_json || '{}').expected_day || 1} 
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                if (rule.trigger_type === 'TASK_DELAY') updateConfigField(idx, 'threshold_days', val);
                                                else if (rule.trigger_type === 'ATTENDANCE_PATTERN') updateConfigField(idx, 'threshold_count', val);
                                                else if (rule.trigger_type === 'PENDING_REQUEST' || rule.trigger_type === 'MEETING_FOLLOWUP') updateConfigField(idx, 'threshold_hours', val);
                                                else if (rule.trigger_type === 'PAYROLL') updateConfigField(idx, 'expected_day', val);
                                                else updateConfigField(idx, 'threshold_days', val);
                                            }}
                                        />
                                        <span className="text-xs font-bold text-gray-400 uppercase">
                                            {rule.trigger_type === 'TASK_DELAY' ? 'Days' : 
                                             rule.trigger_type === 'ATTENDANCE_PATTERN' ? 'Times' : 
                                             rule.trigger_type === 'PAYROLL' ? 'Day' : 'Hours'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dynamic AI Template</label>
                                <textarea 
                                    className="w-full h-24 p-4 text-sm bg-indigo-50/20 border-2 border-indigo-50/50 rounded-xl outline-none focus:border-indigo-200 transition-all font-medium text-gray-700 leading-relaxed shadow-sm"
                                    value={rule.message_template}
                                    onChange={(e) => updateRuleField(idx, 'message_template', e.target.value)}
                                    placeholder="Define the automated message..."
                                />
                                <div className="flex flex-wrap gap-1">
                                    {['{staff_name}', '{task_name}', '{delay_days}', '{meeting_title}'].map(tag => (
                                        <span key={tag} className="text-[9px] font-bold text-indigo-400 border border-indigo-100 px-1.5 py-0.5 rounded-md cursor-default pointer-events-none">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-center mt-10">
                <p className="text-[11px] text-indigo-800/60 font-medium italic">
                    The Smart AI system automatically learns from your threshold adjustments. Sync the engine to apply changes instantly on qixport.com.
                </p>
            </div>
        </div>
    );
};
