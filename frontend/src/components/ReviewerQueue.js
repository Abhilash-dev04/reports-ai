import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Eye,
  FileSpreadsheet,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import reviewerService from '../services/reviewerService';
import './ReviewerQueue.css';

const filters = [
  'all',
  'Pending',
  'Under Review',
  'Approved',
  'Rejected',
  'Sync Failed',
];

const SyncBadge = ({ synced, label }) => (
  <span className={`sync-badge ${synced ? 'synced' : 'not-synced'}`}>
    {synced ? <CheckCircle size={13} /> : <Clock size={13} />}
    {label}: {synced ? 'Synced' : 'Not Synced'}
  </span>
);

const ReviewerQueue = () => {
  const [filter, setFilter] = useState('Pending');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await reviewerService.listRequests(filter);
      const requests = Array.isArray(response)
        ? response
        : Array.isArray(response?.requests)
        ? response.requests
        : [];

      setItems(requests);
      setError('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Unable to load requests',
      );
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    try {
      const data = await reviewerService.getRequest(id);
      setSelected(data || null);
      setComments(data?.review_comments || '');
      setError('');
      setMessage('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Unable to open request',
      );
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    setSelected(await reviewerService.getRequest(selected.id));
    await load();
  };

  const act = async (action) => {
    if (!selected || actionLoading) return;
    setActionLoading(true);
    setError('');
    setMessage('');

    try {
      if (action === 'start') {
        await reviewerService.startReview(selected.id);
        setMessage('Request is Under Review.');
      }

      if (action === 'approve') {
        const response = await reviewerService.approve(
          selected.id,
          comments,
        );
        if (response.excel_sync?.success === false) {
          setError(
            `PostgreSQL updated, but Excel sync failed: ${response.excel_sync.error}`,
          );
        } else {
          setMessage('Approved, searchable, and synchronized to Excel.');
        }
      }

      if (action === 'reject') {
        if (!comments.trim()) {
          setError('A rejection reason is required.');
          return;
        }
        await reviewerService.reject(selected.id, comments);
        setMessage('Request rejected.');
      }

      if (action === 'retry-sync') {
        const response = await reviewerService.retrySync(selected.id);
        if (response.excel_sync?.success === false) {
          setError(`Excel sync failed: ${response.excel_sync.error}`);
        } else {
          setMessage('Excel synchronization completed successfully.');
        }
      }

      await refreshSelected();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail || 'Reviewer action failed',
      );
    } finally {
      setActionLoading(false);
    }
  };

  const safeItems = Array.isArray(items) ? items : [];
  const fields = selected
    ? Object.entries({
        'Request ID': selected.id,
        Status: selected.status,
        'Original Query': selected.original_query,
        'Report ID': selected.report_id,
        'Report Name': selected.report_name,
        'Job Name': selected.job_name,
        Predecessor: selected.predecessor,
        Successor: selected.successor,
        State: selected.state,
        'Functional Area': selected.functional_area,
        Package: selected.package_name,
        'Script Name': selected.script_name,
        'Output Format': selected.output_format,
        Frequency: selected.frequency,
        'Report Type': selected.report_type,
        'Data Source': selected.data_source,
        'Tables Used': selected.tables_used,
        'Columns In Tables': selected.columns_in_tables,
        Filters: selected.filters,
        'Requested By': selected.requested_by,
        'Requester Email': selected.requester_email,
      })
    : [];

  return (
    <div className="reviewer-page">
      <div className="reviewer-header">
        <div>
          <h1>Report Review Queue</h1>
          <p>Review submitted report details and synchronization status.</p>
        </div>
        <button type="button" onClick={load}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="reviewer-filters">
        {filters.map((status) => (
          <button
            type="button"
            key={status}
            className={filter === status ? 'active' : ''}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {error && <div className="review-error">{error}</div>}
      {message && <div className="review-success">{message}</div>}

      <div className="reviewer-layout">
        <section className="review-list">
          {safeItems.length ? (
            safeItems.map((item) => (
              <button
                type="button"
                key={item.id}
                className={selected?.id === item.id ? 'selected' : ''}
                onClick={() => open(item.id)}
              >
                <strong>#{item.id} {item.report_name}</strong>
                <span>{item.status}</span>
                <small>{item.report_id || 'Report ID pending'}</small>
              </button>
            ))
          ) : (
            <div className="review-empty">No review requests found.</div>
          )}
        </section>

        <section className="review-detail">
          {!selected ? (
            <div className="review-empty">
              <Eye size={28} /> Select a request.
            </div>
          ) : (
            <>
              <h2>{selected.report_name}</h2>

              <div className="sync-status-row">
                <SyncBadge
                  synced={selected.database_synced}
                  label="PostgreSQL"
                />
                <SyncBadge synced={selected.excel_synced} label="Excel" />
              </div>

              {selected.sync_error && (
                <div className="sync-error-panel">
                  <AlertTriangle size={17} />
                  <div>
                    <strong>Excel synchronization failed</strong>
                    <p>{selected.sync_error}</p>
                  </div>
                </div>
              )}

              <div className="review-grid">
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <label>{label}</label>
                    <span>{value || '—'}</span>
                  </div>
                ))}
              </div>

              <label className="block-label">Report Query</label>
              <pre>{selected.report_query || '—'}</pre>

              <label className="block-label">
                Reviewer Comments or Rejection Reason
              </label>
              <textarea
                rows={4}
                value={comments}
                onChange={(event) => setComments(event.target.value)}
              />

              <div className="review-actions">
                {selected.status === 'Pending' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => act('start')}
                  >
                    <Clock size={16} /> Start Review
                  </button>
                )}

                {['Pending', 'Under Review'].includes(selected.status) && (
                  <>
                    <button
                      type="button"
                      className="approve"
                      disabled={actionLoading}
                      onClick={() => act('approve')}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      type="button"
                      className="reject"
                      disabled={actionLoading}
                      onClick={() => act('reject')}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </>
                )}

                {selected.database_synced && !selected.excel_synced && (
                  <button
                    type="button"
                    className="retry-sync"
                    disabled={actionLoading}
                    onClick={() => act('retry-sync')}
                  >
                    <RotateCcw size={16} /> Retry Excel Sync
                  </button>
                )}
              </div>

              <div className="sync-legend">
                <span><Database size={14} /> PostgreSQL</span>
                <span><FileSpreadsheet size={14} /> Excel master</span>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ReviewerQueue;
