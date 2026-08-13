import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon, X, Plus, ArrowRight, Sparkles, FileText,
  Download, Mail, ChevronDown, ChevronUp, MessageSquare, Database,
} from 'lucide-react';
import { useAppState } from '../App';
import searchService from '../services/searchService';
import authService from '../services/authService';
import SearchResultView from './results/SearchResultView';
import './Search.css';

const emptyReport = {
  report_id: '', job_name: '', predecessor: '', successor: '', state: 'CA',
  report_name: '', functional_area: '', package_name: '', script_name: '',
  output_format: '', frequency: '', report_type: '', report_query: '',
  tables_used: '', data_source: '', columns_in_tables: '',
};

const Search = () => {
  const { selectedState } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const autoSearchStarted = useRef(false);

  const navigationState = location.state || {};
  const navigationQuery = String(navigationState.query || '');
  const navigationMode = navigationState.mode === 'nlp' ? 'nlp' : 'traditional';
  const navigationSelectedState = navigationState.state || selectedState || 'all';
  const resultView = Boolean(navigationState.resultView);
  const autoSearch = Boolean(navigationState.autoSearch);

  const [query, setQuery] = useState(navigationQuery);
  const [searchType, setSearchType] = useState(navigationMode);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReport, setNewReport] = useState(emptyReport);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const results = response?.results || [];

  const handleSearch = useCallback(async (
    searchQuery = query,
    mode = searchType,
    state = selectedState || 'all',
  ) => {
    const trimmedQuery = String(searchQuery || '').trim();
    if (!trimmedQuery) return;

    setLoading(true);
    setHasSearched(true);
    setSearchError('');
    setResponse(null);
    setExpandedReport(null);

    try {
      const data = await searchService.search(trimmedQuery, mode, state);
      setQuery(trimmedQuery);
      setSearchType(mode);
      setResponse(data);
    } catch (error) {
      setSearchError(
        error.response?.data?.detail ||
          'Unable to complete the search. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [query, searchType, selectedState]);

  useEffect(() => {
    if (!navigationState.mode && !navigationState.query) return;

    setSearchType(navigationMode);
    setQuery(navigationQuery);
    setResponse(null);
    setSearchError('');
    setExpandedReport(null);
    setHasSearched(false);

    if (navigationState.openAdd) setShowAddModal(true);
    if (navigationState.openContact) setContactOpen(true);
  }, [
    navigationState.mode,
    navigationState.query,
    navigationState.openAdd,
    navigationState.openContact,
    navigationMode,
    navigationQuery,
  ]);

  useEffect(() => {
    if (
      !resultView ||
      !autoSearch ||
      !navigationQuery.trim() ||
      autoSearchStarted.current
    ) {
      return;
    }

    autoSearchStarted.current = true;
    handleSearch(navigationQuery, navigationMode, navigationSelectedState);
  }, [
    resultView,
    autoSearch,
    navigationQuery,
    navigationMode,
    navigationSelectedState,
    handleSearch,
  ]);

  const handleTabSwitch = (type) => {
    if (type === searchType) return;

    setSearchType(type);
    setQuery('');
    setResponse(null);
    setExpandedReport(null);
    setLoading(false);
    setShowAddModal(false);
    setContactOpen(false);
    setAddError('');
    setAddSuccess('');
    setContactMessage('');
    setContactSuccess('');
    setHasSearched(false);
    setSearchError('');
  };

  const handleAddDetails = async (event) => {
    event.preventDefault();
    setAddError('');
    setAddSuccess('');
    if (!newReport.report_name.trim()) {
      setAddError('Report name is required');
      return;
    }
    const user = authService.getCurrentUser();
    try {
      const result = await searchService.submitReportRequest({
        ...newReport,
        original_query: query,
        requested_by: user?.username || '',
        requester_email: user?.email || '',
      });
      setAddSuccess(`Request ${result.request_id} submitted for reporting team review.`);
      setNewReport({ ...emptyReport, state: selectedState === 'all' ? 'CA' : selectedState });
    } catch (error) {
      setAddError(error.response?.data?.detail || 'Unable to submit report details');
    }
  };

  const handleContact = async (event) => {
    event.preventDefault();
    const user = authService.getCurrentUser();
    try {
      const result = await searchService.contactDev({
        original_query: query,
        message: contactMessage,
        requested_by: user?.username || '',
        requester_email: user?.email || '',
      });
      setContactSuccess(`Request ${result.request_id} was sent to the reporting support team.`);
      setContactMessage('');
    } catch (error) {
      setContactSuccess('');
    }
  };

  const downloadCSV = () => {
    if (!results.length) return;
    const exportFields = ['report_id', 'report_name', 'functional_area', 'package_name', 'frequency', 'state', 'data_source', 'condition_match_percent', 'semantic_score_percent', 'final_score_percent'];
    const rows = results.map((result) => exportFields.map((field) => `"${String(result[field] ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[exportFields.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = `search_results_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const renderDetail = (label, value) => (
    <div className="detail-row" key={label}><span className="detail-label">{label}</span><span className="detail-value">{value || '—'}</span></div>
  );

  const formFields = [
    ['report_id', 'Report ID'], ['report_name', 'Report Description *'], ['job_name', 'Job Name'],
    ['predecessor', 'Predecessor'], ['successor', 'Successor'], ['functional_area', 'Module'],
    ['package_name', 'Package Name'], ['script_name', 'Script Name'], ['output_format', 'Output Format'],
    ['frequency', 'Frequency'], ['report_type', 'Report Type'], ['data_source', 'Data Source'],
    ['tables_used', 'Tables Used'], ['columns_in_tables', 'Columns In Tables'],
  ];

  if (resultView) {
    return (
      <>
      <SearchResultView
        query={query || navigationQuery}
        mode={searchType}
        selectedState={navigationSelectedState}
        response={response}
        loading={loading}
        error={searchError}
        onBack={() => navigate('/dashboard')}
        onNewSearch={() => navigate('/dashboard')}
        onRetry={() => handleSearch(
          query || navigationQuery,
          searchType,
          navigationSelectedState,
        )}
        onAddDetails={() => {
          setAddError('');
          setAddSuccess('');
          setNewReport({
            ...emptyReport,
            state: navigationSelectedState === 'all'
              ? 'CA'
              : navigationSelectedState,
          });
          setShowAddModal(true);
        }}
        onContactTeam={() => {
          setContactSuccess('');
          setContactOpen(true);
        }}
      />

      {showAddModal && <div className="modal-overlay"><div className="modal-content wide"><div className="modal-header"><h3>Add Report Details</h3><button className="modal-close" onClick={() => setShowAddModal(false)}><X size={18}/></button></div><form onSubmit={handleAddDetails}><div className="modal-body">{addError && <div className="error-banner">{addError}</div>}{addSuccess && <div className="success-banner">{addSuccess}</div>}<div className="request-form-grid">{formFields.map(([field, label]) => <div className="form-row" key={field}><label>{label}</label><input required={field === 'report_name'} value={newReport[field]} onChange={(event) => setNewReport({ ...newReport, [field]: event.target.value })}/></div>)}</div><div className="form-row"><label>Report Query</label><textarea rows={5} value={newReport.report_query} onChange={(event) => setNewReport({ ...newReport, report_query: event.target.value })}/></div></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit" className="btn-primary">Submit for Review</button></div></form></div></div>}

      {contactOpen && <div className="modal-overlay"><div className="modal-content"><div className="modal-header"><h3><Mail size={18}/> Contact Reporting Support Team</h3><button className="modal-close" onClick={() => setContactOpen(false)}><X size={18}/></button></div><form onSubmit={handleContact}><div className="modal-body">{contactSuccess && <div className="success-banner">{contactSuccess}</div>}<div className="query-context"><Database size={16}/><span>{query}</span></div><div className="form-row"><label>Your Message</label><textarea required rows={5} value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder="Describe the report you need..."/></div></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setContactOpen(false)}>Cancel</button><button type="submit" className="btn-primary"><MessageSquare size={14}/>Send Message</button></div></form></div></div>}
    </>
    );
  }

  return (
    <div className="search-page">
      <div className="search-header-row"><div><h1>Search Reports</h1><p>Traditional lookup or natural-language discovery</p></div>{results.length > 0 && <button className="download-btn" onClick={downloadCSV}><Download size={14}/>Export CSV</button>}</div>
      <div className="tab-switcher">
        <button type="button" className={`tab-btn ${searchType === 'traditional' ? 'active' : ''}`} onClick={() => handleTabSwitch('traditional')}><FileText size={15}/>Traditional</button>
        <button type="button" className={`tab-btn ${searchType === 'nlp' ? 'active' : ''}`} onClick={() => handleTabSwitch('nlp')}><Sparkles size={15}/>Natural Language</button>
      </div>
      <div className="search-input-container">
        <div className="search-input-wrapper"><SearchIcon className="search-icon" size={18}/><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSearch()} placeholder={searchType === 'nlp' ? 'Ask for report details...' : 'Report ID or report name...'}/>{query && <button type="button" className="clear-btn" onClick={() => { setQuery(''); setResponse(null); setExpandedReport(null); }}><X size={15}/></button>}</div>
        <button type="button" className="search-btn" disabled={loading || !query.trim()} onClick={handleSearch}>{loading ? 'Searching...' : 'Search'}</button>
      </div>

      {hasSearched && response?.status === 'no_match' && !loading && (
        <div className="no-details-panel">
          <div className="empty-icon-small no-match">!</div><h2>No Data Found</h2>
          <div className="no-details-actions">
            <div className="no-details-card"><Plus size={28}/><h3>Add Details</h3><p>Know the report information? Submit the details for reporting support team review.</p><button className="action-btn primary" onClick={() => setShowAddModal(true)}>Add Details</button></div>
            <div className="no-details-card"><Mail size={28}/><h3>Contact Reporting Support Team</h3><p>Do not know the details? Send the unsuccessful query and a message.</p><button className="action-btn primary" onClick={() => setContactOpen(true)}>Contact Team</button></div>
          </div>
        </div>
      )}

      {response?.status === 'matches_found' && (
        <div className="results-list">
          <div className="results-header">{results.length} result{results.length === 1 ? '' : 's'} found</div>
          {results.map((report, index) => (
            <div className="result-card-wrapper" key={report.report_id || index}>
              <div className="result-card" onClick={() => setExpandedReport(expandedReport === index ? null : index)}>
                <div><div className="result-id">{report.report_id}</div><div className="result-name">{report.report_name}</div><div className="result-meta"><span className="meta-badge">{report.functional_area || 'Unknown'}</span><span className="meta-badge source">{report.data_source || 'Unknown'}</span>{report.condition_match_percent != null && <span className="meta-badge score">{report.condition_match_percent}% condition match</span>}</div></div>
                <div className="result-actions">{expandedReport === index ? <ChevronUp size={17}/> : <ChevronDown size={17}/>}<ArrowRight size={17}/></div>
              </div>
              {expandedReport === index && <div className="result-detail-panel"><div className="detail-grid">
                {renderDetail('Report ID', report.report_id)}{renderDetail('Report Name', report.report_name)}{renderDetail('Job Name', report.job_name)}{renderDetail('Predecessor', report.predecessor)}{renderDetail('Successor', report.successor)}{renderDetail('State', report.state)}{renderDetail('Functional Area', report.functional_area)}{renderDetail('Package', report.package_name)}{renderDetail('Script Name', report.script_name)}{renderDetail('Output Format', report.output_format)}{renderDetail('Frequency', report.frequency)}{renderDetail('Report Type', report.report_type)}{renderDetail('Tables Used', report.tables_used)}{renderDetail('Data Source', report.data_source)}{renderDetail('Columns In Tables', report.columns_in_tables)}{renderDetail('Final Score', report.final_score_percent == null ? null : `${report.final_score_percent}%`)}
              </div></div>}
            </div>
          ))}
        </div>
      )}

      {showAddModal && <div className="modal-overlay"><div className="modal-content wide"><div className="modal-header"><h3>Add Report Details</h3><button className="modal-close" onClick={() => setShowAddModal(false)}><X size={18}/></button></div><form onSubmit={handleAddDetails}><div className="modal-body">{addError && <div className="error-banner">{addError}</div>}{addSuccess && <div className="success-banner">{addSuccess}</div>}<div className="request-form-grid">{formFields.map(([field, label]) => <div className="form-row" key={field}><label>{label}</label><input required={field === 'report_name'} value={newReport[field]} onChange={(event) => setNewReport({ ...newReport, [field]: event.target.value })}/></div>)}</div><div className="form-row"><label>Report Query</label><textarea rows={5} value={newReport.report_query} onChange={(event) => setNewReport({ ...newReport, report_query: event.target.value })}/></div></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button><button type="submit" className="btn-primary">Submit for Review</button></div></form></div></div>}

      {contactOpen && <div className="modal-overlay"><div className="modal-content"><div className="modal-header"><h3><Mail size={18}/> Contact Reporting Support Team</h3><button className="modal-close" onClick={() => setContactOpen(false)}><X size={18}/></button></div><form onSubmit={handleContact}><div className="modal-body">{contactSuccess && <div className="success-banner">{contactSuccess}</div>}<div className="query-context"><Database size={16}/><span>{query}</span></div><div className="form-row"><label>Your Message</label><textarea required rows={5} value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder="Describe the report you need..."/></div></div><div className="modal-footer"><button type="button" className="btn-secondary" onClick={() => setContactOpen(false)}>Cancel</button><button type="submit" className="btn-primary"><MessageSquare size={14}/>Send Message</button></div></form></div></div>}
    </div>
  );
};

export default Search;
