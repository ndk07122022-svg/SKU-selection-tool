import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

const ConfigLibrary = () => {
    const [activeTab, setActiveTab] = useState('settings');
    const [settings, setSettings] = useState({});
    const [channels, setChannels] = useState([]);
    const [ctsMatrix, setCtsMatrix] = useState([]);
    const [markets, setMarkets] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [settingsRes, channelsRes, ctsRes] = await Promise.all([
                api.get('/settings/'),
                api.get('/channels/'),
                api.get('/channels/cts/')
            ]);

            setSettings(settingsRes.data);
            setChannels(channelsRes.data);
            setCtsMatrix(ctsRes.data);

            // Extract unique markets from CTS
            const uniqueMarkets = [...new Set(ctsRes.data.map(c => c.market_name))];
            setMarkets(uniqueMarkets);

        } catch (error) {
            console.error("Error fetching config:", error);
            setMessage({ text: 'Failed to load configuration data.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
    };

    const handleChannelChange = (index, field, value) => {
        const updated = [...channels];
        updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
        setChannels(updated);
    };

    const handleCtsChange = (market, channel, value) => {
        const updated = ctsMatrix.map(c => {
            if (c.market_name === market && c.channel_name === channel) {
                return { ...c, total_cts_pct: parseFloat(value) || 0 };
            }
            return c;
        });
        setCtsMatrix(updated);
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            await api.put('/settings/', settings);
            setMessage({ text: 'Global settings updated successfully.', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Failed to update settings.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const saveChannels = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            // Backend expects a list of updates, we can just PUT them all
            await Promise.all(channels.map(c =>
                api.put(`/channels/${c.channel_name}`, c)
            ));
            setMessage({ text: 'Channels updated successfully.', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Failed to update channels.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const saveCts = async () => {
        setSaving(true);
        setMessage({ text: '', type: '' });
        try {
            // Put all changes
            await Promise.all(ctsMatrix.map(c =>
                api.put(`/channels/cts/${c.market_name}/${c.channel_name}`, { total_cts_pct: c.total_cts_pct })
            ));
            setMessage({ text: 'CTS matrix updated successfully.', type: 'success' });
        } catch (error) {
            setMessage({ text: 'Failed to update CTS.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Configuration...</div>;

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Configuration Library</h2>
            </div>

            {message.text && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    backgroundColor: message.type === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)',
                    color: message.type === 'success' ? 'var(--success)' : 'var(--danger)'
                }}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                        padding: '0.75rem 1rem', background: 'none', border: 'none',
                        borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'settings' ? 600 : 500, cursor: 'pointer'
                    }}
                >
                    Global Settings & Weights
                </button>
                <button
                    onClick={() => setActiveTab('channels')}
                    style={{
                        padding: '0.75rem 1rem', background: 'none', border: 'none',
                        borderBottom: activeTab === 'channels' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'channels' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'channels' ? 600 : 500, cursor: 'pointer'
                    }}
                >
                    Channel Scenario Math
                </button>
                <button
                    onClick={() => setActiveTab('cts')}
                    style={{
                        padding: '0.75rem 1rem', background: 'none', border: 'none',
                        borderBottom: activeTab === 'cts' ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === 'cts' ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === 'cts' ? 600 : 500, cursor: 'pointer'
                    }}
                >
                    Market-Channel CTS
                </button>
            </div>

            <div className="card">
                {activeTab === 'settings' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>Global Adjustments</h3>
                            <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
                                <Save size={16} /> Save Settings
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {Object.entries(settings).map(([key, value]) => (
                                <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ textTransform: 'capitalize' }}>
                                        {key.replace(/_/g, ' ')}
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        value={value}
                                        onChange={(e) => handleSettingChange(key, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'channels' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>Channel Baseline Targets</h3>
                            <button className="btn btn-primary" onClick={saveChannels} disabled={saving}>
                                <Save size={16} /> Save Channels
                            </button>
                        </div>

                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Channel Name</th>
                                        <th>Base Units / Month</th>
                                        <th>Channel Weight (0-1)</th>
                                        <th>Retail Adoption (0-1)</th>
                                        <th>Market Budget Mlt.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {channels.map((c, i) => (
                                        <tr key={c.channel_name}>
                                            <td style={{ fontWeight: 600 }}>{c.channel_name}</td>
                                            <td>
                                                <input type="number" className="form-input" value={c.base_units_per_month} onChange={e => handleChannelChange(i, 'base_units_per_month', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" step="0.01" className="form-input" value={c.channel_weight} onChange={e => handleChannelChange(i, 'channel_weight', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" step="0.01" className="form-input" value={c.retail_adoption_fraction} onChange={e => handleChannelChange(i, 'retail_adoption_fraction', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" step="0.01" className="form-input" value={c.marketing_budget_multiplier} onChange={e => handleChannelChange(i, 'marketing_budget_multiplier', e.target.value)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'cts' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>Cost-to-Serve (CTS) % Matrix</h3>
                            <button className="btn btn-primary" onClick={saveCts} disabled={saving}>
                                <Save size={16} /> Save CTS
                            </button>
                        </div>

                        <div className="data-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Market</th>
                                        {channels.map(c => <th key={c.channel_name}>{c.channel_name} CTS %</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {markets.map(market => (
                                        <tr key={market}>
                                            <td style={{ fontWeight: 600 }}>{market}</td>
                                            {channels.map(c => {
                                                const cell = ctsMatrix.find(item => item.market_name === market && item.channel_name === c.channel_name);
                                                return (
                                                    <td key={c.channel_name}>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="form-input"
                                                            value={cell ? cell.total_cts_pct : 0}
                                                            onChange={e => handleCtsChange(market, c.channel_name, e.target.value)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConfigLibrary;
