import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, ArrowRight, Save } from 'lucide-react';
import api from '../services/api';

const expectedColumns = [
    { key: 'SKU ID', label: 'SKU ID', required: true },
    { key: 'SKU Name', label: 'SKU Name', required: true },
    { key: 'Category', label: 'Category', required: true },
    { key: 'Brand', label: 'Brand', required: false },
    { key: 'Target Market', label: 'Target Market', required: false },
    { key: 'Primary Channel', label: 'Primary Channel', required: false },
    { key: 'Ramp Month (1-4+)', label: 'Ramp Month', required: false },
    { key: 'Consumer Trend', label: 'Score: Consumer Trend', required: false },
    { key: 'Point of Diff', label: 'Score: Point of Diff', required: false },
    { key: 'Channel Suitability', label: 'Score: Channel Suitability', required: false },
    { key: 'Strategic Role', label: 'Score: Strategic Role', required: false },
    { key: 'Marketing Leverage', label: 'Score: Marketing Leverage', required: false },
    { key: 'Price Ladder', label: 'Score: Price Ladder', required: false },
    { key: 'Usage Occasion', label: 'Score: Usage Occasion', required: false },
    { key: 'Channel Diff', label: 'Score: Channel Diff', required: false },
    { key: 'Story Cohesion', label: 'Score: Story Cohesion', required: false },
    { key: 'Operational Synergy', label: 'Score: Operational Synergy', required: false },
    { key: 'Regulatory Delay', label: 'Score: Regulatory Delay', required: false },
    { key: 'Retail Listing', label: 'Score: Retail Listing', required: false },
    { key: 'Competitive', label: 'Score: Competitive', required: false },
    { key: 'Supply Chain', label: 'Score: Supply Chain', required: false },
    { key: 'Price War', label: 'Score: Price War', required: false },
    { key: 'Regulatory Eligible', label: 'Regulatory Eligible (Yes/No)', required: false },
    { key: 'Regulatory Prohibition', label: 'Regulatory Prohibition (Yes/No)', required: false },
    { key: 'IP Risk High', label: 'IP Risk High (Yes/No)', required: false },
    { key: 'Supply Ready', label: 'Supply Ready (Yes/No)', required: false },
    { key: 'MOQ', label: 'MOQ', required: false },
    { key: 'Lead Time (days)', label: 'Lead Time (days)', required: false },
    { key: 'Shelf Life (months)', label: 'Shelf Life (months)', required: false },
    { key: 'Local List Price (calc)', label: 'Local List Price', required: false },
    { key: 'Landed Cost (calc)', label: 'Landed Cost', required: false },
    { key: 'Pass: Portfolio Balance (manual)', label: 'Pass Portfolio Balance (Yes/No)', required: false },
    { key: 'Suggested Launch Wave', label: 'Suggested Launch Wave', required: false },
];

