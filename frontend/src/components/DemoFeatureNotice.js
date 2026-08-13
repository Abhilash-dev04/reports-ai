import React from 'react';

const DemoFeatureNotice = ({ title = 'Backend feature' }) => (
  <main style={{ marginLeft: 'var(--sidebar-width)', minHeight: '100vh', padding: '48px', background: 'var(--bg-page)' }}>
    <div style={{ maxWidth: '720px', padding: '32px', background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', boxShadow: 'var(--shadow-card)' }}>
      <h1 style={{ marginTop: 0, color: 'var(--text-primary)' }}>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        This screen requires the FastAPI, PostgreSQL, pgvector, and embedding services.
        The public frontend demo enables login and dashboard exploration without an organizational backend.
      </p>
    </div>
  </main>
);
export default DemoFeatureNotice;
