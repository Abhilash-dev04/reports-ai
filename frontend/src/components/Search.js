import React, { useState } from 'react';
import { useAppState } from '../App';
import { Search as SearchIcon, X, Plus, ArrowRight, Sparkles, FileText, Download, Copy, Check, Mail, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import searchService from '../services/searchService';
import './Search.css';

const Search = () => {
  const { selectedState } = useAppState();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('traditional');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [copied, setCopied] = useState(false);
  const [newReport, setNewReport] = useState({
    report_id: '', report_name: '', functional_area: '', package_name: '',
    frequency: 'Daily', report_type: 'Standard', state: 'NH', data_source: 'MMIS'
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);

  const handleTabSwitch = (type) => {
    setSearchType(type);
    setQuery('');
    setResults([]);
    setSearched(false);
    setExpandedReport(null);
    setCopied(false);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setExpandedReport(null);
    try {
      const data = await searchService.search(query, searchType, selectedState);
      setResults(data);
    } catch (err) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = query;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadCSV = () => {
    if (!results.length) return;
    const headers = Object.keys(results[0]).join(',');
    const rows = results.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `search_results_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!newReport.report_name) { setAddError('Report name is required'); return; }
    try {
      await searchService.addReport(newReport);
      setAddSuccess('Thank You for the details, Report details will be updated..');
      setNewReport({
        report_id: '', report_name: '', functional_area: '', package_name: '',
        frequency: 'Daily', report_type: 'Standard', state: 'NH', data_source: 'MMIS'
      });
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
      }, 2500);
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to add report');
    }
  };

  const handleContactDev = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    try {
      await searchService.contactDev(contactMessage);
      setContactSent(true);
      setContactMessage('');
      setTimeout(() => {
        setContactOpen(false);
        setContactSent(false);
      }, 2000);
    } catch (err) {
      // Silently handle
    }
  };

  const getPlaceholder = () => {
    if (searchType === 'nlp') return 'Ask your Report details...';
    return 'Report ID or Report Name...';
  };

  const getStateLabel = () => {
    if (selectedState === 'all') return 'All States';
    if (selectedState === 'AK') return 'Alaska';
    if (selectedState === 'NH') return 'New Hampshire';
    if (selectedState === 'ND') return 'North Dakota';
    return selectedState;
  };

  const renderDetailRow = (label, value) => (
    <div className="detail-row" key={label}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value || '—'}</span>
    </div>
  );

  return (
    <div className="search-page">
      <div className="search-header-row">
        <div>
          <h1>Search Reports</h1>
          <p>Search across <span className="state-highlight">{getStateLabel()}</span></p>
        </div>
        {results.length > 0 && (
          <button className="download-btn" onClick={downloadCSV}>
            <Download size={14} />Export CSV
          </button>
        )}
      </div>

      <div className="tab-switcher">
        <button className={`tab-btn ${searchType === 'traditional' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('traditional')}>
          <FileText size={14} />Traditional
        </button>
        <button className={`tab-btn ${searchType === 'nlp' ? 'active' : ''}`}
          onClick={() => handleTabSwitch('nlp')}>
          <Sparkles size={14} />NLP Search
        </button>
      </div>

      <div className="search-input-container">
        <div className="search-input-wrapper">
          <SearchIcon size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={getPlaceholder()}
          />
          {query && (
            <button className="clear-btn" onClick={() => { setQuery(''); setResults([]); setSearched(false); setExpandedReport(null); }}>
              <X size={14} />
            </button>
          )}
        </div>
        <button className="copy-btn" onClick={copyToClipboard} disabled={!query} title="Copy query">
          {copied ? <Check size={16} className="copy-check" /> : <Copy size={16} />}
        </button>
        <button className="search-btn" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {!searched && (
        <div className="empty-state compact">
          <div className="empty-icon-small">?</div>
          <h3>Start Searching</h3>
          <p>Enter a query to find reports across all states</p>
          <div className="empty-actions">
            <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} />Add New Report
            </button>
            <button className="action-btn link" onClick={() => setContactOpen(true)}>
              <Mail size={14} />Contact Cognos Dev Team
            </button>
          </div>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="empty-state compact">
          <div className="empty-icon-small" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>!</div>
          <h3>No Results Found</h3>
          <p>No reports match your search criteria in {getStateLabel()}</p>
          <div className="empty-actions">
            <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={14} />Add New Report
            </button>
            <button className="action-btn link" onClick={() => setContactOpen(true)}>
              <Mail size={14} />Contact Cognos Dev Team
            </button>
          </div>
        </div>
      )}

      {searched && results.length > 0 && (
        <>
          <div className="results-header-bar">
            <span>{results.length} result{results.length !== 1 ? 's' : ''} found</span>
            <button className="download-btn-sm" onClick={downloadCSV}>
              <Download size={14} />Download
            </button>
          </div>
          <div className="results-list">
            {results.map((report, idx) => (
              <div key={idx} className="result-card-wrapper">
                <div className="result-card" onClick={() => setExpandedReport(expandedReport === idx ? null : idx)}>
                  <div className="result-main">
                    <div className="result-id">{report.report_id}</div>
                    <div className="result-name">{report.report_name}</div>
                    <div className="result-meta">
                      <span className="meta-badge">{report.functional_area}</span>
                      <span className="meta-badge source">{report.data_source}</span>
                      <span className="meta-badge">{report.frequency}</span>
                      <span className="meta-badge state">{report.state}</span>
                      <span className="meta-badge">{report.package_name}</span>
                    </div>
                  </div>
                  <div className="result-actions">
                    {expandedReport === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <ArrowRight size={16} className="result-arrow" />
                  </div>
                </div>
                {expandedReport === idx && (
                  <div className="result-detail-panel">
                    <div className="detail-grid">
                      {renderDetailRow('Report ID', report.report_id)}
                      {renderDetailRow('Report Name', report.report_name)}
                      {renderDetailRow('Functional Area', report.functional_area)}
                      {renderDetailRow('Package Name', report.package_name)}
                      {renderDetailRow('Frequency', report.frequency)}
                      {renderDetailRow('Report Type', report.report_type)}
                      {renderDetailRow('State', report.state)}
                      {renderDetailRow('Data Source', report.data_source)}
                      {renderDetailRow('Created At', report.created_at)}
                      {renderDetailRow('Updated At', report.updated_at)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Report</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddReport}>
              <div className="modal-body">
                {addError && <div className="error-banner"><span className="error-icon">!</span>{addError}</div>}
                {addSuccess && <div className="success-banner">{addSuccess}</div>}
                <div className="form-row"><label>Report ID (optional)</label>
                  <input type="text" value={newReport.report_id}
                    onChange={(e) => setNewReport({ ...newReport, report_id: e.target.value })}
                    placeholder="Auto-generated if empty" /></div>
                <div className="form-row"><label>Report Name *</label>
                  <input type="text" value={newReport.report_name}
                    onChange={(e) => setNewReport({ ...newReport, report_name: e.target.value })}
                    placeholder="Enter report name" required /></div>
                <div className="form-row"><label>Functional Area</label>
                  <input type="text" value={newReport.functional_area}
                    onChange={(e) => setNewReport({ ...newReport, functional_area: e.target.value })}
                    placeholder="e.g. PROVIDER" /></div>
                <div className="form-row"><label>Package Name</label>
                  <input type="text" value={newReport.package_name}
                    onChange={(e) => setNewReport({ ...newReport, package_name: e.target.value })}
                    placeholder="e.g. MMIS Reports" /></div>
                <div className="form-row"><label>Frequency</label>
                  <select value={newReport.frequency}
                    onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value })}>
                    <option>Daily</option><option>Weekly</option><option>Monthly</option><option>Quarterly</option><option>Yearly</option>
                  </select></div>
                <div className="form-row"><label>State</label>
                  <select value={newReport.state}
                    onChange={(e) => setNewReport({ ...newReport, state: e.target.value })}>
                    <option value="NH">New Hampshire</option>
                    <option value="AK">Alaska</option>
                    <option value="ND">North Dakota</option>
                  </select></div>
                <div className="form-row"><label>Data Source</label>
                  <input type="text" value={newReport.data_source}
                    onChange={(e) => setNewReport({ ...newReport, data_source: e.target.value })}
                    placeholder="e.g. MMIS" /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Report</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contactOpen && (
        <div className="modal-overlay" onClick={() => setContactOpen(false)}>
          <div className="modal-content contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Mail size={18} /> Contact Cognos Dev Team</h3>
              <button className="modal-close" onClick={() => setContactOpen(false)}><X size={18} /></button>
            </div>
            {contactSent ? (
              <div className="modal-body center">
                <div className="success-icon-lg"><Check size={32} /></div>
                <h4>Message Sent!</h4>
                <p>The Cognos Dev Team has been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleContactDev}>
                <div className="modal-body">
                  <p className="contact-desc">Need a report that is not in the system? Send a message to the Cognos Development Team.</p>
                  <div className="form-row">
                    <label>Your Message</label>
                    <textarea value={contactMessage} onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Describe the report you need..." rows={4} required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setContactOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary"><MessageSquare size={14} />Send Message</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