const ImportHub = () => {
    const [step, setStep] = useState(1); // 1 = Upload, 2 = Mapping
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    // Mapping state
    const [excelHeaders, setExcelHeaders] = useState([]);
    const [mapping, setMapping] = useState({});

    // Default Context
    const [dbMarkets, setDbMarkets] = useState([]);
    const [selectedMarket, setSelectedMarket] = useState('');

    useEffect(() => {
        const fetchMarkets = async () => {
            try {
                const res = await api.get('/markets/');
                setDbMarkets(res.data.map(m => m.market_name));
            } catch (err) {
                console.error("Error fetching markets", err);
            }
        };
        fetchMarkets();
    }, []);

    const fileInputRef = useRef(null);

    const onDragOver = (e) => {
        e.preventDefault();
        setDragging(true);
    };

    const onDragLeave = () => setDragging(false);

    const onDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    };

    // Process step 1: File selected -> Extract Headers
    const handleFileSelection = async (selectedFile) => {
        setFile(selectedFile);
        setStatus({ type: '', message: '' });
        setUploading(true);
        setStatus({ type: 'info', message: 'Extracting columns from your Excel file...' });

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await api.post('/upload/headers', formData);
            const headers = res.data.headers;
            setExcelHeaders(headers);

            // Auto-map based on exact/fuzzy matching
            const autoMap = {};
            expectedColumns.forEach(col => {
                const exactMatch = headers.find(h => h.toLowerCase().trim() === col.key.toLowerCase());
                if (exactMatch) {
                    autoMap[col.key] = exactMatch;
                } else if (col.key === 'SKU Name') {
                    // specific fuzzy
                    const nameMatch = headers.find(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('title'));
                    if (nameMatch) autoMap[col.key] = nameMatch;
                } else if (col.key === 'SKU ID') {
                    const idMatch = headers.find(h => h.toLowerCase().includes('id') || h.toLowerCase().includes('code'));
                    if (idMatch) autoMap[col.key] = idMatch;
                }
            });
            setMapping(autoMap);
            setStatus({ type: '', message: '' });
            setStep(2); // move to mapping phase
        } catch (error) {
            console.error("Upload error", error);
            setStatus({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to extract headers from the file.'
            });
            setFile(null); // Reset
        } finally {
            setUploading(false);
        }
    };

    const handleMappingChange = (dbKey, excelCol) => {
        setMapping(prev => ({
            ...prev,
            [dbKey]: excelCol
        }));
    };

    // Process step 2: Final Import
    const handleFinalImport = async () => {
        if (!file) return;

        // Validate required fields
        const missingReq = expectedColumns.filter(c => c.required && !mapping[c.key]);
        if (missingReq.length > 0) {
            setStatus({ type: 'error', message: `Please map all required fields: ${missingReq.map(m => m.label).join(', ')}` });
            return;
        }

        setUploading(true);
        setStatus({ type: 'info', message: 'Importing data and calculating scores...' });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(mapping));
        if (selectedMarket) {
            formData.append('default_market', selectedMarket);
        }

        try {
            const res = await api.post('/upload/', formData);
            setStatus({
                type: 'success',
                message: `File imported successfully! Processed ${res.data.stats.skus} SKUs.`
            });
            setStep(1);
            setFile(null);
        } catch (error) {
            console.error("Upload error", error);
            setStatus({
                type: 'error',
                message: error.response?.data?.detail || 'An error occurred during file upload.'
            });
        } finally {
            setUploading(false);
        }
    };

    const cancelImport = () => {
        setFile(null);
        setStep(1);
        setStatus({ type: '', message: '' });
    };

    return (
        <div>
            <div className="page-header">
                <h2 className="page-title">Import Hub</h2>
            </div>

            {status.message && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: status.type === 'error' ? 'var(--danger-bg)' : status.type === 'success' ? 'var(--success-bg)' : '#e0f2fe',
                    color: status.type === 'error' ? 'var(--danger)' : status.type === 'success' ? 'var(--success)' : '#0284c7'
                }}>
                    {status.type === 'error' && <AlertCircle size={20} />}
                    {status.type === 'success' && <CheckCircle2 size={20} />}
                    {status.message}
                </div>
            )}

            {step === 1 && (
                <div className="card">
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h4>Upload SKU Master File</h4>
                        <p className="text-muted" style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                            Upload your `.xlsx` SKU List. The configuration settings will automatically be populated with defaults that you can edit later.
                        </p>

                        <div
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--border)'}`,
                                borderRadius: '0.75rem',
                                padding: '3rem 2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: dragging ? 'var(--primary-light)' : 'var(--bg-card)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <UploadCloud size={48} color={dragging ? 'var(--primary)' : 'var(--text-muted)'} style={{ margin: '0 auto 1rem' }} />
                            <h5 style={{ marginBottom: '0.5rem' }}>Click or drag file to this area to upload</h5>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files</p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx, .xls"
                                style={{ display: 'none' }}
                            />
                        </div>

                        {uploading && (
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Currently parsing file...</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <h4>Map Columns</h4>
                            <p className="text-muted" style={{ color: 'var(--text-muted)' }}>
                                We found <strong>{excelHeaders.length}</strong> columns in <span style={{ fontWeight: 600 }}>{file?.name}</span>.
                                Match them to the database fields below.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-outline" onClick={cancelImport} disabled={uploading}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleFinalImport} disabled={uploading}>
                                {uploading ? 'Importing...' : 'Start Import'} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2rem' }}>
                        <div style={{ borderRight: '1px solid var(--border)', paddingRight: '2rem' }}>
                            <h5 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                Expected Fields <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Required fields are marked)</span>
                            </h5>

                            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '1rem' }}>
                                {expectedColumns.map(col => (
                                    <div key={col.key} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{
                                            fontWeight: col.required ? 600 : 400,
                                            color: col.required ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontSize: '0.9rem',
                                            flex: '0 0 45%'
                                        }}>
                                            {col.label} {col.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                                        </label>

                                        <select
                                            className="form-input"
                                            style={{ flex: '0 0 50%', margin: 0, padding: '0.4rem' }}
                                            value={mapping[col.key] || ''}
                                            onChange={(e) => handleMappingChange(col.key, e.target.value)}
                                        >
                                            <option value="">-- Ignore --</option>
                                            {excelHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div style={{ backgroundColor: 'var(--bg-main)', padding: '1.5rem', borderRadius: '0.5rem' }}>
                                <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <AlertCircle size={18} color="var(--primary)" /> Import Context
                                </h5>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    The system attempts to auto-match columns with exact names (like <strong>Category</strong>).
                                </p>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Any unmapped fields will just be imported as null/empty or use their default value. You are not required to map every field if your data source does not have the information.
                                </p>

                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <h6 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Default Global Target Market</h6>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Apply this market to all imported SKUs (overrides any mapped Target Market column).
                                    </p>
                                    <select
                                        className="form-input"
                                        style={{ width: '100%', padding: '0.5rem' }}
                                        value={selectedMarket}
                                        onChange={(e) => setSelectedMarket(e.target.value)}
                                    >
                                        <option value="">-- No Default (Use Mapped Row Value) --</option>
                                        {dbMarkets.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportHub;
