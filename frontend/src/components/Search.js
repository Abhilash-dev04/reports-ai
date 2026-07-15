import React, { useState, useEffect } from 'react';
import {
  traditionalSearch,
  nlpSearch,
  checkExcelSource,
  addMissingData,
  contactDevTeam,
  exportToExcel,
} from '../services/searchService';
import { getCurrentUser } from '../services/authService';
import {
  Search, Brain, FileText, Database, AlertCircle,
  PlusCircle, Mail, Send, Download, X, CheckCircle,
  ArrowRight, Loader2, FileSpreadsheet
} from 'lucide-react';

const TABS = [
  { id: 'traditional', label: 'Traditional', icon: Search },
  { id: 'nlp', label: 'NLP', icon: Brain },
  { id: 'results', label: 'Results', icon: FileText },
];

const DB_COLUMNS = [
  { key: 'report_id', label: 'Report ID', required: true },
  { key: 'report_name', label: 'Report Name', required: true },
  { key: 'job_name', label: 'Job Name', required: false },
  { key: 'functional_area', label: 'Functional Area', required: false },
  { key: 'package_name', label: 'Package Name', required: false },
  { key: 'frequency', label: 'Frequency', required: false },
  { key: 'report_type', label: 'Report Type', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'data_source', label: 'Data Source', required: false },
];

