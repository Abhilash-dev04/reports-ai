import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  CalendarDays,
  Check,
  Clipboard,
  Code2,
  Copy,
  Database,
  FileText,
  Layers,
  Package,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react';
import './SearchResultView.css';

const FIELD_LABELS = {
  report_id: 'Report ID',
  report_name: 'Report Description',
  job_name: 'Job Name',
  predecessor: 'Predecessor',
  successor: 'Successor',
  state: 'State',
  functional_area: 'Module',
  package_name: 'Package',
  script_name: 'Script',
  output_format: 'Output Format',
  frequency: 'Frequency',
  report_type: 'Report Type',
  report_query: 'QUERY',
  tables_used: 'Tables Used',
  data_source: 'Data Source',
  columns_in_tables: 'Columns Used',
};

const STATE_LABELS = {
  CA: 'California',
  TX: 'Texas',
  FL: 'Florida',
  all: 'All States',
};

const COMPLETE_DETAIL_FIELDS = [
  'report_id',
  'report_name',
  'job_name',
  'predecessor',
  'successor',
  'state',
  'functional_area',
  'package_name',
  'script_name',
  'output_format',
  'frequency',
  'report_type',
  'report_query',
  'tables_used',
  'data_source',
  'columns_in_tables',
];

const TAB_DEFINITIONS = [
  {
    id: 'details',
    label: 'Details',
    icon: FileText,
    fields: [
      'report_id',
      'report_name',
      'state',
      'functional_area',
      'frequency',
      'output_format',
      'report_type',
    ],
  },
  {
    id: 'query',
    label: 'SQL & Tables',
    icon: Database,
    fields: ['report_query', 'tables_used', 'columns_in_tables', 'data_source'],
  },
  {
    id: 'package',
    label: 'Package & Script',
    icon: Package,
    fields: ['package_name', 'script_name', 'job_name'],
  },
  {
    id: 'metadata',
    label: 'Metadata',
    icon: CalendarDays,
    fields: ['predecessor', 'successor'],
  },
];

const hasValue = (value) => (
  value !== undefined && value !== null && String(value).trim() !== ''
);

const displayValue = (field, value) => {
  if (!hasValue(value)) return 'Not available';
  if (field === 'state') return STATE_LABELS[value] || value;
  return String(value);
};

const LIST_FIELDS = new Set([
  'tables_used',
  'columns_in_tables',
]);

const splitListValue = (field, value) => {
  if (!hasValue(value)) return [];

  const rawValue = String(value).trim();
  const items = field === 'tables_used'
    ? rawValue.split(/[,;\r\n]+|\s+/)
    : rawValue.split(/[,;\r\n]+/);

  const uniqueItems = [];
  const seenItems = new Set();

  items.forEach((item) => {
    const cleanedItem = item.trim();
    if (!cleanedItem) return;

    const normalizedItem = cleanedItem.toLowerCase();
    if (!seenItems.has(normalizedItem)) {
      seenItems.add(normalizedItem);
      uniqueItems.push(cleanedItem);
    }
  });

  return uniqueItems;
};

const isCompleteRecord = (record) => {
  const populatedFields = COMPLETE_DETAIL_FIELDS.filter(
    (field) => hasValue(record?.[field]),
  );
  return populatedFields.length >= 6 || hasValue(record?.report_query);
};

