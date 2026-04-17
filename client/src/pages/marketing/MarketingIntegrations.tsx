import React, { useState } from 'react';
import { Facebook, Link2, CheckCircle2, Edit, Save, X, Settings, RefreshCw, AlertTriangle, Wifi, WifiOff, Keyboard, List, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export const MarketingIntegrations: React.FC = () => {
    const [metaProfiles, setMetaProfiles] = useState<any[]>([]);
    const [loadingProfiles, setLoadingProfiles] = useState(false);

    // Edit Mode Tracking
    const [editModeIds, setEditModeIds] = useState<Record<string, boolean>>({});
    const [tempData, setTempData] = useState<Record<string, { profileId: string, accountId: string }>>({});
    
    // Ad Accounts Cache
    const [adAccountsByProfile, setAdAccountsByProfile] = useState<Record<string, any[]>>({});
    const [loadingAccounts, setLoadingAccounts] = useState<Record<string, boolean>>({});
    const [manualInputModes, setManualInputModes] = useState<Record<string, boolean>>({});
    
    // System Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [metaAppId, setMetaAppId] = useState('');
    const [metaAppSecret, setMetaAppSecret] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();

    const { data: clients, isLoading: clientsLoading } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => (await api.get('/clients')).data
    });

    React.useEffect(() => {
        fetchSettings();
        fetchMetaProfiles();
    }, []);

    React.useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const successParam = queryParams.get('success');
        if (successParam === 'meta') {
            fetchMetaProfiles();
            navigate('/dashboard/marketing-integrations', { replace: true });
        }
    }, [location.search, navigate]);

    const fetchMetaProfiles = async () => {
        setLoadingProfiles(true);
        try {
            const { data } = await api.get('/marketing/meta/profiles');
            setMetaProfiles(data);
        } catch (err) {
            console.error('Error fetching meta profiles:', err);
        } finally {
            setLoadingProfiles(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const { data } = await api.get('/settings');
            if (data.META_APP_ID) setMetaAppId(data.META_APP_ID);
            if (data.META_APP_SECRET) setMetaAppSecret(data.META_APP_SECRET);
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            await api.post('/settings/batch', {
                settings: { META_APP_ID: metaAppId, META_APP_SECRET: metaAppSecret }
            });
            setShowSettings(false);
            alert('Settings saved successfully.');
        } catch (err) {
            alert('Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const fetchAvailableAccounts = async (profileId: string, clientId?: string, force = false) => {
        if (!profileId) return;
        if (!force && adAccountsByProfile[profileId]) {
            // If already loaded and we have data, we might want to auto-select if still empty
            if (clientId && tempData[clientId] && !tempData[clientId].accountId && adAccountsByProfile[profileId].length === 1) {
                const autoAccountId = adAccountsByProfile[profileId][0].id.replace('act_', '');
                setTempData(prev => ({
                    ...prev,
                    [clientId]: { ...prev[clientId], accountId: autoAccountId }
                }));
            }
            return;
        }
        
        setLoadingAccounts(prev => ({ ...prev, [profileId]: true }));
        try {
            const { data } = await api.get(`/marketing/meta/accounts?profileId=${profileId}`);
            setAdAccountsByProfile(prev => ({ ...prev, [profileId]: data }));
            
            // Auto-selection logic: if only one account exists, select it automatically for this client
            if (clientId && data && data.length === 1) {
                const autoAccountId = data[0].id.replace('act_', '');
                setTempData(prev => ({
                    ...prev,
                    [clientId]: { ...prev[clientId], accountId: autoAccountId }
                }));
            }
        } catch (err) {
            console.error('Error fetching available accounts:', err);
        } finally {
            setLoadingAccounts(prev => ({ ...prev, [profileId]: false }));
        }
    };

    const handleMetaConnect = (clientId?: string) => {
        const timestamp = new Date().getTime();
        const url = clientId ? `/api/marketing/auth/meta?clientId=${clientId}&t=${timestamp}` : `/api/marketing/auth/meta?t=${timestamp}`;
        window.location.href = url;
    };

    // Row Operations
    const handleEditToggle = (clientId: string, currentProfileId: string, currentAccountId: string) => {
        if (editModeIds[clientId]) {
            // Cancel edit
            setEditModeIds(prev => ({ ...prev, [clientId]: false }));
        } else {
            // Start edit
            setTempData(prev => ({
                ...prev,
                [clientId]: { profileId: currentProfileId || '', accountId: currentAccountId || '' }
            }));
            setEditModeIds(prev => ({ ...prev, [clientId]: true }));
            
            if (currentProfileId) {
                fetchAvailableAccounts(currentProfileId, clientId);
            }
        }
    };

    const handleSaveRow = async (clientId: string, originalProfileId: string, originalAccountId: string) => {
        const t = tempData[clientId];
        if (!t) return;

        try {
            // 1. Link Profile if changed
            if (t.profileId !== originalProfileId && t.profileId !== '') {
                await api.post('/marketing/meta/link-profile', {
                    clientId,
                    profileId: t.profileId
                });
            }

            // 2. Link Ad Account if changed
            if (t.accountId !== originalAccountId && t.accountId !== '') {
                await api.post('/marketing/accounts/select', {
                    clientId,
                    platform: 'meta',
                    externalAccountId: t.accountId,
                    profileId: t.profileId
                });
            }

            // Refresh data
            await fetchMetaProfiles();
            queryClient.invalidateQueries({ queryKey: ['clients'] });
            
            // Close edit mode
            setEditModeIds(prev => ({ ...prev, [clientId]: false }));
        } catch (error) {
            console.error(error);
            alert('Failed to save changes. Please try again.');
        }
    };

    return (
        <div className="p-4 md:p-6 w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Client Meta Integrations</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-base max-w-2xl">
                        Manage Facebook profiles and Ad Account mappings for all your active clients from a single command center.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleMetaConnect()}
                        className="flex items-center gap-2 bg-[#1877F2] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:brightness-110 transition-all"
                    >
                        <Facebook className="w-4 h-4" /> Link Global Agency Profile
                    </button>
                    <button
                        onClick={() => {
                            setShowSettings(!showSettings);
                            if (!showSettings) fetchSettings();
                        }}
                        className={`p-2.5 rounded-xl border transition-colors ${showSettings ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Settings Drawer */}
            {showSettings && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 p-6 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-4 text-blue-700 font-bold">
                        <Settings className="w-5 h-5" />
                        <h2>Meta App Configuration</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-600 uppercase">App ID</label>
                            <input type="text" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm" value={metaAppId} onChange={e => setMetaAppId(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-blue-600 uppercase">App Secret</label>
                            <input type="password" className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm" value={metaAppSecret} onChange={e => setMetaAppSecret(e.target.value)} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {savingSettings ? 'Saving...' : 'Save Credentials'}
                        </button>
                    </div>
                </div>
            )}

            {/* Master Client Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                    <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">Client Integration Mapping</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#f8fafc] dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-5">Client Name</th>
                                <th className="px-6 py-5">Facebook Profile</th>
                                <th className="px-6 py-5">Meta Ad Account</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right w-[120px] shrink-0">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                            {clientsLoading || loadingProfiles ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="font-bold">Loading mappings...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : clients?.map((client: any) => {
                                // Find if client has a mapped profile
                                const linkedAccount = metaProfiles.flatMap(p => p.marketingAccounts || []).find((a: any) => a.clientId === client.id);
                                const currentProfile = metaProfiles.find(p => p.id === linkedAccount?.metaTokenId);
                                const isEditing = editModeIds[client.id] || false;
                                
                                // Normalize Account ID display
                                let displayAccountId = linkedAccount?.externalAccountId;
                                if (displayAccountId === 'meta-account-linked' || displayAccountId === 'pending-selection') {
                                    displayAccountId = '';
                                }

                                const isFullyMapped = !!(currentProfile && displayAccountId);

                                const isExpired = currentProfile?.tokenStatus === 'EXPIRED';

                                return (
                                    <tr key={client.id} className={`hover:bg-blue-50/30 dark:hover:bg-gray-800/30 transition-colors ${isEditing ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${isExpired ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                        {/* Client Name Col */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-black text-sm uppercase shadow-sm">
                                                    {client.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 dark:text-gray-100">{client.name}</p>
                                                    <p className="text-[10px] text-gray-400">{client.industry || 'General'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Facebook Profile Col */}
                                        <td className="px-6 py-5">
                                            {isEditing ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        className="p-2.5 bg-white font-black border border-gray-200 rounded-lg text-sm shadow-sm focus:ring-2 focus:ring-blue-100 outline-none w-48"
                                                        value={tempData[client.id]?.profileId || ''}
                                                        onChange={(e) => {
                                                            const newProfileId = e.target.value;
                                                            setTempData(prev => ({ ...prev, [client.id]: { ...prev[client.id], profileId: newProfileId } }));
                                                            if (newProfileId) fetchAvailableAccounts(newProfileId);
                                                        }}
                                                    >
                                                        <option value="">-- Select Profile --</option>
                                                        {metaProfiles.map(p => (
                                                            <option key={p.id} value={p.id}>{p.account_name} {p.tokenStatus === 'EXPIRED' ? '⚠️ Expired' : '✓'}</option>
                                                        ))}
                                                    </select>
                                                    <button 
                                                        onClick={() => handleMetaConnect(client.id)}
                                                        className="text-[10px] text-[#1877F2] font-black uppercase tracking-widest hover:underline whitespace-nowrap"
                                                    >
                                                        + New Login
                                                    </button>
                                                </div>
                                            ) : (
                                                currentProfile ? (
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Facebook className="w-4 h-4 text-[#1877F2] shrink-0" />
                                                        <span className="font-bold text-gray-800 dark:text-gray-200">{currentProfile.account_name}</span>
                                                        {currentProfile.tokenStatus === 'EXPIRED' ? (
                                                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-md text-[10px] font-black">
                                                                <WifiOff className="w-3 h-3" /> Token Expired
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-black">
                                                                <Wifi className="w-3 h-3" /> Active
                                                            </span>
                                                        )}
                                                        {currentProfile.tokenStatus === 'EXPIRED' && (
                                                            <button
                                                                onClick={() => handleMetaConnect(client.id)}
                                                                className="inline-flex items-center gap-1 bg-red-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black hover:bg-red-700 transition-colors shadow-sm"
                                                            >
                                                                <RefreshCw className="w-3 h-3" /> Reconnect
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleEditToggle(client.id, currentProfile?.id || '', displayAccountId || '')}
                                                        className="flex items-center gap-1.5 text-xs font-bold text-[#1877F2] bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Link2 className="w-3.5 h-3.5" /> Select Profile
                                                    </button>
                                                )
                                            )}
                                        </td>

                                        {/* Ad Account Col */}
                                        <td className="px-6 py-5">
                                            {isEditing ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        {manualInputModes[client.id] ? (
                                                            <input
                                                                type="text"
                                                                className="w-48 p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                                                value={tempData[client.id]?.accountId || ''}
                                                                onChange={(e) => setTempData(prev => ({ ...prev, [client.id]: { ...prev[client.id], accountId: e.target.value } }))}
                                                                placeholder="Enter Account ID"
                                                            />
                                                        ) : (
                                                            <div className="relative">
                                                                <select
                                                                    className={`w-48 p-2.5 bg-white border rounded-lg text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-100 outline-none transition-all ${
                                                                        loadingAccounts[tempData[client.id]?.profileId] ? 'opacity-50 border-blue-200' : 'border-gray-200'
                                                                    }`}
                                                                    value={tempData[client.id]?.accountId || ''}
                                                                    onChange={(e) => setTempData(prev => ({ ...prev, [client.id]: { ...prev[client.id], accountId: e.target.value } }))}
                                                                    disabled={!tempData[client.id]?.profileId || loadingAccounts[tempData[client.id]?.profileId]}
                                                                >
                                                                    <option value="">
                                                                        {loadingAccounts[tempData[client.id]?.profileId] ? 'Loading accounts...' : (tempData[client.id]?.profileId ? '-- Select Account --' : 'Link Profile First')}
                                                                    </option>
                                                                    {(adAccountsByProfile[tempData[client.id]?.profileId] || []).map((acc: any) => (
                                                                        <option key={acc.id} value={acc.id.replace('act_', '')}>
                                                                            {acc.name} ({acc.id.replace('act_', '')})
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                {loadingAccounts[tempData[client.id]?.profileId] && (
                                                                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                                        <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <button 
                                                            onClick={() => setManualInputModes(prev => ({ ...prev, [client.id]: !prev[client.id] }))}
                                                            className={`p-2 rounded-lg border transition-all ${manualInputModes[client.id] ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-blue-600 hover:border-blue-200'}`}
                                                            title={manualInputModes[client.id] ? "Switch to Dropdown" : "Switch to Manual Input"}
                                                        >
                                                            {manualInputModes[client.id] ? <List className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
                                                        </button>
                                                        {tempData[client.id]?.profileId && (
                                                            <button 
                                                                onClick={() => fetchAvailableAccounts(tempData[client.id]?.profileId, client.id, true)}
                                                                className="p-2 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg hover:text-blue-600 hover:border-blue-200 transition-all"
                                                                title="Refresh Account List"
                                                            >
                                                                <RefreshCw className={`w-4 h-4 ${loadingAccounts[tempData[client.id]?.profileId] ? 'animate-spin' : ''}`} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {!loadingAccounts[tempData[client.id]?.profileId] && tempData[client.id]?.profileId && (!adAccountsByProfile[tempData[client.id]?.profileId] || adAccountsByProfile[tempData[client.id]?.profileId].length === 0) && (
                                                        <span className="text-[10px] text-red-500 font-bold">No ad accounts found for this profile.</span>
                                                    )}
                                                </div>
                                            ) : (
                                                displayAccountId ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`font-mono text-xs font-semibold px-2 py-1 rounded-md w-fit ${
                                                            currentProfile && adAccountsByProfile[currentProfile.id] && !adAccountsByProfile[currentProfile.id].find((a: any) => a.id.replace('act_', '') === displayAccountId)
                                                            ? 'bg-red-100 text-red-700 border border-red-200'
                                                            : 'bg-gray-100 text-gray-700'
                                                        }`}>
                                                            {displayAccountId}
                                                        </span>
                                                        {currentProfile && adAccountsByProfile[currentProfile.id] && !adAccountsByProfile[currentProfile.id].find((a: any) => a.id.replace('act_', '') === displayAccountId) && (
                                                            <span className="text-[9px] text-red-600 font-black flex items-center gap-1">
                                                                <AlertTriangle className="w-2.5 h-2.5" /> UNAUTHORIZED / HIDDEN
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    currentProfile ? (
                                                        <button 
                                                            onClick={() => handleEditToggle(client.id, currentProfile.id, '')}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Select Ad Account
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-xs">Not linked</span>
                                                    )
                                                )
                                            )}
                                        </td>

                                        {/* Status Col */}
                                        <td className="px-6 py-5">
                                            {isFullyMapped ? (
                                                isExpired ? (
                                                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-red-200">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Token Expired
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-green-200 shadow-sm">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                                                    </span>
                                                )
                                            ) : (
                                                <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">
                                                    Pending
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions Col */}
                                        <td className="px-6 py-5 text-right w-[120px] shrink-0">
                                            {isEditing ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditToggle(client.id, '', '')}
                                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveRow(client.id, currentProfile?.id || '', displayAccountId || '')}
                                                        className="p-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
                                                        title="Save Changes"
                                                    >
                                                        <Save className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => handleEditToggle(client.id, currentProfile?.id || '', displayAccountId || '')}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Mapping"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {!clientsLoading && clients?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                                        <h3 className="text-lg font-bold text-gray-700 mb-1">No Clients Found</h3>
                                        <p className="text-sm">Add clients in the directory to manage their marketing integrations.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Connected Facebook Profiles Section */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xl mt-8">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Facebook className="w-5 h-5 text-[#1877F2]" />
                        Connected Facebook Profiles
                    </h2>
                    <button 
                        onClick={() => handleMetaConnect()}
                        className="text-sm font-bold text-[#1877F2] hover:underline flex items-center gap-1"
                    >
                        + Add new facebook profile
                    </button>
                </div>
                <div className="p-6">
                    {loadingProfiles ? (
                        <div className="text-center text-gray-500 py-8 flex flex-col items-center gap-3">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-bold text-sm">Loading profiles...</span>
                        </div>
                    ) : metaProfiles.length === 0 ? (
                        <div className="text-center text-gray-500 py-12 flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                                <Facebook className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-1">No Profiles Connected</h3>
                            <p className="text-sm">Link your agency's Meta accounts to start mapping them to clients.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {metaProfiles.map(profile => {
                                const isConnected = profile.tokenStatus !== 'EXPIRED';
                                return (
                                    <div key={profile.id} className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-all bg-gray-50/30 dark:bg-gray-800/20 group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center text-white font-bold text-lg shadow-sm ${isConnected ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
                                                    {profile.account_name?.[0] || <Facebook className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                        {profile.account_name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <div className="relative flex items-center justify-center">
                                                            <div className={`absolute w-full h-full rounded-full opacity-30 animate-ping ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                            <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                        </div>
                                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isConnected ? 'text-green-600' : 'text-red-500'}`}>
                                                            {isConnected ? 'Connected' : 'Not Connected'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleMetaConnect()}
                                            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all border ${
                                                isConnected 
                                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600 text-gray-600 dark:text-gray-300'
                                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 hover:border-red-300'
                                            }`}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isConnected ? '' : 'animate-spin-slow'}`} /> 
                                            {isConnected ? 'Reconnect Profile' : 'Fix Connection'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketingIntegrations;
