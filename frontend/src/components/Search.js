import React, { useState } from 'react';
import { useAppState } from '../App';
import { Search as SearchIcon, X, Plus, ArrowRight, Sparkles, FileText } from 'lucide-react';
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
  const [newReport, setNewReport] = useState({
    report_id: '', report_name: '', functional_area: '', package_name: '',
    frequency: 'Daily', report_type: 'Standard', state: 'NH', data_source: 'MMIS'
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchService.search(query, searchType, selectedState);
      setResults(data);
    } catch (err) {
      // Error handled silently
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleAddReport = async (e) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!newReport.report_name) {
      setAddError('Report name is required');
      return;
    }
    try {
      await searchService.addReport(newReport);
      setAddSuccess('Report added successfully!');
      setNewReport({
        report_id: '', report_name: '', functional_area: '', package_name: '',
        frequency: 'Daily', report_type: 'Standard', state: 'NH', data_source: 'MMIS'
      });
      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
      }, 1500);
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Failed to add report');
    }
  };

  const getStateLabel = () => {
    if (selectedState === 'all') return 'All States';
    if (selectedState === 'AK') return 'Alaska';
    if (selectedState === 'NH') return 'New Hampshire';
    if (selectedState === 'ND') return 'North Dakota';
    return selectedState;
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Search Reports</h1>
        <p>Search across <span className="state-highlight">{getStateLabel()}</span></p>
      </div>

      <div className="tab-switcher">
        <button className={`tab-btn ${searchType === 'traditional' ? 'active' : ''}`}
          onClick={() => setSearchType('traditional')}>
          <FileText size={16} />Traditional Search
        </button>
        <button className={`tab-btn ${searchType === 'nlp' ? 'active' : ''}`}
          onClick={() => setSearchType('nlp')}>
          <Sparkles size={16} />NLP Search
        </button>
      </div>

      <div className="search-input-container">
        <div className="search-input-wrapper">
          <SearchIcon size={20} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={searchType === 'nlp' ? "Ask in natural language..." : "Search by report name, ID, or module..."}
          />
          {query && (
            <button className="clear-btn" onClick={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <X size={16} />
            </button>
          )}
        </div>
        <button className="search-btn" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {!searched && (
        <div className="empty-state">
          <div className="empty-icon">?</div>
          <h3>Start Searching</h3>
          <p>Enter a query to find reports across all states</p>
          <div className="empty-actions">
            <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />Add New Report
            </button>
            <button className="action-btn secondary" onClick={() => { setQuery(''); handleSearch(); }}>
              <FileText size={16} />View All
            </button>
          </div>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="empty-state">
          <div className="empty-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>!</div>
          <h3>No Results Found</h3>
          <p>No reports match your search criteria</p>
          <div className="empty-actions">
            <button className="action-btn primary" onClick={() => setShowAddModal(true)}>
              <Plus size={16} />Add New Report
            </button>
          </div>
        </div>
      )}

      {searched && results.length > 0 && (
        <>
          <div className="results-header">{results.length} result{results.length !== 1 ? 's' : ''} found</div>
          <div className="results-list">
            {results.map((report, idx) => (
              <div key={idx} className="result-card">
                <div>
                  <div className="result-id">{report.report_id}</div>
                  <div className="result-name">{report.report_name}</div>
                  <div className="result-meta">
                    <span className="meta-badge">{report.functional_area}</span>
                    <span className="meta-badge source">{report.data_source}</span>
                    <span className="meta-badge">{report.frequency}</span>
                    <span className="meta-badge">{report.state}</span>
                  </div>
                </div>
                <ArrowRight size={18} className="result-arrow" />
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
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddReport}>
              <div className="modal-body">
                {addError && <div className="error-banner"><span className="error-icon">!</span>{addError}</div>}
                {addSuccess && <div className="success-banner">{addSuccess}</div>}
                <div className="form-row">
                  <label>Report ID (optional)</label>
                  <input type="text" value={newReport.report_id}
                    onChange={(e) => setNewReport({ ...newReport, report_id: e.target.value })}
                    placeholder="Auto-generated if empty" />
                </div>
                <div className="form-row">
                  <label>Report Name *</label>
                  <input type="text" value={newReport.report_name}
                    onChange={(e) => setNewReport({ ...newReport, report_name: e.target.value })}
                    placeholder="Enter report name" required />
                </div>
                <div className="form-row">
                  <label>Functional Area</label>
                  <input type="text" value={newReport.functional_area}
                    onChange={(e) => setNewReport({ ...newReport, functional_area: e.target.value })}
                    placeholder="e.g. PROVIDER" />
                </div>
                <div className="form-row">
                  <label>Package Name</label>
                  <input type="text" value={newReport.package_name}
                    onChange={(e) => setNewReport({ ...newReport, package_name: e.target.value })}
                    placeholder="e.g. MMIS Reports" />
                </div>
                <div className="form-row">
                  <label>Frequency</label>
                  <select value={newReport.frequency}
                    onChange={(e) => setNewReport({ ...newReport, frequency: e.target.value })}>
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                    <option>Yearly</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>State</label>
                  <select value={newReport.state}
                    onChange={(e) => setNewReport({ ...newReport, state: e.target.value })}>
                    <option value="NH">New Hampshire</option>
                    <option value="AK">Alaska</option>
                    <option value="ND">North Dakota</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Data Source</label>
                  <input type="text" value={newReport.data_source}
                    onChange={(e) => setNewReport({ ...newReport, data_source: e.target.value })}
                    placeholder="e.g. MMIS" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
