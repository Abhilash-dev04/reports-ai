import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Search, Sparkles, X } from 'lucide-react';
import { useAppState } from '../App';
import './DashboardSearch.css';

const DashboardSearch = () => {
  const navigate = useNavigate();
  const { selectedState } = useAppState();
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState('nlp');
  const [query, setQuery] = useState('');

  const continueToSearch = () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    navigate('/search', {
      state: {
        mode,
        query: trimmedQuery,
        state: selectedState || 'all',
        autoSearch: true,
        resultView: true,
      },
    });
  };

  return (
    <section className={`dashboard-search-shell ${expanded ? 'expanded' : ''}`}>
      <div className="dashboard-search-heading">
        <span className="dashboard-search-eyebrow">
          <Sparkles size={14} /> AI-powered report discovery
        </span>
        <h2>What would you like to discover?</h2>
        <p>Search the enterprise report catalog by metadata or natural language.</p>
      </div>

      {!expanded ? (
        <button type="button" className="dashboard-search-launcher" onClick={() => setExpanded(true)}>
          <Search size={20} />
          <span>Ask about reports, packages, data sources, or functional areas...</span>
          <kbd>Click to search</kbd>
        </button>
      ) : (
        <div className="dashboard-search-workspace">
          <div className="dashboard-search-toolbar">
            <div className="dashboard-mode-switcher">
              <button
                type="button"
                className={mode === 'traditional' ? 'active' : ''}
                onClick={() => {
                  setMode('traditional');
                  setQuery('');
                }}
              >
                <FileText size={15} /> Traditional
              </button>
              <button
                type="button"
                className={mode === 'nlp' ? 'active' : ''}
                onClick={() => {
                  setMode('nlp');
                  setQuery('');
                }}
              >
                <Sparkles size={15} /> Natural Language
              </button>
            </div>

            <div className="dashboard-search-state">
              State: <strong>{selectedState === 'all' ? 'All States' : selectedState}</strong>
            </div>

            <button
              type="button"
              className="dashboard-search-close"
              onClick={() => {
                setExpanded(false);
                setQuery('');
              }}
              aria-label="Close search options"
            >
              <X size={17} />
            </button>
          </div>

          <div className="dashboard-search-input-row">
            {mode === 'nlp' ? <Sparkles size={20} /> : <Search size={20} />}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') continueToSearch();
              }}
              placeholder={
                mode === 'nlp'
                  ? 'Ask a question about your reports...'
                  : 'Enter a report ID or report name...'
              }
              autoFocus
            />
            <button type="button" onClick={continueToSearch} disabled={!query.trim()}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardSearch;
