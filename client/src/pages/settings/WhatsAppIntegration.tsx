import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import {
    MessageCircle, Save, Loader2, Send, Zap, RefreshCw, Wifi, WifiOff,
    QrCode, PhoneOff, ShieldCheck, Bell, ToggleLeft, ToggleRight, CheckCircle2,
    AlertTriangle, SmartphoneIcon, Link2, Link2Off, SwitchCamera
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import api from '../../lib/api';
import Swal from 'sweetalert2';

// ─── Types ───────────────────────────────────────────────────────────────────

type WaEngineStatus = 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED';

interface EngineState {
    status: WaEngineStatus;
    qrUrl: string | null;
    connectedNumber: string | null;
}

interface AIRule {
    id: string;
    name: string;
    trigger_type: string;
    is_active: boolean;
    message_template: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<WaEngineStatus, { label: string; color: string; icon: React.ReactNode; pulse: boolean }> = {
    DISCONNECTED: { label: 'Disconnected', color: 'bg-red-500', icon: <WifiOff size={14} />, pulse: false },
    INITIALIZING: { label: 'Initializing…', color: 'bg-amber-500', icon: <Loader2 size={14} className="animate-spin" />, pulse: true },
    QR_READY: { label: 'Scan QR Code', color: 'bg-blue-500', icon: <QrCode size={14} />, pulse: true },
    CONNECTED: { label: 'Connected', color: 'bg-emerald-500', icon: <Wifi size={14} />, pulse: false },
};

// ─── Component ────────────────────────────────────────────────────────────────
const _WA_ENGINE_MARKER_ = 'QIX_WA_ENGINE_V2_CUSTOM';

export const WhatsAppIntegration = () => {
    // Engine state
    const [engine, setEngine] = useState<EngineState>({ status: 'DISCONNECTED', qrUrl: null, connectedNumber: null });
    const [polling, setPolling] = useState(false);

    // Test message
    const [testPhone, setTestPhone] = useState('');
    const [testSending, setTestSending] = useState(false);
    const [lastTrialResult, setLastTrialResult] = useState<any>(null);

    // Smart alert rules
    const [aiRules, setAiRules] = useState<AIRule[]>([]);
    const [rulesLoading, setRulesLoading] = useState(true);
    const [rulesSaving, setRulesSaving] = useState(false);

    // ── Fetch engine status ───────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        try {
            const { data } = await api.get('/whatsapp/status');
            setEngine(data);
        } catch (err) {
            // Engine may not be running yet
            setEngine(prev => ({ ...prev, status: 'DISCONNECTED' }));
        }
    }, []);

    // Poll status every 3s when initializing or awaiting QR scan
    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        if (engine.status === 'INITIALIZING' || engine.status === 'QR_READY') {
            const id = setInterval(fetchStatus, 3000);
            setPolling(true);
            return () => { clearInterval(id); setPolling(false); };
        }
        setPolling(false);
    }, [engine.status, fetchStatus]);

    // ── Engine controls ───────────────────────────────────────────────────

    const handleConnect = async () => {
        try {
            await api.post('/whatsapp/init');
            setEngine(prev => ({ ...prev, status: 'INITIALIZING' }));
            Swal.fire({
                title: 'Initializing WhatsApp Engine',
                text: 'The browser engine is starting. A QR code will appear shortly — scan it with your phone.',
                icon: 'info',
                timer: 4000,
                showConfirmButton: false
            });
        } catch (err: any) {
            Swal.fire('Error', err.response?.data?.message || 'Failed to initialize engine.', 'error');
        }
    };

    const handleDisconnect = async () => {
        const result = await Swal.fire({
            title: 'Disconnect WhatsApp?',
            text: 'This will log out the linked WhatsApp number. You will need to scan a new QR code to reconnect.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'Yes, Disconnect'
        });
        if (!result.isConfirmed) return;
        try {
            await api.post('/whatsapp/logout');
            setEngine({ status: 'DISCONNECTED', qrUrl: null, connectedNumber: null });
        } catch (err: any) {
            Swal.fire('Error', 'Failed to disconnect.', 'error');
        }
    };

    // ── Test message ──────────────────────────────────────────────────────

    const handleSendTest = async () => {
        if (!testPhone.trim()) {
            return Swal.fire('Missing Number', 'Enter a target phone number for the test message.', 'warning');
        }
        setTestSending(true);
        setLastTrialResult(null);
        try {
            const { data } = await api.post('/notifications/wa-test', {
                phoneNumber: testPhone,
                message: '✅ Qix Ads WhatsApp Engine Test — Your internal gateway is active and dispatching messages!'
            });
            setLastTrialResult({ ...data, ts: new Date().toLocaleTimeString(), phone: testPhone });
            if (data.status === 'SIMULATED') {
                Swal.fire('Simulated (Mock)', 'Engine not connected. Connect and scan QR first for real dispatch.', 'warning');
            } else {
                Swal.fire('✅ Dispatched!', `Status: ${data.status} · Gateway: ${data.gateway}`, 'success');
            }
        } catch (err: any) {
            Swal.fire('Failed', err.response?.data?.message || 'Dispatch error.', 'error');
        } finally {
            setTestSending(false);
        }
    };

    // ── AI Smart Alert Rules ──────────────────────────────────────────────

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get('/notifications/rules');
                setAiRules(data);
            } catch (err) {
                console.error('Failed to load AI rules');
            } finally {
                setRulesLoading(false);
            }
        };
        load();
    }, []);

    const toggleRule = (id: string) => {
        setAiRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
    };

    const saveAlertRules = async () => {
        setRulesSaving(true);
        try {
            await api.post('/notifications/rules/batch', { rules: aiRules });
            Swal.fire({ title: 'Saved!', text: 'Smart Alert rules updated.', icon: 'success', timer: 2000, showConfirmButton: false });
        } catch (err: any) {
            Swal.fire('Error', 'Failed to save rules.', 'error');
        } finally {
            setRulesSaving(false);
        }
    };

    const sc = statusConfig[engine.status];
    const isConnected = engine.status === 'CONNECTED';

    return (
        <div className="wa-manager-page">

            {/* ══ ENGINE STATUS BANNER ══ */}
            <div className={`wa-banner ${engine.status.toLowerCase()}`}>
                <div className="wa-banner-left">
                    <div className={`status-dot-badge ${sc.color} ${sc.pulse ? 'animate-pulse' : ''}`}>
                        {sc.icon}
                        <span>{sc.label}</span>
                    </div>

                    <div className="wa-banner-info">
                        <h2 className="wa-banner-title">
                            <MessageCircle size={22} />
                            WhatsApp Engine
                        </h2>
                        <p className="wa-banner-sub">
                            {isConnected
                                ? `Active on +${engine.connectedNumber || '—'}`
                                : 'Internal engine · No paid API required · Unlimited messages'}
                        </p>
                    </div>
                </div>

                <div className="wa-banner-actions">
                    <button className="btn-refresh" onClick={fetchStatus} title="Refresh Status">
                        <RefreshCw size={16} className={polling ? 'animate-spin' : ''} />
                    </button>

                    {!isConnected && engine.status !== 'INITIALIZING' && (
                        <button className="btn-connect" onClick={handleConnect}>
                            <Link2 size={16} /> Connect WhatsApp
                        </button>
                    )}
                    {isConnected && (
                        <button className="btn-disconnect" onClick={handleDisconnect}>
                            <Link2Off size={16} /> Disconnect
                        </button>
                    )}
                </div>
            </div>

            <div className="wa-body">
                <div className="wa-left-col">

                    {/* ── QR Code Panel ── */}
                    <Card className="wa-card qr-card">
                        <CardHeader className="wa-card-header">
                            <div className="wa-card-header-icon"><QrCode size={18} /></div>
                            <div>
                                <CardTitle className="wa-card-title">Link Your Number</CardTitle>
                                <CardDescription className="wa-card-desc">Scan the QR code with WhatsApp on your phone</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="qr-content">
                            {isConnected ? (
                                <div className="connected-state">
                                    <div className="connected-icon">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <h3 className="connected-title">Engine Connected</h3>
                                    <p className="connected-number">+{engine.connectedNumber || '—'}</p>
                                    <p className="connected-hint">Messages and PDFs can now be dispatched to any number.</p>
                                    <button className="btn-change-number" onClick={handleDisconnect}>
                                        <SwitchCamera size={15} /> Change Linked Number
                                    </button>
                                </div>
                            ) : engine.status === 'QR_READY' && engine.qrUrl ? (
                                <div className="qr-scan-state">
                                    <div className="qr-frame">
                                        <img src={engine.qrUrl} alt="WhatsApp QR Code" className="qr-img" />
                                    </div>
                                    <p className="qr-instruction">
                                        Open <strong>WhatsApp</strong> → Linked Devices → Link a Device
                                    </p>
                                    <p className="qr-expires">QR code refreshes automatically. Keep this page open.</p>
                                </div>
                            ) : engine.status === 'INITIALIZING' ? (
                                <div className="initializing-state">
                                    <Loader2 size={48} className="animate-spin text-indigo-400" />
                                    <p className="init-text">Starting engine…</p>
                                    <p className="init-sub">This takes 15–30 seconds. QR code will appear below.</p>
                                </div>
                            ) : (
                                <div className="idle-state">
                                    <SmartphoneIcon size={56} className="idle-icon" />
                                    <h3>Not Connected</h3>
                                    <p>Click <strong>Connect WhatsApp</strong> above to start the engine and pair your number.</p>
                                    <button className="btn-connect-inline" onClick={handleConnect}>
                                        <Link2 size={16} /> Start Engine & Connect
                                    </button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── How it works ── */}
                    <Card className="wa-card how-it-works-card">
                        <CardHeader className="wa-card-header">
                            <div className="wa-card-header-icon"><ShieldCheck size={18} /></div>
                            <div>
                                <CardTitle className="wa-card-title">How It Works</CardTitle>
                                <CardDescription className="wa-card-desc">No 3rd party APIs. No monthly fees.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ol className="how-list">
                                <li><span className="step-num">1</span><div><strong>Start Engine</strong><p>Launches a secure headless browser on your server.</p></div></li>
                                <li><span className="step-num">2</span><div><strong>Scan QR</strong><p>Link any WhatsApp number — scan once, sessions are cached.</p></div></li>
                                <li><span className="step-num">3</span><div><strong>Stay Connected</strong><p>PM2 restarts auto-restore the session without re-scanning.</p></div></li>
                                <li><span className="step-num">4</span><div><strong>Unlimited Dispatch</strong><p>Send text, PDFs, and reports to clients and staff instantly.</p></div></li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>

                <div className="wa-right-col">

                    {/* ── Test Dispatch Panel ── */}
                    <Card className="wa-card test-card">
                        <CardHeader className="wa-card-header">
                            <div className="wa-card-header-icon pulse-icon"><Zap size={18} /></div>
                            <div>
                                <CardTitle className="wa-card-title">Live Test Dispatch</CardTitle>
                                <CardDescription className="wa-card-desc">Send a test message to verify the engine is active.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="test-content">
                            <div className="test-row">
                                <div className="test-input-wrap">
                                    <label className="field-label">Target Phone Number</label>
                                    <Input
                                        placeholder="e.g. +919876543210"
                                        value={testPhone}
                                        onChange={e => setTestPhone(e.target.value)}
                                        className="test-input"
                                    />
                                    <p className="field-hint">Include country code. International format only.</p>
                                </div>
                                <Button
                                    onClick={handleSendTest}
                                    disabled={testSending}
                                    className="btn-dispatch"
                                >
                                    {testSending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Send size={16} className="mr-2" />}
                                    {testSending ? 'Sending…' : 'Dispatch Test'}
                                </Button>
                            </div>

                            {lastTrialResult && (
                                <div className={`trial-result ${lastTrialResult.status === 'SIMULATED' ? 'simulated' : 'live'}`}>
                                    <div className="trial-result-header">
                                        <div className="trial-dot" />
                                        <span className="trial-engine-label">{lastTrialResult.gateway}</span>
                                        <span className="trial-ts">{lastTrialResult.ts}</span>
                                    </div>
                                    <div className="trial-result-grid">
                                        <div><p className="trl">Status</p><p className="trv">{lastTrialResult.status}</p></div>
                                        <div><p className="trl">Phone</p><p className="trv">{lastTrialResult.phone}</p></div>
                                        <div><p className="trl">Tracking</p><p className="trv font-mono">{lastTrialResult.tracking_id}</p></div>
                                    </div>
                                    {lastTrialResult.status === 'SIMULATED' && (
                                        <div className="trial-warn">
                                            <AlertTriangle size={13} /> Engine not connected — scan QR code to dispatch real messages.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* ── Smart Alert Rules ── */}
                    <Card className="wa-card alerts-card">
                        <CardHeader className="wa-card-header">
                            <div className="wa-card-header-icon"><Bell size={18} /></div>
                            <div>
                                <CardTitle className="wa-card-title">Smart Alert Rules</CardTitle>
                                <CardDescription className="wa-card-desc">
                                    Control which AI alerts are dispatched via WhatsApp to staff.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="alerts-content">
                            {rulesLoading ? (
                                <div className="flex items-center gap-3 text-indigo-400 p-4">
                                    <Loader2 size={18} className="animate-spin" />
                                    <span className="text-sm font-medium">Loading rules…</span>
                                </div>
                            ) : (
                                <>
                                    <div className="rules-list">
                                        {aiRules.map(rule => (
                                            <div key={rule.id} className={`rule-row ${rule.is_active ? 'active' : 'inactive'}`}>
                                                <div className="rule-info">
                                                    <p className="rule-name">{rule.name}</p>
                                                    <p className="rule-trigger">{rule.trigger_type.replace(/_/g, ' ')}</p>
                                                </div>
                                                <div className="rule-controls">
                                                    <span className={`rule-badge ${rule.is_active ? 'on' : 'off'}`}>
                                                        {rule.is_active ? 'WhatsApp ON' : 'WhatsApp OFF'}
                                                    </span>
                                                    <button
                                                        className={`toggle-btn ${rule.is_active ? 'enabled' : 'disabled'}`}
                                                        onClick={() => toggleRule(rule.id)}
                                                    >
                                                        {rule.is_active
                                                            ? <ToggleRight size={28} />
                                                            : <ToggleLeft size={28} />}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="rules-footer">
                                        <p className="rules-note">
                                            <Bell size={12} /> Changes here affect all AI-triggered WhatsApp notifications system-wide.
                                        </p>
                                        <Button className="btn-save-rules" onClick={saveAlertRules} disabled={rulesSaving}>
                                            {rulesSaving ? <Loader2 size={15} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                                            Save Alert Rules
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ── Scoped Styles ── */}
            <style>{`
                .wa-manager-page { min-height: 100%; background: #f8fafc; }

                /* Banner */
                .wa-banner {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 20px 28px; gap: 16px; flex-wrap: wrap;
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    border-radius: 0 0 20px 20px;
                    box-shadow: 0 4px 24px rgba(49,46,129,0.3);
                }
                .wa-banner.connected { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); box-shadow: 0 4px 24px rgba(6,78,59,0.35); }
                .wa-banner.qr_ready { background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); }
                .wa-banner.initializing { background: linear-gradient(135deg, #78350f 0%, #92400e 100%); }

                .wa-banner-left { display: flex; align-items: center; gap: 16px; }
                .wa-banner-info {}
                .wa-banner-title { font-size: 1.2rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; margin: 0; }
                .wa-banner-sub { font-size: 0.8rem; color: rgba(255,255,255,0.6); margin: 2px 0 0; }

                .status-dot-badge {
                    display: flex; align-items: center; gap: 6px;
                    padding: 5px 14px; border-radius: 20px; color: #fff;
                    font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .wa-banner-actions { display: flex; gap: 10px; align-items: center; }
                .btn-refresh {
                    width: 38px; height: 38px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; transition: background 0.2s;
                }
                .btn-refresh:hover { background: rgba(255,255,255,0.2); }
                .btn-connect {
                    display: flex; align-items: center; gap: 8px;
                    padding: 9px 20px; border-radius: 10px; border: none;
                    background: #25D366; color: #fff; font-weight: 700; font-size: 0.88rem;
                    cursor: pointer; transition: all 0.2s;
                }
                .btn-connect:hover { background: #1da851; transform: translateY(-1px); }
                .btn-disconnect {
                    display: flex; align-items: center; gap: 8px;
                    padding: 9px 20px; border-radius: 10px; border: 1.5px solid rgba(255,255,255,0.3);
                    background: rgba(220,38,38,0.2); color: #fca5a5; font-weight: 700; font-size: 0.88rem;
                    cursor: pointer; transition: all 0.2s;
                }
                .btn-disconnect:hover { background: rgba(220,38,38,0.4); }

                /* Layout */
                .wa-body { display: grid; grid-template-columns: 380px 1fr; gap: 20px; padding: 24px 20px; align-items: start; }
                @media (max-width: 900px) { .wa-body { grid-template-columns: 1fr; } }

                /* Cards */
                .wa-card { border-radius: 16px !important; border: 1.5px solid #e2e8f0 !important; box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important; overflow: hidden; background: #fff; }
                .wa-card + .wa-card { margin-top: 16px; }
                .wa-left-col { display: flex; flex-direction: column; gap: 16px; }
                .wa-right-col { display: flex; flex-direction: column; gap: 16px; }

                .wa-card-header { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px !important; }
                .wa-card-header-icon {
                    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
                    background: #eef2ff; color: #4f46e5;
                    display: flex; align-items: center; justify-content: center;
                }
                .pulse-icon { background: #fef3c7; color: #d97706; animation: pulse 2s infinite; }
                .wa-card-title { font-size: 0.95rem !important; font-weight: 700 !important; color: #1e293b; line-height: 1.2; }
                .wa-card-desc { font-size: 0.78rem !important; color: #64748b; margin-top: 2px; }

                /* QR / Connection states */
                .qr-content { padding: 16px 20px 20px !important; min-height: 280px; }
                .connected-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 16px 0; text-align: center; }
                .connected-icon { width: 72px; height: 72px; border-radius: 50%; background: #d1fae5; color: #059669; display: flex; align-items: center; justify-content: center; }
                .connected-title { font-size: 1.1rem; font-weight: 800; color: #065f46; margin: 0; }
                .connected-number { font-size: 1.4rem; font-weight: 900; color: #059669; margin: 0; font-family: monospace; letter-spacing: 0.05em; }
                .connected-hint { font-size: 0.78rem; color: #64748b; margin: 0; }
                .btn-change-number {
                    display: flex; align-items: center; gap: 7px; margin-top: 8px;
                    padding: 8px 18px; border-radius: 8px; border: 1.5px solid #cbd5e1;
                    background: #f8fafc; color: #475569; font-size: 0.82rem; font-weight: 600; cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-change-number:hover { border-color: #94a3b8; background: #f1f5f9; }

                .qr-scan-state { display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .qr-frame { padding: 10px; background: #fff; border: 3px solid #4f46e5; border-radius: 16px; box-shadow: 0 8px 32px rgba(79,70,229,0.2); }
                .qr-img { width: 200px; height: 200px; display: block; }
                .qr-instruction { font-size: 0.82rem; font-weight: 600; color: #374151; text-align: center; max-width: 220px; }
                .qr-expires { font-size: 0.72rem; color: #9ca3af; text-align: center; }

                .initializing-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 0; text-align: center; }
                .init-text { font-size: 1rem; font-weight: 700; color: #4f46e5; margin: 0; }
                .init-sub { font-size: 0.78rem; color: #64748b; margin: 0; max-width: 240px; }

                .idle-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 24px 0; text-align: center; }
                .idle-icon { color: #cbd5e1; }
                .idle-state h3 { font-size: 1rem; font-weight: 700; color: #334155; margin: 0; }
                .idle-state p { font-size: 0.8rem; color: #64748b; max-width: 240px; margin: 0; }
                .btn-connect-inline {
                    display: flex; align-items: center; gap: 8px;
                    padding: 10px 22px; border-radius: 10px; border: none;
                    background: #25D366; color: #fff; font-weight: 700; font-size: 0.88rem;
                    cursor: pointer; transition: all 0.2s; margin-top: 8px;
                }
                .btn-connect-inline:hover { background: #1da851; }

                /* How it works */
                .how-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
                .how-list li { display: flex; gap: 12px; align-items: flex-start; }
                .step-num {
                    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
                    background: #4f46e5; color: #fff; font-size: 0.72rem; font-weight: 900;
                    display: flex; align-items: center; justify-content: center;
                }
                .how-list li div strong { font-size: 0.85rem; color: #1e293b; display: block; }
                .how-list li div p { font-size: 0.76rem; color: #64748b; margin: 2px 0 0; }

                /* Test panel */
                .test-content { padding: 16px 20px 20px !important; }
                .test-row { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
                .test-input-wrap { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 4px; }
                .field-label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
                .field-hint { font-size: 0.68rem; color: #94a3b8; margin: 2px 0 0; }
                .test-input { height: 42px !important; border-radius: 10px !important; font-size: 0.9rem !important; }
                .btn-dispatch {
                    height: 42px !important; padding: 0 20px !important; background: #4f46e5 !important;
                    border-radius: 10px !important; font-weight: 700 !important; white-space: nowrap;
                }

                .trial-result { margin-top: 16px; border-radius: 12px; overflow: hidden; }
                .trial-result.live { background: #1e1b4b; }
                .trial-result.simulated { background: #451a03; }
                .trial-result-header {
                    display: flex; align-items: center; gap: 8px;
                    padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .trial-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: ping 1s infinite; flex-shrink: 0; }
                .trial-engine-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #a5b4fc; letter-spacing: 0.06em; flex: 1; }
                .trial-ts { font-size: 0.68rem; color: rgba(255,255,255,0.4); font-family: monospace; }
                .trial-result-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px 16px; }
                .trl { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.4); margin: 0 0 2px; }
                .trv { font-size: 0.8rem; font-weight: 700; color: #fff; margin: 0; }
                .trial-warn {
                    padding: 8px 16px; background: rgba(251,191,36,0.12); color: #fbbf24;
                    font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px;
                }

                /* Alerts */
                .alerts-content { padding: 8px 20px 20px !important; }
                .rules-list { display: flex; flex-direction: column; gap: 4px; }
                .rule-row {
                    display: flex; align-items: center; justify-content: space-between; gap: 12px;
                    padding: 12px 14px; border-radius: 10px; border: 1.5px solid transparent;
                    transition: all 0.2s;
                }
                .rule-row.active { background: #f0fdf4; border-color: #bbf7d0; }
                .rule-row.inactive { background: #f8fafc; border-color: #e2e8f0; }
                .rule-info { flex: 1; min-width: 0; }
                .rule-name { font-size: 0.85rem; font-weight: 700; color: #1e293b; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .rule-trigger { font-size: 0.68rem; color: #64748b; margin: 1px 0 0; text-transform: uppercase; letter-spacing: 0.04em; }
                .rule-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
                .rule-badge { font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
                .rule-badge.on { background: #d1fae5; color: #065f46; }
                .rule-badge.off { background: #f1f5f9; color: #94a3b8; }
                .toggle-btn { background: none; border: none; cursor: pointer; padding: 0; line-height: 1; display: flex; align-items: center; }
                .toggle-btn.enabled { color: #10b981; }
                .toggle-btn.disabled { color: #cbd5e1; }

                .rules-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1.5px solid #f1f5f9; flex-wrap: wrap; gap: 10px; }
                .rules-note { font-size: 0.73rem; color: #64748b; display: flex; align-items: center; gap: 5px; margin: 0; }
                .btn-save-rules { background: #4f46e5 !important; border-radius: 10px !important; font-weight: 700 !important; height: 38px !important; font-size: 0.82rem !important; }

                @keyframes ping {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(217, 119, 6, 0); }
                }
            `}</style>
        </div>
    );
};