const CopyButton = ({ value, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const copyValue = async () => {
    if (!hasValue(value)) return;

    try {
      await navigator.clipboard.writeText(String(value));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="srv-copy-button"
      onClick={copyValue}
      disabled={!hasValue(value)}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? 'Copied' : label}
    </button>
  );
};

const FieldValue = ({ field, value }) => {
  const isQuery = field === 'report_query';
  const isListField = LIST_FIELDS.has(field);
  const listItems = isListField ? splitListValue(field, value) : [];

  return (
    <div
      className={[
        'srv-field',
        isQuery ? 'srv-query-field' : '',
        isListField ? 'srv-list-field' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="srv-field-heading">
        <span>{FIELD_LABELS[field] || field}</span>

        <div className="srv-field-heading-actions">
          {isListField && listItems.length > 0 && (
            <span className="srv-item-count">
              {listItems.length} {listItems.length === 1 ? 'item' : 'items'}
            </span>
          )}

          {(isQuery || isListField) && (
            <CopyButton
              value={isListField ? listItems.join('\n') : value}
              label={isQuery ? 'Copy Query' : 'Copy All'}
            />
          )}
        </div>
      </div>

      {isQuery ? (
        <pre className="srv-query-value">{displayValue(field, value)}</pre>
      ) : isListField ? (
        <div className="srv-list-value">
          {listItems.length > 0 ? (
            listItems.map((item, index) => (
              <div
                className="srv-list-item"
                key={`${field}-${item}-${index}`}
              >
                <span className="srv-list-number">{index + 1}</span>
                <span className="srv-list-text">{item}</span>
                <CopyButton value={item} label="Copy" />
              </div>
            ))
          ) : (
            <div className="srv-list-empty">Not available</div>
          )}
        </div>
      ) : (
        <div className="srv-field-value">{displayValue(field, value)}</div>
      )}
    </div>
  );
};

const ProjectedResultCard = ({ record, index }) => {
  const fields = Object.keys(record || {}).filter(
    (field) => FIELD_LABELS[field] && hasValue(record[field]),
  );

  return (
    <article className="srv-card srv-projected-card">
      <div className="srv-card-topline">
        <div>
          <span className="srv-result-number">Result {index + 1}</span>
          <h2>
            {record.report_name || record.report_id || 'Matching Report'}
          </h2>
        </div>
        {hasValue(record.state) && (
          <span className="srv-state-badge">
            {displayValue('state', record.state)}
          </span>
        )}
      </div>

      <div className="srv-projected-grid">
        {fields.map((field) => (
          <FieldValue key={field} field={field} value={record[field]} />
        ))}
      </div>
    </article>
  );
};

const CompleteResultCard = ({ record, index }) => {
  const availableTabs = TAB_DEFINITIONS.filter((tab) => (
    tab.fields.some((field) => hasValue(record?.[field]))
  ));
  const [activeTab, setActiveTab] = useState(
    availableTabs[0]?.id || 'details',
  );

  const selectedTab = availableTabs.find((tab) => tab.id === activeTab)
    || availableTabs[0];
  const visibleFields = selectedTab
    ? selectedTab.fields.filter((field) => hasValue(record?.[field]))
    : [];

  return (
    <article className="srv-card srv-complete-card">
      <div className="srv-report-header">
        <div className="srv-report-identity">
          <span className="srv-result-number">Result {index + 1}</span>
          <h2>{record.report_name || 'Report Details'}</h2>
          <div className="srv-badge-row">
            {hasValue(record.report_id) && (
              <span className="srv-code-badge">{record.report_id}</span>
            )}
            {hasValue(record.functional_area) && (
              <span className="srv-module-badge">
                {record.functional_area}
              </span>
            )}
            {hasValue(record.state) && (
              <span className="srv-state-badge">
                {displayValue('state', record.state)}
              </span>
            )}
          </div>
        </div>

        <div className="srv-source-summary">
          <span>Data Source</span>
          <strong>{displayValue('data_source', record.data_source)}</strong>
        </div>
      </div>

      {availableTabs.length > 0 && (
        <div className="srv-tabs" role="tablist" aria-label="Report details">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="srv-tab-panel" role="tabpanel">
        {visibleFields.length > 0 ? (
          <div className="srv-detail-grid">
            {visibleFields.map((field) => (
              <FieldValue key={field} field={field} value={record[field]} />
            ))}
          </div>
        ) : (
          <div className="srv-empty-tab">No information is available.</div>
        )}
      </div>
    </article>
  );
};

const SearchResultView = ({
  query = '',
  mode = 'nlp',
  selectedState = 'all',
  response = null,
  loading = false,
  error = '',
  onBack,
  onNewSearch,
  onRetry,
  onAddDetails,
  onContactTeam,
}) => {
  const results = useMemo(() => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (response?.result && typeof response.result === 'object') {
      return [response.result];
    }
    return [];
  }, [response]);

  const message = response?.message || '';
  const isNoMatch = !loading && !error && (
    response?.status === 'no_match'
    || response?.status === 'not_found'
    || (response && results.length === 0)
  );

  return (
    <main className="search-result-view">
      <div className="srv-shell">
        <header className="srv-page-header">
          <div className="srv-header-actions">
            <button type="button" className="srv-back-button" onClick={onBack}>
              <ArrowLeft size={17} /> Back to Dashboard
            </button>
            <button
              type="button"
              className="srv-new-search-button"
              onClick={onNewSearch}
            >
              <Search size={17} /> New Search
            </button>
          </div>

          <div className="srv-question-summary">
            <div className="srv-question-icon">
              {mode === 'nlp' ? <Box size={21} /> : <Search size={21} />}
            </div>
            <div>
              <span>Results for</span>
              <h1>{query || 'Report search'}</h1>
              <p>
                {mode === 'nlp' ? 'Natural Language' : 'Traditional'}
                {' search · '}
                {STATE_LABELS[selectedState] || selectedState}
              </p>
            </div>
          </div>
        </header>

        {loading && (
          <section className="srv-status-card srv-loading-card">
            <div className="srv-spinner" />
            <div>
              <h2>Searching enterprise report metadata...</h2>
              <p>Finding the most relevant report records.</p>
            </div>
          </section>
        )}

        {!loading && error && (
          <section className="srv-status-card srv-error-card">
            <div className="srv-status-icon error">!</div>
            <div>
              <h2>Unable to complete the search</h2>
              <p>{error}</p>
              {onRetry && (
                <button type="button" className="srv-retry-button" onClick={onRetry}>
                  <RefreshCw size={16} /> Retry
                </button>
              )}
            </div>
          </section>
        )}

        {!loading && !error && results.length > 0 && (
          <section className="srv-results-list" aria-live="polite">
            <div className="srv-results-count">
              <strong>{results.length}</strong>
              {' matching '}
              {results.length === 1 ? 'report' : 'reports'}
            </div>

            {results.map((record, index) => {
              const key = record.id
                || `${record.report_id || 'report'}-${record.state || 'state'}-${index}`;
              return isCompleteRecord(record) ? (
                <CompleteResultCard key={key} record={record} index={index} />
              ) : (
                <ProjectedResultCard key={key} record={record} index={index} />
              );
            })}
          </section>
        )}

        {isNoMatch && (
          <section className="srv-status-card srv-empty-card">
            <div className="srv-status-icon empty"><Search size={23} /></div>
            <div>
              <h2>No Data Found</h2>
              <p>{message || 'No matching report metadata was found.'}</p>
              <div className="srv-empty-actions">
                {onAddDetails && (
                  <button type="button" onClick={onAddDetails}>
                    <Clipboard size={16} /> Add Details
                  </button>
                )}
                {onContactTeam && (
                  <button type="button" className="secondary" onClick={onContactTeam}>
                    <Code2 size={16} /> Contact Reporting Support Team
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default SearchResultView;
