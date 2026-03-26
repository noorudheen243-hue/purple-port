import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { MessageCircle, Save, Loader2, Send, CheckCircle2, ShieldCheck, Zap, Key } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import api from '../../lib/api';
import Swal from 'sweetalert2';

export const WhatsAppIntegration = () => {
    const [waNumber, setWaNumber] = useState('');
    const [apiUrl, setApiUrl] = useState('');
    const [apiToken, setApiToken] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    
    // Trial state
    const [testPhone, setTestPhone] = useState('');
    const [testMode, setTestMode] = useState(false);
    const [lastTrial, setLastTrial] = useState<any>(null);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data } = await api.get('/settings');
                if (data.WHATSAPP_NUMBER) {
                    setWaNumber(data.WHATSAPP_NUMBER);
                    setTestPhone(data.WHATSAPP_NUMBER);
                }
                if (data.WHATSAPP_API_URL) setApiUrl(data.WHATSAPP_API_URL);
                if (data.WHATSAPP_API_TOKEN) setApiToken(data.WHATSAPP_API_TOKEN);
                if (data.WHATSAPP_ENABLED) setEnabled(data.WHATSAPP_ENABLED === 'true');
            } catch (err) {
                console.error("Failed to fetch WA config", err);
            } finally {
                setFetching(false);
            }
        };
        fetchConfig();
    }, []);

    const handleSave = async () => {
        let finalUrl = apiUrl.trim();
        // AUTO-FORMAT FOR ULTRAMSG (COMMON CAUSE OF FAILURE)
        if (finalUrl.includes('ultramsg.com') && !finalUrl.endsWith('/messages/chat')) {
            // Remove trailing slashes first
            finalUrl = finalUrl.replace(/\/+$/, '') + '/messages/chat';
            setApiUrl(finalUrl);
        }

        try {
            setLoading(true);
            await api.post('/settings/batch', {
                settings: {
                    'WHATSAPP_NUMBER': waNumber,
                    'WHATSAPP_API_URL': finalUrl,
                    'WHATSAPP_API_TOKEN': apiToken,
                    'WHATSAPP_ENABLED': String(enabled)
                }
            });
            Swal.fire('Success', 'WhatsApp Gateway Pulse Updated', 'success');
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to save', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSendTrial = async () => {
        if (!testPhone) return Swal.fire('Error', 'Enter a phone number for trial', 'error');
        try {
            setTestMode(true);
            const { data } = await api.post('/notifications/wa-test', {
                phoneNumber: testPhone,
                message: "Hello! This is a Qix Ads AI Smart Trial message. Your WhatsApp integration is active."
            });
            setLastTrial({
                ...data,
                timestamp: new Date().toLocaleTimeString(),
                phoneNumber: testPhone
            });
            Swal.fire('Trial Dispatched', `Response: ${data.status}\nGateway: ${data.gateway}`, 'success');
        } catch (err: any) {
            Swal.fire('Trial Failed', 'Make sure Gateway settings are valid.', 'warning');
        } finally {
            setTestMode(false);
        }
    }

    if (fetching) return <div className="p-10 text-center text-sm text-indigo-500 font-black animate-pulse uppercase tracking-[0.3em]">Synching with Satellite...</div>;

    return (
        <div className="space-y-6">
            <Card className="shadow-2xl border-indigo-100 overflow-hidden bg-white/50 backdrop-blur-md">
                <CardHeader className="bg-indigo-900 text-white pb-8 pt-10">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl flex items-center gap-4">
                                <div className="bg-white/10 p-2 rounded-2xl backdrop-blur-md">
                                     <MessageCircle size={28} />
                                </div>
                                WhatsApp Global Gateway
                            </CardTitle>
                            <CardDescription className="text-white/60 font-medium">Link your business WhatsApp API instance to the AI brain.</CardDescription>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest ${enabled ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] text-white'}`}>
                            {enabled ? 'System Live' : 'Maintenance Mode'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-widest">
                                <MessageCircle size={14} className="text-indigo-400" /> WhatsApp Gateway #
                            </div>
                            <Input 
                                value={waNumber} 
                                onChange={e => setWaNumber(e.target.value)} 
                                className="bg-gray-50 border-gray-200 h-12 focus:ring-indigo-500 rounded-2xl text-lg font-bold shadow-inner" 
                                placeholder="+XX XXXXXXXXXX"
                            />
                        </div>
                        
                        <div className="space-y-3">
                             <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-widest">
                                <Key size={14} className="text-indigo-400" /> Gateway API URL (e.g. UltraMsg)
                            </div>
                            <Input 
                                value={apiUrl} 
                                onChange={e => setApiUrl(e.target.value)} 
                                className="bg-gray-50 border-gray-200 h-12 focus:ring-indigo-500 rounded-2xl text-md font-bold shadow-inner" 
                                placeholder="https://api.ultramsg.com/instanceXXXX/messages/chat"
                            />
                            <p className="text-[10px] text-gray-400 px-1 italic">Note: UltraMsg users Must include <b>/messages/chat</b> at the end.</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-indigo-950 font-black text-xs uppercase tracking-widest">
                                <ShieldCheck size={14} className="text-indigo-400" /> Access Token / Secret
                            </div>
                            <Input 
                                type="password"
                                value={apiToken} 
                                onChange={e => setApiToken(e.target.value)} 
                                className="bg-gray-50 border-gray-200 h-12 focus:ring-indigo-500 rounded-2xl text-lg font-bold shadow-inner" 
                                placeholder="************************"
                            />
                        </div>

                        <div className="flex flex-col justify-end">
                             <div className="flex items-center gap-4 bg-indigo-50/50 p-5 rounded-2xl border-2 border-indigo-100 shadow-sm hover:border-indigo-200 transition-all flex-1">
                                <input 
                                    type="checkbox" 
                                    id="wa_enable" 
                                    checked={enabled} 
                                    onChange={e => setEnabled(e.target.checked)} 
                                    className="w-7 h-7 cursor-pointer text-indigo-600 rounded-xl border-indigo-300 focus:ring-indigo-500"
                                />
                                <div className="flex flex-col">
                                    <label htmlFor="wa_enable" className="text-md font-black text-indigo-950 cursor-pointer">Live Activation</label>
                                    <span className="text-xs text-indigo-700/60 font-medium">Activate real-time message dispatching.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <Button 
                            onClick={handleSave} 
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 h-14 rounded-2xl shadow-2xl shadow-indigo-200 font-black text-lg active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <><Save size={20} className="mr-3" /> Commit Gateway Pulse</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* TRIAL & ACK */}
            <Card className="border-2 border-indigo-100 bg-indigo-50/10 overflow-hidden rounded-3xl">
                <CardHeader className="pb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white border border-indigo-100 rounded-2xl text-indigo-600 shadow-xl">
                            <Zap size={24} className="animate-pulse" />
                        </div>
                        <div>
                             <CardTitle className="text-xl text-indigo-950 font-black">Test System Heartbeat</CardTitle>
                             <CardDescription className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Receive a LIVE message on your phone.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                    <div className="flex flex-col md:flex-row items-end gap-3 bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Test Recipient Number</label>
                            <Input 
                                placeholder="Target phone number..." 
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                className="bg-white border-indigo-100 h-12 rounded-xl font-bold text-lg"
                            />
                        </div>
                        <Button 
                            onClick={handleSendTrial}
                            disabled={testMode}
                            className="bg-indigo-900 border-b-4 border-indigo-950 hover:bg-indigo-800 text-white font-black h-12 px-10 rounded-xl shadow-lg active:border-b-0 active:translate-y-1 transition-all"
                        >
                            {testMode ? <Loader2 className="animate-spin mr-2" size={18} /> : <><Send size={18} className="mr-2" /> DISPATCH TRIAL</>}
                        </Button>
                    </div>

                    {lastTrial && (
                        <div className="animate-in fade-in zoom-in duration-500">
                             <div className="bg-indigo-900 text-white rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden border border-indigo-700">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full translate-x-16 -translate-y-16"></div>
                                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                                        <span className="font-black text-emerald-400 uppercase tracking-widest text-sm">System Handshake Active</span>
                                    </div>
                                    <span className="text-[10px] bg-white/10 text-white/50 font-mono px-3 py-1 rounded-full">{lastTrial.timestamp}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase">GATEWAY ID</p>
                                        <p className="text-xs font-mono font-black text-white">{lastTrial.tracking_id}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase">STATUS</p>
                                        <p className="text-xs font-black text-emerald-300 uppercase tracking-widest">{lastTrial.status}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-white/40 uppercase">ENGINE LAYER</p>
                                        <p className="text-xs font-black text-indigo-300">{lastTrial.gateway}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-white/40 uppercase">TARGET PHONE</p>
                                        <p className="text-xs font-black text-indigo-100">{lastTrial.phoneNumber}</p>
                                    </div>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-xs text-white/80 font-medium leading-relaxed">
                                    "Your credentials have been authenticated. Check your WhatsApp shortly."
                                </div>
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