const SearchComponent = () => {
  const [activeTab, setActiveTab] = useState('traditional');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [excelResults, setExcelResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [addFormData, setAddFormData] = useState({});
  const [contactFormData, setContactFormData] = useState({
    question: '',
    user_email: '',
    user_name: '',
    context: '',
  });
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const user = getCurrentUser();

  useEffect(() => {
    if (user.username) {
      setContactFormData((prev) => ({
        ...prev,
        user_name: user.username,
        user_email: `${user.username}@company.com`,
      }));
    }
  }, [user.username]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearchPerformed(true);
    setResults([]);
    setExcelResults([]);
    setShowAddForm(false);
    setShowContactForm(false);

    try {
      if (activeTab === 'traditional') {
        const res = await traditionalSearch(query);
        setResults(res.results || []);
        if (res.results.length === 0) {
          const excelRes = await checkExcelSource(query);
          setExcelResults(excelRes.results || []);
        }
      } else {
        const res = await nlpSearch(query);
        setResults(res.results || []);
        if (res.results.length === 0) {
          const excelRes = await checkExcelSource(query);
          setExcelResults(excelRes.results || []);
        }
      }
      setActiveTab('results');
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDataSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'loading', message: 'Adding data...' });
    try {
      await addMissingData(addFormData);
      setSubmitStatus({ type: 'success', message: 'Data added successfully!' });
      setTimeout(() => {
        setShowAddForm(false);
        setSubmitStatus({ type: '', message: '' });
        setAddFormData({});
        handleSearch();
      }, 1500);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to add data' });
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus({ type: 'loading', message: 'Sending email...' });
    try {
      await contactDevTeam({
        ...contactFormData,
        question: query,
      });
      setSubmitStatus({ type: 'success', message: 'Email sent to Cognos Dev Team!' });
      setTimeout(() => {
        setShowContactForm(false);
        setSubmitStatus({ type: '', message: '' });
      }, 2000);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: 'Failed to send email' });
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.8) return '#10B981';
    if (score >= 0.6) return '#3B82F6';
    if (score >= 0.4) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Search size={24} color="#3B82F6" />
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B', letterSpacing: '-0.5px' }}>
            Report Search
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: '#64748B', marginLeft: '34px' }}>
          Search across database and source files
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        padding: '4px',
        background: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        width: 'fit-content',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isActive
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : 'transparent',
                color: isActive ? '#FFFFFF' : '#64748B',
                boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      {(activeTab === 'traditional' || activeTab === 'nlp') && (
        <div style={{
          background: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
          border: '1px solid #F1F5F9',
          marginBottom: '24px',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              marginBottom: '8px',
            }}>
              {activeTab === 'traditional' ? 'Traditional Search (Keyword)' : 'NLP Search (Natural Language)'}
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={
                  activeTab === 'traditional'
                    ? 'Enter report ID, name, or keyword...'
                    : 'Ask naturally: "Show me daily claims reports"'
                }
                style={{
                  flex: 1,
                  padding: '14px 18px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#FAFBFC',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                style={{
                  padding: '14px 28px',
                  background: loading ? '#93C5FD' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#94A3B8' }}>
            {activeTab === 'traditional'
              ? 'Searches exact matches in report ID, name, functional area, and package name.'
              : 'Uses AI to understand meaning and find semantically similar reports.'}
          </p>
        </div>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <div>
          {/* Results from Database */}
          {results.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
              border: '1px solid #F1F5F9',
              marginBottom: '24px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={18} color="#3B82F6" />
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
                    Database Results ({results.length})
                  </h3>
                </div>
                <button
                  onClick={() => exportToExcel(query)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: '#EFF6FF',
                    color: '#3B82F6',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Download size={14} />
                  Export Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Report ID', 'Report Name', 'Functional Area', 'Package', 'Frequency', 'Type', 'State', 'Source', 'Match'].map((h) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderBottom: '1px solid #E2E8F0',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#3B82F6', fontWeight: '600' }}>
                          {row.report_id}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1E293B', fontWeight: '500' }}>
                          {row.report_name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.functional_area || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.package_name || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.frequency || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.report_type || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#EFF6FF',
                            color: '#3B82F6',
                          }}>{row.state || 'AK'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.data_source || 'MMIS'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {row.similarity !== undefined && (
                            <span style={{
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '600',
                              background: `${getSimilarityColor(row.similarity)}15`,
                              color: getSimilarityColor(row.similarity),
                            }}>
                              {(row.similarity * 100).toFixed(0)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results from Excel */}
          {excelResults.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
              border: '1px solid #F1F5F9',
              marginBottom: '24px',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '18px 24px',
                borderBottom: '1px solid #F1F5F9',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <FileSpreadsheet size={18} color="#10B981" />
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1E293B' }}>
                  Source Excel Results ({excelResults.length})
                </h3>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '600',
                  background: '#ECFDF5',
                  color: '#10B981',
                  marginLeft: '8px',
                }}>NOT IN DB</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Report ID', 'Report Name', 'Functional Area', 'Package', 'Frequency', 'Type', 'State', 'Source'].map((h) => (
                        <th key={h} style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderBottom: '1px solid #E2E8F0',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelResults.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#10B981', fontWeight: '600' }}>
                          {row.report_id}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1E293B' }}>
                          {row.report_name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.functional_area || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.package_name || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.frequency || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.report_type || '-'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            background: '#ECFDF5',
                            color: '#10B981',
                          }}>{row.state || 'AK'}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#475569' }}>
                          {row.data_source || 'MMIS'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Results - Show Add Data / Contact Dev Team */}
          {searchPerformed && results.length === 0 && excelResults.length === 0 && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              padding: '48px 32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)',
              border: '1px solid #F1F5F9',
              textAlign: 'center',
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                background: '#FEF2F2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <AlertCircle size={36} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>
                Data Not Available
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px' }}>
                No results found for: <strong style={{ color: '#3B82F6' }}>&ldquo;{query}&rdquo;</strong>
              </p>
              <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '28px' }}>
                The requested information was not found in the database or source Excel file.
              </p>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setShowAddForm(true); setShowContactForm(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 28px',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  <PlusCircle size={18} />
                  Add Missing Data
                </button>
                <button
                  onClick={() => { setShowContactForm(true); setShowAddForm(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 28px',
                    background: '#FFFFFF',
                    color: '#3B82F6',
                    border: '1.5px solid #3B82F6',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Mail size={18} />
                  Contact Cognos Dev Team
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Data Form Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '640px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease-out',
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={22} color="#3B82F6" />
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B' }}>
                  Add Missing Data
                </h2>
              </div>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#94A3B8',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                Fill in the details below. The data will be inserted into the database and updated in the Excel source file.
              </p>

              <form onSubmit={handleAddDataSubmit}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px',
                }}>
                  {DB_COLUMNS.map((col) => (
                    <div key={col.key}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#475569',
                        marginBottom: '6px',
                      }}>
                        {col.label}
                        {col.required && <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span>}
                      </label>
                      {col.key === 'state' ? (
                        <select
                          value={addFormData[col.key] || 'AK'}
                          onChange={(e) => setAddFormData({ ...addFormData, [col.key]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#FAFBFC',
                          }}
                        >
                          <option value="AK">AK - Alaska</option>
                          <option value="NH">NH - New Hampshire</option>
                          <option value="ND">ND - North Dakota</option>
                        </select>
                      ) : col.key === 'data_source' ? (
                        <select
                          value={addFormData[col.key] || 'MMIS'}
                          onChange={(e) => setAddFormData({ ...addFormData, [col.key]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            background: '#FAFBFC',
                          }}
                        >
                          <option value="MMIS">MMIS</option>
                          <option value="ORR">ORR</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={addFormData[col.key] || ''}
                          onChange={(e) => setAddFormData({ ...addFormData, [col.key]: e.target.value })}
                          placeholder={`Enter ${col.label.toLowerCase()}`}
                          required={col.required}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            border: '1.5px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '13px',
                            outline: 'none',
                            transition: 'all 0.2s',
                            background: '#FAFBFC',
                          }}
                          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                          onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {submitStatus.message && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: submitStatus.type === 'success' ? '#ECFDF5' :
                      submitStatus.type === 'error' ? '#FEF2F2' : '#EFF6FF',
                    color: submitStatus.type === 'success' ? '#10B981' :
                      submitStatus.type === 'error' ? '#EF4444' : '#3B82F6',
                    border: `1px solid ${submitStatus.type === 'success' ? '#A7F3D0' :
                      submitStatus.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
                  }}>
                    {submitStatus.type === 'loading' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        {submitStatus.message}
                      </span>
                    )}
                    {submitStatus.type === 'success' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={14} />
                        {submitStatus.message}
                      </span>
                    )}
                    {submitStatus.type === 'error' && submitStatus.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#F1F5F9',
                      color: '#64748B',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitStatus.type === 'loading'}
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: submitStatus.type === 'loading' ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={14} />
                    Submit Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contact Dev Team Modal */}
      {showContactForm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease-out',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            animation: 'slideIn 0.3s ease-out',
          }}>
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={22} color="#3B82F6" />
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B' }}>
                  Contact Cognos Dev Team
                </h2>
              </div>
              <button
                onClick={() => setShowContactForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  color: '#94A3B8',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              <div style={{
                background: '#EFF6FF',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '20px',
                border: '1px solid #BFDBFE',
              }}>
                <p style={{ fontSize: '13px', color: '#3B82F6', fontWeight: '500', marginBottom: '4px' }}>
                  Question Asked:
                </p>
                <p style={{ fontSize: '14px', color: '#1E40AF', fontWeight: '600' }}>
                  &ldquo;{query}&rdquo;
                </p>
              </div>

              <form onSubmit={handleContactSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '6px',
                  }}>Your Name</label>
                  <input
                    type="text"
                    value={contactFormData.user_name}
                    onChange={(e) => setContactFormData({ ...contactFormData, user_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#FAFBFC',
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '6px',
                  }}>Your Email</label>
                  <input
                    type="email"
                    value={contactFormData.user_email}
                    onChange={(e) => setContactFormData({ ...contactFormData, user_email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#FAFBFC',
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#475569',
                    marginBottom: '6px',
                  }}>Additional Context (Optional)</label>
                  <textarea
                    value={contactFormData.context}
                    onChange={(e) => setContactFormData({ ...contactFormData, context: e.target.value })}
                    placeholder="Describe what information you are looking for..."
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      outline: 'none',
                      resize: 'vertical',
                      background: '#FAFBFC',
                    }}
                  />
                </div>

                {submitStatus.message && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: submitStatus.type === 'success' ? '#ECFDF5' :
                      submitStatus.type === 'error' ? '#FEF2F2' : '#EFF6FF',
                    color: submitStatus.type === 'success' ? '#10B981' :
                      submitStatus.type === 'error' ? '#EF4444' : '#3B82F6',
                    border: `1px solid ${submitStatus.type === 'success' ? '#A7F3D0' :
                      submitStatus.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
                  }}>
                    {submitStatus.type === 'loading' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        {submitStatus.message}
                      </span>
                    )}
                    {submitStatus.type === 'success' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle size={14} />
                        {submitStatus.message}
                      </span>
                    )}
                    {submitStatus.type === 'error' && submitStatus.message}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#F1F5F9',
                      color: '#64748B',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitStatus.type === 'loading'}
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: submitStatus.type === 'loading' ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Send size={14} />
                    Send Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchComponent;
