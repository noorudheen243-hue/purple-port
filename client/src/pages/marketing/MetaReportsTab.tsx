import { useState, useRef, useEffect } from 'react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Legend
} from 'recharts';
import autoTable from 'jspdf-autotable';

const LOGO_BASE64 = `data:image/png;base64,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`;

// ─── helpers ────────────────────────────────────────────────────────────────

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

type DatePreset = 'weekly' | 'monthly' | 'yearly' | 'custom';

function getPresetRange(preset: DatePreset): { from: string; to: string } {
    const now = new Date();
    switch (preset) {
        case 'weekly':
            return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
        case 'monthly':
            return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
        case 'yearly':
            return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
        default:
            return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: todayStr() };
    }
}

// ─── component ──────────────────────────────────────────────────────────────

export default function MetaReportsTab() {
    const { user } = useAuthStore();
    const reportRef = useRef<HTMLDivElement>(null);

    const [selectedClientId, setSelectedClientId] = useState('');
    const [preset, setPreset] = useState<DatePreset>('monthly');
    const [fromDate, setFromDate] = useState(getPresetRange('monthly').from);
    const [toDate, setToDate] = useState(getPresetRange('monthly').to);
    const [sending, setSending] = useState(false);
    const [sendMsg, setSendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [previewReady, setPreviewReady] = useState(false);

    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    const { data: metricsData, isLoading, refetch } = useQuery({
        queryKey: ['meta-report', selectedClientId, fromDate, toDate],
        queryFn: async () => {
            const from = new Date(fromDate).toISOString();
            const to = new Date(new Date(toDate).setHours(23, 59, 59, 999)).toISOString();
            const clientParam = selectedClientId ? `clientId=${selectedClientId}&` : '';
            const res = await api.get(`/marketing/metrics?${clientParam}from=${from}&to=${to}&platform=meta`);
            return res.data;
        },
        enabled: !!selectedClientId
    });

    useEffect(() => {
        if (preset !== 'custom') {
            const r = getPresetRange(preset);
            setFromDate(r.from);
            setToDate(r.to);
        }
    }, [preset]);

    useEffect(() => {
        setPreviewReady(!!metricsData);
    }, [metricsData]);

    const selectedClient = clients.find((c: any) => c.id === selectedClientId);
    const summary = metricsData?.summary || {};
    const metrics: any[] = metricsData?.data || [];

    const chartData = metrics.map((m: any) => ({
        date: format(new Date(m.date), 'dd MMM'),
        Impressions: m.impressions || 0,
        Clicks: m.clicks || 0,
        Spend: parseFloat((m.spend || 0).toFixed(2)),
        Results: m.results || 0,
    }));

    // Build campaign rows directly from metrics data
    const campaignMap = new Map<string, any>();
    metrics.forEach((m: any) => {
        if (!m.campaignId) return;
        if (!campaignMap.has(m.campaignId)) {
            campaignMap.set(m.campaignId, {
                name: m.campaign?.name || m.campaignId,
                status: m.campaign?.status || 'ACTIVE',
                impressions: 0, clicks: 0, spend: 0, results: 0, leads: 0
            });
        }
        const entry = campaignMap.get(m.campaignId);
        entry.impressions += m.impressions || 0;
        entry.clicks += m.clicks || 0;
        entry.spend += m.spend || 0;
        entry.results += m.results || 0;
    });
    const campaignRows = Array.from(campaignMap.values());

    // ── PDF generation & send ─────────────────────────────────────────────

    const generatePdf = async (): Promise<Blob | null> => {
        if (!reportRef.current) return null;
        
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();

        // 1. Capture the Top Content (everything except the table)
        const canvas = await html2canvas(reportRef.current, {
            scale: 3,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1200,
            ignoreElements: (element) => 
                element.classList.contains('report-table') || 
                element.classList.contains('report-section-title-table') ||
                element.classList.contains('report-footer')
        });

        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const imgW = pageW;
        const imgH = (imgProps.height * imgW) / imgProps.width;

        // Add top content image to first page
        pdf.addImage(imgData, 'PNG', 0, 0, imgW, imgH);
        let currentY = imgH + 5; // Start table 5mm below the image

        // 2. Add Campaign Table using autoTable for perfect page breaks
        autoTable(pdf, {
            startY: currentY,
            head: [['Campaign', 'Status', 'Impressions', 'Clicks', 'Spend', 'Results', 'Leads']],
            body: campaignRows.map(c => [
                c.name,
                c.status,
                c.impressions.toLocaleString(),
                c.clicks.toLocaleString(),
                `₹ ${c.spend.toFixed(2)}`,
                c.results.toLocaleString(),
                c.leads
            ]),
            styles: { fontSize: 9, cellPadding: 3, halign: 'left', valign: 'middle' },
            headStyles: { fillColor: [24, 119, 242], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 255] },
            margin: { left: 10, right: 10 },
            didDrawPage: (data) => {
                // Add footer on each page
                const str = `Page ${pdf.getNumberOfPages()}`;
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                pdf.text(str, data.settings.margin.left, pdf.internal.pageSize.getHeight() - 10);
                pdf.text("Generated by Qix Ads CRM · qixport.com", pageW - 65, pdf.internal.pageSize.getHeight() - 10);
            }
        });

        return pdf.output('blob');
    };

    const handleDownload = async () => {
        const blob = await generatePdf();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Qixads Report ${format(new Date(), 'dd-MM-yyyy')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSendWhatsApp = async () => {
        if (!selectedClientId) return;
        setSending(true);
        setSendMsg(null);
        try {
            const blob = await generatePdf();
            if (!blob) throw new Error('PDF generation failed');
            const form = new FormData();
            form.append('pdf', blob, `Qixads Report ${format(new Date(), 'dd-MM-yyyy')}.pdf`);
            form.append('clientId', selectedClientId);
            const res = await api.post('/marketing/report/send', form, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSendMsg({ type: 'success', text: res.data.message || 'Report sent!' });
        } catch (err: any) {
            setSendMsg({ type: 'error', text: err.response?.data?.message || 'Failed to send report.' });
        } finally {
            setSending(false);
        }
    };

    // ── render ────────────────────────────────────────────────────────────

    return (
        <div className="meta-reports-page">
            {/* ── Control panel ── */}
            <div className="meta-reports-controls">
                <div className="meta-reports-controls-inner">
                    <h2 className="meta-reports-title">
                        <span className="meta-icon">📊</span>
                        Meta Ads Report Generator
                    </h2>

                    <div className="meta-reports-filters">
                        {/* Client selector */}
                        <div className="filter-group">
                            <label className="filter-label">Client</label>
                            <select
                                className="filter-select"
                                value={selectedClientId}
                                onChange={e => setSelectedClientId(e.target.value)}
                            >
                                <option value="">— Select Client —</option>
                                {clients.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Preset pills */}
                        <div className="filter-group">
                            <label className="filter-label">Date Range</label>
                            <div className="preset-pills">
                                {(['weekly', 'monthly', 'yearly', 'custom'] as DatePreset[]).map(p => (
                                    <button
                                        key={p}
                                        className={`preset-pill ${preset === p ? 'active' : ''}`}
                                        onClick={() => setPreset(p)}
                                    >
                                        {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Custom date inputs */}
                        {preset === 'custom' && (
                            <div className="filter-group custom-dates">
                                <div>
                                    <label className="filter-label">From</label>
                                    <input type="date" className="filter-input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="filter-label">To</label>
                                    <input type="date" className="filter-input" value={toDate} onChange={e => setToDate(e.target.value)} />
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div className="filter-group action-btns">
                            <button
                                className="btn-generate"
                                disabled={!selectedClientId || isLoading}
                                onClick={() => refetch()}
                            >
                                {isLoading ? '⏳ Loading…' : '🔄 Generate Report'}
                            </button>
                            {previewReady && (
                                <>
                                    <button className="btn-download" onClick={handleDownload}>
                                        ⬇️ Download PDF
                                    </button>
                                    <button
                                        className="btn-send"
                                        disabled={sending}
                                        onClick={handleSendWhatsApp}
                                    >
                                        {sending ? '📤 Sending…' : '📲 Submit via WhatsApp'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {sendMsg && (
                        <div className={`send-msg ${sendMsg.type}`}>
                            {sendMsg.type === 'success' ? '✅' : '❌'} {sendMsg.text}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Empty state ── */}
            {!selectedClientId && (
                <div className="meta-empty-state">
                    <div className="meta-empty-icon">📋</div>
                    <h3>Select a client to generate a Meta Ads report</h3>
                    <p>Choose a client and date range, then click Generate Report.</p>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading && (
                <div className="meta-loading">
                    <div className="meta-spinner" />
                    <p>Fetching campaign data…</p>
                </div>
            )}

            {/* ══ REPORT DOCUMENT (A4 Preview) ══ */}
            {previewReady && metricsData && (
                <div className="meta-report-wrapper">
                    <div ref={reportRef} className="meta-report-doc">

                        {/* Header */}
                        <div className="report-header">
                            <div className="report-logo-block">
                                <img
                                    src={LOGO_BASE64}
                                    alt="Qix Ads"
                                    style={{ height: '56px', objectFit: 'contain' }}
                                />
                                <div className="report-logo-sub">Performance Report</div>
                            </div>
                            <div className="report-header-meta">
                                <div className="report-meta-row">
                                    <span className="meta-label">Client</span>
                                    <span className="meta-value">{selectedClient?.name || '—'}</span>
                                </div>
                                <div className="report-meta-row">
                                    <span className="meta-label">Generated by</span>
                                    <span className="meta-value">{user?.full_name || user?.email || '—'}</span>
                                </div>
                                <div className="report-meta-row">
                                    <span className="meta-label">Period</span>
                                    <span className="meta-value">
                                        {format(new Date(fromDate), 'dd MMM yyyy')} – {format(new Date(toDate), 'dd MMM yyyy')}
                                    </span>
                                </div>
                                <div className="report-meta-row">
                                    <span className="meta-label">Generated on</span>
                                    <span className="meta-value">{format(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section divider */}
                        <div className="report-section-title">Overall Performance Summary</div>

                        {/* KPI tiles */}
                        <div className="report-kpi-grid">
                            {[
                                { label: 'Impressions', value: summary.impressions?.toLocaleString() || '0', icon: '👁️', color: '#1877f2' },
                                { label: 'Clicks', value: summary.clicks?.toLocaleString() || '0', icon: '🖱️', color: '#42b883' },
                                { label: 'Total Spend', value: `₹ ${parseFloat(summary.spend || 0).toFixed(2)}`, icon: '💰', color: '#ff6b35' },
                                { label: 'Results', value: summary.results?.toLocaleString() || '0', icon: '🎯', color: '#9b59b6' },
                                { label: 'Reach', value: summary.reach?.toLocaleString() || '0', icon: '📡', color: '#3498db' },
                                { label: 'Conversations', value: summary.conversations?.toLocaleString() || '0', icon: '💬', color: '#e74c3c' },
                            ].map(kpi => (
                                <div className="report-kpi-card" key={kpi.label} style={{ borderTopColor: kpi.color }}>
                                    <div className="kpi-icon">{kpi.icon}</div>
                                    <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value}</div>
                                    <div className="kpi-label">{kpi.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Traffic trend chart */}
                        {chartData.length > 0 && (
                            <>
                                <div className="report-section-title">Traffic Trend</div>
                                <div className="report-chart-box">
                                    <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="Impressions" stroke="#1877f2" dot={false} strokeWidth={2} />
                                            <Line type="monotone" dataKey="Clicks" stroke="#42b883" dot={false} strokeWidth={2} />
                                            <Line type="monotone" dataKey="Results" stroke="#9b59b6" dot={false} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="report-section-title">Spend Over Time</div>
                                <div className="report-chart-box">
                                    <ResponsiveContainer width="100%" height={160}>
                                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip formatter={(v: any) => `₹ ${v}`} />
                                            <Bar dataKey="Spend" fill="#1877f2" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        )}

                        {/* Campaign Performance Table */}
                        <div className="report-section-title report-section-title-table">Campaign Performance</div>
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Campaign</th>
                                    <th>Status</th>
                                    <th>Impressions</th>
                                    <th>Clicks</th>
                                    <th>Spend (₹)</th>
                                    <th>Results</th>
                                    <th>Leads</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaignRows.length === 0 ? (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>No campaigns found for this period.</td></tr>
                                ) : campaignRows.map((c, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                                        <td className="camp-name">{c.name}</td>
                                        <td>
                                            <span className={`status-badge status-${(c.status || '').toLowerCase()}`}>
                                                {c.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{c.impressions.toLocaleString()}</td>
                                        <td>{c.clicks.toLocaleString()}</td>
                                        <td>₹ {c.spend.toFixed(2)}</td>
                                        <td>{c.results.toLocaleString()}</td>
                                        <td>{c.leads}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Footer */}
                        <div className="report-footer">
                            <div>Generated by Qix Ads CRM · <strong>qixport.com</strong></div>
                            <div>Confidential — for {selectedClient?.name} only</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Scoped styles ── */}
            <style>{`
                .meta-reports-page { min-height: 100%; background: #f8fafc; }

                /* Control panel */
                .meta-reports-controls {
                    background: linear-gradient(135deg, #1877f2 0%, #0e5ab8 100%);
                    padding: 24px 28px 20px;
                    border-radius: 0 0 20px 20px;
                    box-shadow: 0 4px 24px rgba(24,119,242,0.25);
                }
                .meta-reports-controls-inner { max-width: 1100px; margin: 0 auto; }
                .meta-reports-title {
                    font-size: 1.4rem; font-weight: 700; color: #fff;
                    margin-bottom: 18px; display: flex; align-items: center; gap: 10px;
                }
                .meta-icon { font-size: 1.6rem; }
                .meta-reports-filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }

                .filter-group { display: flex; flex-direction: column; gap: 6px; }
                .filter-label { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.05em; }
                .filter-select, .filter-input {
                    height: 38px; padding: 0 12px; border-radius: 8px;
                    border: 1.5px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.12); color: #fff;
                    font-size: 0.9rem; outline: none; min-width: 200px;
                    transition: border 0.2s;
                }
                .filter-select option { color: #111; background: #fff; }
                .filter-select:focus, .filter-input:focus { border-color: rgba(255,255,255,0.8); }
                .custom-dates { flex-direction: row; gap: 10px; align-items: flex-end; }

                .preset-pills { display: flex; gap: 8px; }
                .preset-pill {
                    padding: 6px 16px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.35);
                    background: transparent; color: rgba(255,255,255,0.8); cursor: pointer;
                    font-size: 0.82rem; font-weight: 600; transition: all 0.2s;
                }
                .preset-pill:hover { background: rgba(255,255,255,0.15); }
                .preset-pill.active { background: #fff; color: #1877f2; border-color: #fff; }

                .action-btns { flex-direction: row; gap: 10px; align-items: flex-end; }
                .btn-generate, .btn-download, .btn-send {
                    height: 40px; padding: 0 20px; border-radius: 8px; border: none;
                    font-size: 0.88rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
                }
                .btn-generate { background: #fff; color: #1877f2; }
                .btn-generate:hover { background: #f0f7ff; transform: translateY(-1px); }
                .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                .btn-download { background: rgba(255,255,255,0.15); color: #fff; border: 1.5px solid rgba(255,255,255,0.4); }
                .btn-download:hover { background: rgba(255,255,255,0.25); }
                .btn-send { background: #25D366; color: #fff; }
                .btn-send:hover { background: #1da851; transform: translateY(-1px); }
                .btn-send:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

                .send-msg {
                    margin-top: 12px; padding: 10px 16px; border-radius: 8px;
                    font-size: 0.88rem; font-weight: 600;
                }
                .send-msg.success { background: rgba(37,211,102,0.15); color: #25D366; border: 1px solid rgba(37,211,102,0.3); }
                .send-msg.error { background: rgba(231,76,60,0.12); color: #e74c3c; border: 1px solid rgba(231,76,60,0.25); }

                /* Empty / loading */
                .meta-empty-state {
                    text-align: center; padding: 80px 20px; color: #94a3b8;
                }
                .meta-empty-icon { font-size: 4rem; margin-bottom: 16px; }
                .meta-empty-state h3 { font-size: 1.2rem; color: #475569; margin-bottom: 8px; }
                .meta-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; color: #64748b; }
                .meta-spinner {
                    width: 40px; height: 40px; border: 4px solid #e0e7ff;
                    border-top-color: #1877f2; border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Report wrapper (scrollable letter-box view) */
                .meta-report-wrapper {
                    margin: 28px auto; max-width: 850px; padding: 0 16px 40px;
                }

                /* A4 Document */
                .meta-report-doc {
                    background: #fff;
                    box-shadow: 0 6px 40px rgba(0,0,0,0.12);
                    border-radius: 8px;
                    padding: 50px 54px;
                    font-family: 'Inter', 'Segoe UI', Helvetica, sans-serif;
                    color: #1a1a2e;
                    position: relative;
                }

                /* Header */
                .report-header {
                    display: flex; justify-content: space-between; align-items: flex-start;
                    border-bottom: 4px solid #1877f2; padding-bottom: 24px; margin-bottom: 30px;
                }
                .report-logo-block { display: flex; flex-direction: column; gap: 4px; }
                .report-logo-sub { font-size: 0.9rem; color: #64748b; letter-spacing: 0.15em; text-transform: uppercase; font-weight: 700; }
                .report-header-meta { text-align: right; }
                .report-meta-row { display: flex; gap: 14px; justify-content: flex-end; margin-bottom: 6px; font-size: 1.1rem; }
                .meta-label { color: #94a3b8; font-weight: 500; }
                .meta-value { font-weight: 700; color: #1e293b; }

                /* Section titles */
                .report-section-title {
                    font-size: 1rem; font-weight: 800; color: #1877f2;
                    text-transform: uppercase; letter-spacing: 0.1em;
                    border-left: 5px solid #1877f2; padding-left: 14px;
                    margin: 32px 0 20px;
                }

                /* KPI grid - Optimized for Mobile Readability (Stacked) */
                .report-kpi-grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 16px; 
                    margin-bottom: 24px;
                }
                .report-kpi-card {
                    border: 1px solid #e2e8f0; border-top-width: 5px;
                    border-radius: 12px; padding: 20px 14px; text-align: center;
                    background: #f8fafc;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .kpi-icon { font-size: 2.2rem; margin-bottom: 10px; }
                .kpi-value { font-size: 1.8rem; font-weight: 900; line-height: 1.1; margin-bottom: 6px; }
                .kpi-label { font-size: 0.85rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }

                /* Charts */
                .report-chart-box { background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #f1f5f9; }

                /* Table - Robust Mobile Design */
                .report-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 1.1rem; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
                .report-table th {
                    background: #1877f2; color: #fff; padding: 14px 16px;
                    text-align: left; font-weight: 700; font-size: 0.85rem;
                    letter-spacing: 0.06em; text-transform: uppercase;
                }
                .report-table td { padding: 14px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
                .row-even { background: #fff; }
                .row-odd { background: #f8faff; }
                .camp-name { font-weight: 700; color: #0f172a; max-width: 240px; }

                .status-badge {
                    display: inline-block; padding: 4px 12px; border-radius: 20px;
                    font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
                }
                .status-active { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
                .status-paused { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
                .status-enabled { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }

                /* Footer */
                .report-footer {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-top: 40px; padding-top: 24px; border-top: 2px solid #e2e8f0;
                    font-size: 0.95rem; color: #64748b; font-weight: 500;
                }
            `}</style>
        </div>
    );
}
