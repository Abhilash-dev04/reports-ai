import api from './axiosConfig';

const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

const demoRequests = [
  {
    id: 'DEMO-RPT-101',
    report_id: 'DEMO-001',
    report_name: 'Provider Enrollment Summary',
    job_name: 'Enrollment Validation',
    original_query: 'Retrieve active provider enrollment records.',
    report_query: 'Report on provider IDs and enrollment dates for active enrollments.',
    status: 'Pending',
    predecessor: 'None',
    successor: 'Claims Reconciliation',
    state: 'CA',
    functional_area: 'Provider Management',
    package_name: 'Provider Demo Package',
    script_name: 'provider_enrollment_summary.sql',
    output_format: 'Excel',
    frequency: 'Weekly',
    report_type: 'Operational',
    data_source: 'DEMO_EDW',
    tables_used: 'provider_enrollment, provider_master',
    columns_in_tables: 'provider_id, enrollment_date, status',
    filters: 'status = active',
    requested_by: 'Alice Reviewer',
    requester_email: 'alice.reviewer@example.com',
    review_comments: '',
    database_synced: false,
    excel_synced: false,
    sync_error: null,
  },
  {
    id: 'DEMO-RPT-102',
    report_id: 'DEMO-002',
    report_name: 'Claims Payment Reconciliation',
    job_name: 'Claims Sync',
    original_query: 'List claims paid in the last 30 days.',
    report_query: 'Report claim ID, paid amount, and payment date for recent claims.',
    status: 'Under Review',
    predecessor: 'Eligibility Review',
    successor: 'Payments Export',
    state: 'TX',
    functional_area: 'Claims',
    package_name: 'Claims Demo Package',
    script_name: 'claims_reconciliation.sql',
    output_format: 'PDF',
    frequency: 'Daily',
    report_type: 'Financial',
    data_source: 'DEMO_OLTP',
    tables_used: 'claims, claims_details',
    columns_in_tables: 'claim_id, paid_amount, payment_date',
    filters: 'payment_date >= current_date - 30',
    requested_by: 'Bob Auditor',
    requester_email: 'bob.auditor@example.com',
    review_comments: 'Please verify payment totals for July.',
    database_synced: true,
    excel_synced: true,
    sync_error: null,
  },
  {
    id: 'DEMO-RPT-103',
    report_id: 'DEMO-003',
    report_name: 'Member Eligibility Exceptions',
    job_name: 'Eligibility Exception Report',
    original_query: 'Retrieve eligibility exceptions for flagged members.',
    report_query: 'Report member IDs and exception reasons for eligibility exceptions.',
    status: 'Approved',
    predecessor: 'Member Data Review',
    successor: 'Approval Notification',
    state: 'FL',
    functional_area: 'Eligibility',
    package_name: 'Eligibility Demo Package',
    script_name: 'eligibility_exceptions.sql',
    output_format: 'CSV',
    frequency: 'Monthly',
    report_type: 'Compliance',
    data_source: 'DEMO_WAREHOUSE',
    tables_used: 'eligibility_exceptions',
    columns_in_tables: 'member_id, exception_reason',
    filters: 'exception_flag = true',
    requested_by: 'Carmen Approver',
    requester_email: 'carmen.approver@example.com',
    review_comments: 'Approved for processing.',
    database_synced: true,
    excel_synced: true,
    sync_error: null,
  },
];

const findRequest = (id) => demoRequests.find((request) => request.id === id);

const reviewerService = {
  listRequests: async (status = 'all') => {
    if (isDemoMode) {
      if (status === 'all') {
        return [...demoRequests];
      }

      return demoRequests.filter((request) => request.status === status);
    }

    return (await api.get('/api/report-requests', { params: { status, limit: 100 } })).data.requests;
  },

  getRequest: async (id) => {
    if (isDemoMode) {
      const request = findRequest(id);
      return request ? { ...request } : null;
    }

    return (await api.get(`/api/report-requests/${id}`)).data;
  },

  startReview: async (id) => {
    if (isDemoMode) {
      const request = findRequest(id);
      if (request) {
        request.status = 'Under Review';
      }
      return request ? { ...request } : null;
    }

    return (await api.post(`/api/report-requests/${id}/start-review`, {})).data;
  },

  approve: async (id, comments = '') => {
    if (isDemoMode) {
      const request = findRequest(id);
      if (request) {
        request.status = 'Approved';
        request.review_comments = comments;
        request.database_synced = true;
        request.excel_synced = true;
        request.sync_error = null;
      }
      return {
        ...(request ? { ...request } : {}),
        excel_sync: { success: true },
      };
    }

    return (await api.post(`/api/report-requests/${id}/approve`, { comments })).data;
  },

  reject: async (id, reason) => {
    if (isDemoMode) {
      const request = findRequest(id);
      if (request) {
        request.status = 'Rejected';
        request.review_comments = reason;
      }
      return request ? { ...request } : null;
    }

    return (await api.post(`/api/report-requests/${id}/reject`, { reason })).data;
  },

  retrySync: async (id) => {
    if (isDemoMode) {
      const request = findRequest(id);
      if (request) {
        request.excel_synced = true;
        request.sync_error = null;
      }
      return {
        ...(request ? { ...request } : {}),
        excel_sync: { success: true },
      };
    }

    return (await api.post(`/api/report-requests/${id}/retry-sync`, {})).data;
  },
};

export default reviewerService;
