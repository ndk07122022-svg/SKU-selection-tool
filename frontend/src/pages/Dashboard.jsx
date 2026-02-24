import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import { Package, TrendingUp, DollarSign, Activity } from 'lucide-react';
import api from '../services/api';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6b7280']; // Green, Yellow, Red, Gray

const Dashboard = () => {
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSkus = async () => {
            try {
                const res = await api.get('/skus/');
                setSkus(res.data);
            } catch (err) {
                console.error("Error fetching SKUs for dashboard:", err);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchSkus();
    }, []);

    // Calculate aggregated metrics from the raw data
    const metrics = useMemo(() => {
        if (!skus.length) return null;

        let totalSkus = skus.length;
        let launchNow = 0;
        let phaseLater = 0;
        let doNotLaunch = 0;

        // Let's mock a strict logic pipeline if final_recommendation isn't actively set
        // Actually the backend engine sets final_recommendation, we just need to read it
        skus.forEach(s => {
            const rec = s.cache?.final_recommendation || 'Unknown';
            if (rec === 'Launch Now') launchNow++;
            else if (rec === 'Phase Later') phaseLater++;
            else if (rec === 'Do Not Launch') doNotLaunch++;
        });

        const activeSkus = skus.filter(s => s.cache?.final_recommendation === 'Launch Now' || s.cache?.select_for_wave_1);

        // Sum wave 1 volume and revenue
        let totalMonthlyRevenue = 0;
        let totalGmDollars = 0;
        let validGmCount = 0;
        let sumGmPct = 0;

        activeSkus.forEach(s => {
            totalMonthlyRevenue += (s.cache?.monthly_revenue || 0);
            totalGmDollars += (s.cache?.monthly_gm_dollar || 0);
            if (s.cache?.gm_pct !== undefined && s.cache?.gm_pct !== null) {
                sumGmPct += s.cache.gm_pct;
                validGmCount++;
            }
        });

        const avgGmPct = validGmCount > 0 ? (sumGmPct / validGmCount) : 0;

        // Recommendation Split Chart Data
        const recData = [
            { name: 'Launch Now', value: launchNow },
            { name: 'Phase Later', value: phaseLater },
            { name: 'Do Not Launch', value: doNotLaunch }
        ].filter(d => d.value > 0);

        // Market x Channel Data for Stacked Bar
        const marketChannelMap = {};
        activeSkus.forEach(s => {
            const m = s.target_market || 'Unassigned';
            const c = s.primary_channel || 'Unassigned';

            if (!marketChannelMap[m]) marketChannelMap[m] = {};
            if (!marketChannelMap[m][c]) marketChannelMap[m][c] = 0;

            marketChannelMap[m][c]++;
        });

        // Convert the nested object into an array for Recharts
        const channelsFound = new Set();
        const marketData = Object.keys(marketChannelMap).map(market => {
            const obj = { name: market };
            Object.keys(marketChannelMap[market]).forEach(channel => {
                obj[channel] = marketChannelMap[market][channel];
                channelsFound.add(channel);
            });
            return obj;
        });

        return {
            totalSkus,
            launchNow,
            totalMonthlyRevenue,
            avgGmPct,
            recData,
            marketData,
            channels: Array.from(channelsFound)
        };
    }, [skus]);

    if (loading) return <div style={{ padding: '2rem' }}>Crunching numbers...</div>;
    if (error) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>{error}</div>;
    if (!metrics) return <div style={{ padding: '2rem' }}>No SKU data available. Import a database to view analytics.</div>;

    const channelColors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h2 className="page-title">Executive Dashboard</h2>
                <p className="text-muted">High-level financial and strategic overview of your imported SKU pipeline.</p>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '0.75rem', color: 'var(--primary)' }}>
                        <Package size={28} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Total Analyzed SKUs</p>
                        <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{metrics.totalSkus}</h3>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.75rem', color: '#10b981' }}>
                        <Activity size={28} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Approved ("Launch Now")</p>
                        <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{metrics.launchNow}</h3>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '1rem', borderRadius: '0.75rem', color: '#0ea5e9' }}>
                        <DollarSign size={28} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Launch Wave Mo. Revenue</p>
                        <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>${metrics.totalMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '0.75rem', color: '#f59e0b' }}>
                        <TrendingUp size={28} />
                    </div>
                    <div>
                        <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Average Gross Margin (%)</p>
                        <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{(metrics.avgGmPct * 100).toFixed(1)}%</h3>
                    </div>
                </div>

            </div>

            {/* Charts Area */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '1.5rem' }}>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Recommendation Breakdown</h4>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.recData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {metrics.recData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} SKUs`, 'Count']} />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem' }}>
                    <h4 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Active SKUs by Target Market</h4>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={metrics.marketData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} axisLine={{ stroke: 'var(--border)' }} />
                                <YAxis tick={{ fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'var(--bg-main)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                                {metrics.channels.map((channel, idx) => (
                                    <Bar key={channel} dataKey={channel} stackId="a" fill={channelColors[idx % channelColors.length]} radius={[idx === metrics.channels.length - 1 ? 4 : 0, idx === metrics.channels.length - 1 ? 4 : 0, 0, 0]} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
