import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Edit2, Save, X, Download } from 'lucide-react';
import api from '../services/api';

const SkuPortfolio = () => {
    const [skus, setSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [brandFilter, setBrandFilter] = useState('');
    const [marketFilter, setMarketFilter] = useState('');
    const [channelFilter, setChannelFilter] = useState('');

    // Filter options
    const [brands, setBrands] = useState([]);
    const [dbMarkets, setDbMarkets] = useState([]);
    const [channels, setChannels] = useState([]);

    // Modal state
    const [selectedSku, setSelectedSku] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // Selection & Export
    const [selectedRows, setSelectedRows] = useState([]);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchSkus();
        fetchMarkets();
    }, []);

    const fetchMarkets = async () => {
        try {
            const res = await api.get('/markets/');
            setDbMarkets(res.data.map(m => m.market_name));
        } catch (err) {
            console.error("Error fetching markets", err);
        }
    };

    const fetchSkus = async () => {
        setLoading(true);
        try {
            const res = await api.get('/skus/');
            const data = res.data;
            setSkus(data);

            // Extract unique categories, brands, and channels for filters
            const uniqueBrands = [...new Set(data.map(sku => sku.brand).filter(Boolean))].sort();
            setBrands(uniqueBrands);

            const uniqueChannels = [...new Set(data.map(sku => sku.primary_channel).filter(Boolean))].sort();
            setChannels(uniqueChannels);
        } catch (err) {
            console.error("Error fetching SKUs:", err);
            setError("Failed to load SKU data from the database.");
        } finally {
            setLoading(false);
        }
    };

    // Filter logic
    const filteredSkus = skus.filter(sku => {
        const matchBrand = brandFilter ? sku.brand === brandFilter : true;
        const matchMarket = marketFilter ? sku.target_market === marketFilter : true;
        const matchChannel = channelFilter ? sku.primary_channel === channelFilter : true;
        return matchBrand && matchMarket && matchChannel;
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(filteredSkus.map(s => s.sku_id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (skuId) => {
        setSelectedRows(prev =>
            prev.includes(skuId) ? prev.filter(id => id !== skuId) : [...prev, skuId]
        );
    };

    const handleExport = async () => {
        if (selectedRows.length === 0) return;
        setExporting(true);
        try {
            const res = await api.post('/skus/export', selectedRows, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sku_export.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Export error", err);
            setError("Failed to export SKUs.");
        } finally {
            setExporting(false);
        }
    };

    const handleViewClick = (sku) => {
        setSelectedSku(sku);
        setIsEditing(false);
    };

    const handleEditClick = (sku) => {
        setSelectedSku(sku);
        setEditFormData({ ...sku });
        setIsEditing(true);
    };

    const handleEditChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveEdit = async () => {
        try {
            setLoading(true);
            const res = await api.put(`/skus/${selectedSku.sku_id}`, editFormData);

            // Update local state and refresh filters
            setSkus(prev => prev.map(s => s.sku_id === selectedSku.sku_id ? res.data : s));

            setSelectedSku(null);
            setIsEditing(false);
            // Re-extract filter channels in case they changed
            const updatedSkus = skus.map(s => s.sku_id === selectedSku.sku_id ? res.data : s);
            const uniqueChannels = [...new Set(updatedSkus.map(sku => sku.primary_channel).filter(Boolean))].sort();
            setChannels(uniqueChannels);
            const uniqueBrands = [...new Set(updatedSkus.map(sku => sku.brand).filter(Boolean))].sort();
            setBrands(uniqueBrands);

        } catch (err) {
            console.error("Error updating SKU:", err);
            setError("Failed to update SKU properties.");
        } finally {
            setLoading(false);
        }
    };

    const renderEditableCell = (field, type = 'text') => {
        if (!isEditing) {
            let val = selectedSku[field];
            if (val === true) val = 'Yes';
            if (val === false) val = 'No';
            if (val === null || val === undefined || val === '') val = '-';

            if (field === 'regulatory_eligible' || field === 'supply_ready') {
                return <td style={{ fontWeight: 500, textAlign: 'right', color: selectedSku[field] ? 'var(--success)' : 'inherit' }}>{val}</td>;
            }
            if (field === 'regulatory_prohibition' || field === 'ip_risk_high') {
                return <td style={{ fontWeight: 500, textAlign: 'right', color: selectedSku[field] ? 'var(--danger)' : 'inherit' }}>{val}</td>;
            }
            if (field === 'local_list_price' || field === 'landed_cost') {
                return <td style={{ fontWeight: 500, textAlign: 'right' }}>{val !== '-' ? `$${Number(val).toFixed(2)}` : val}</td>;
            }
            return <td style={{ fontWeight: 500, textAlign: 'right' }}>{val}</td>;
        }

        // Type handling
        if (field === 'target_market') {
            return (
                <td style={{ textAlign: 'right' }}>
                    <select
                        className="form-input"
                        style={{ margin: 0, padding: '0.2rem', width: '130px', display: 'inline-block' }}
                        value={editFormData[field] || ''}
                        onChange={(e) => handleEditChange(field, e.target.value)}
                    >
                        <option value="">- Select -</option>
                        {dbMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </td>
            );
        }

        if (type === 'boolean') {
            return (
                <td style={{ textAlign: 'right' }}>
                    <select
                        className="form-input"
                        style={{ margin: 0, padding: '0.2rem', width: '100px', display: 'inline-block' }}
                        value={editFormData[field] === true ? 'true' : editFormData[field] === false ? 'false' : ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            handleEditChange(field, val === 'true' ? true : val === 'false' ? false : null);
                        }}
                    >
                        <option value="">-</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                </td>
            );
        }

        return (
            <td style={{ textAlign: 'right' }}>
                <input
                    type={type}
                    className="form-input"
                    style={{ margin: 0, padding: '0.2rem', width: '100px', display: 'inline-block' }}
                    value={editFormData[field] === null || editFormData[field] === undefined ? '' : editFormData[field]}
                    onChange={(e) => {
                        let val = e.target.value;
                        if (type === 'number') val = val === '' ? null : Number(val);
                        handleEditChange(field, val);
                    }}
                />
            </td>
        );
    };

    if (loading && skus.length === 0) return <div style={{ padding: '2rem' }}>Loading SKUs...</div>;

    return (
        <div style={{ position: 'relative' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        SKU Portfolio
                        {selectedRows.length > 0 && (
                            <button
                                className="btn btn-primary"
                                style={{ fontSize: '0.875rem', padding: '0.4rem 0.75rem' }}
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                <Download size={16} />
                                {exporting ? 'Exporting...' : `Export ${selectedRows.length} Selected`}
                            </button>
                        )}
                    </h2>
                    <p className="text-muted" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                        Showing {filteredSkus.length} of {skus.length} imported SKUs.
                        {error && <span style={{ color: 'var(--danger)', marginLeft: '1rem' }}>{error}</span>}
                    </p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Filters:</span>
                    </div>

                    <select
                        className="form-input"
                        style={{ margin: 0, padding: '0.4rem', minWidth: '150px' }}
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                    >
                        <option value="">All Brands</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>

                    <select
                        className="form-input"
                        style={{ margin: 0, padding: '0.4rem', minWidth: '150px' }}
                        value={marketFilter}
                        onChange={(e) => setMarketFilter(e.target.value)}
                    >
                        <option value="">All Markets</option>
                        {dbMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select
                        className="form-input"
                        style={{ margin: 0, padding: '0.4rem', minWidth: '150px' }}
                        value={channelFilter}
                        onChange={(e) => setChannelFilter(e.target.value)}
                    >
                        <option value="">All Channels</option>
                        {channels.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="card">
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={filteredSkus.length > 0 && selectedRows.length === filteredSkus.length}
                                        onChange={handleSelectAll}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th>SKU ID</th>
                                <th>Name</th>
                                <th>Brand</th>
                                <th>Category</th>
                                <th>Target Market</th>
                                <th>Primary Channel</th>
                                <th>Calculated Score</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSkus.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                                        No SKUs match the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredSkus.map(sku => (
                                    <tr key={sku.sku_id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.includes(sku.sku_id)}
                                                onChange={() => handleSelectRow(sku.sku_id)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 500, color: 'var(--primary)' }}>{sku.sku_id}</td>
                                        <td>{sku.sku_name}</td>
                                        <td>{sku.brand || '-'}</td>
                                        <td>
                                            <span style={{
                                                backgroundColor: 'var(--bg-main)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '1rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 500
                                            }}>
                                                {sku.category}
                                            </span>
                                        </td>
                                        <td>{sku.target_market || '-'}</td>
                                        <td>{sku.primary_channel || '-'}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '6px',
                                                    backgroundColor: 'var(--border)',
                                                    borderRadius: '3px',
                                                    overflow: 'hidden'
                                                }}>
                                                    {/* Visual bar for score */}
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${Math.min(100, Math.max(0, (sku.cache?.channel_weighted_score || sku.cache?.weighted_score_layer_b || 0) * 10))}%`,
                                                        backgroundColor: 'var(--primary)'
                                                    }} />
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{((sku.cache?.channel_weighted_score || sku.cache?.weighted_score_layer_b) || 0).toFixed(1)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    onClick={() => handleViewClick(sku)}
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    onClick={() => handleEditClick(sku)}
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View/Edit Details Modal */}
            {selectedSku && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div className="card" style={{
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        position: 'relative'
                    }}>
                        <button
                            onClick={() => setSelectedSku(null)}
                            style={{
                                position: 'absolute', top: '1.5rem', right: '1.5rem',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-muted)'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingRight: '3rem' }}>
                            <h3 style={{ margin: 0 }}>
                                {isEditing ? <input type="text" className="form-input" style={{ fontSize: '1.5rem', fontWeight: 600, padding: '0.2rem 0.5rem', margin: 0 }} value={editFormData.sku_name || ''} onChange={(e) => handleEditChange('sku_name', e.target.value)} /> : selectedSku.sku_name}
                            </h3>
                            {isEditing && (
                                <button className="btn btn-primary" onClick={handleSaveEdit} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Save size={16} /> Save Changes
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
                            <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>ID: {selectedSku.sku_id}</span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Brand: {isEditing ? <input type="text" className="form-input" style={{ width: '120px', padding: '0.2rem 0.5rem', margin: 0 }} value={editFormData.brand || ''} onChange={(e) => handleEditChange('brand', e.target.value)} /> : (selectedSku.brand || '-')}
                            </span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                Category: {isEditing ? <input type="text" className="form-input" style={{ width: '120px', padding: '0.2rem 0.5rem', margin: 0 }} value={editFormData.category || ''} onChange={(e) => handleEditChange('category', e.target.value)} /> : selectedSku.category}
                            </span>
                            <span style={{ color: 'var(--border)' }}>|</span>
                            <span style={{ fontWeight: 500, color: 'var(--primary)' }}>Score: {((selectedSku.cache?.channel_weighted_score || selectedSku.cache?.weighted_score_layer_b) || 0).toFixed(2)}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* Raw Data Column */}
                            <div>
                                <h5 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>General Configuration</h5>
                                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Target Market</td>{renderEditableCell('target_market', 'text')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Primary Channel</td>{renderEditableCell('primary_channel', 'text')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Ramp Month</td>{renderEditableCell('ramp_month', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>MOQ</td>{renderEditableCell('moq', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Lead Time (Days)</td>{renderEditableCell('lead_time_days', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Shelf Life (Months)</td>{renderEditableCell('shelf_life_months', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Local List Price</td>{renderEditableCell('local_list_price', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Landed Cost</td>{renderEditableCell('landed_cost', 'number')}</tr>
                                    </tbody>
                                </table>

                                <h5 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '2rem' }}>Regulatory & Supply</h5>
                                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Regulatory Eligible</td>{renderEditableCell('regulatory_eligible', 'boolean')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Regulatory Prohibition</td>{renderEditableCell('regulatory_prohibition', 'boolean')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>High IP Risk</td>{renderEditableCell('ip_risk_high', 'boolean')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Supply Ready</td>{renderEditableCell('supply_ready', 'boolean')}</tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Scores Column */}
                            <div>
                                <h5 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Scoring Breakdowns</h5>
                                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Consumer Trend</td>{renderEditableCell('score_consumer_trend', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Point of Diff</td>{renderEditableCell('score_point_of_diff', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Channel Suitability</td>{renderEditableCell('score_channel_suitability', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Strategic Role</td>{renderEditableCell('score_strategic_role', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Marketing Leverage</td>{renderEditableCell('score_marketing_leverage', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Price Ladder</td>{renderEditableCell('score_price_ladder', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Usage Occasion</td>{renderEditableCell('score_usage_occasion', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Channel Diff</td>{renderEditableCell('score_channel_diff', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Story Cohesion</td>{renderEditableCell('score_story_cohesion', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Op. Synergy</td>{renderEditableCell('score_operational_synergy', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Reg. Delay Risk</td>{renderEditableCell('score_regulatory_delay', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Retail Listing Risk</td>{renderEditableCell('score_retail_listing', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Competitive Risk</td>{renderEditableCell('score_competitive', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Supply Chain Risk</td>{renderEditableCell('score_supply_chain', 'number')}</tr>
                                        <tr><td style={{ padding: '0.5rem 0', color: 'var(--text-muted)' }}>Price War Risk</td>{renderEditableCell('score_price_war', 'number')}</tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SkuPortfolio;
