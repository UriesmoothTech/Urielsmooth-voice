import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ConsentStatus.css';

const ConsentStatus = ({ token }) => {
  const [consents, setConsents] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    fetchConsentData();
  }, []);

  const fetchConsentData = async () => {
    try {
      setLoading(true);
      const [consentsRes, auditRes] = await Promise.all([
        axios.get('/api/consent/my-consents'),
        axios.get('/api/consent/audit-trail'),
      ]);

      setConsents(consentsRes.data.consents || []);
      setAuditTrail(auditRes.data.auditTrail || []);
    } catch (error) {
      console.error('Failed to fetch consent data:', error);
      setError('Failed to load consent information');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async (consentId) => {
    if (!window.confirm('Are you sure you want to withdraw this consent?')) return;

    try {
      await axios.put(`/api/consent/withdraw/${consentId}`);
      setConsents(consents.filter((c) => c.id !== consentId));
      alert('Consent withdrawn successfully');
    } catch (error) {
      console.error('Withdraw failed:', error);
      setError('Failed to withdraw consent');
    }
  };

  if (loading) {
    return <div className="consent-status loading">Loading consent information...</div>;
  }

  return (
    <div className="consent-status">
      <h2>Consent Management</h2>

      <div className="consent-tabs">
        <button
          className={`tab ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current Consents ({consents.length})
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail ({auditTrail.length})
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'current' && (
        <div className="current-consents">
          {consents.length === 0 ? (
            <p className="no-data">No active consents found.</p>
          ) : (
            <div className="consents-grid">
              {consents.map((consent) => (
                <div key={consent.id} className="consent-card">
                  <div className="consent-header">
                    <h3>{consent.type.replace('_', ' ').toUpperCase()}</h3>
                    <span className="badge accepted">✓ Accepted</span>
                  </div>

                  <div className="consent-details">
                    <p>
                      <strong>Version:</strong> {consent.version}
                    </p>
                    <p>
                      <strong>Accepted:</strong>{' '}
                      {new Date(consent.acceptedAt).toLocaleDateString()}
                    </p>
                    {consent.isSelfConsent && (
                      <p className="self-consent-badge">
                        <em>Development Self-Consent</em>
                      </p>
                    )}
                  </div>

                  <button
                    className="btn btn-danger"
                    onClick={() => handleWithdrawConsent(consent.id)}
                  >
                    Withdraw Consent
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="audit-trail">
          {auditTrail.length === 0 ? (
            <p className="no-data">No audit trail records found.</p>
          ) : (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Self-Consent</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.map((record) => (
                  <tr key={record.consentId}>
                    <td>{new Date(record.timestamp).toLocaleString()}</td>
                    <td>{record.type.replace('_', ' ')}</td>
                    <td>
                      <span className={`status ${record.accepted ? 'accepted' : 'rejected'}`}>
                        {record.accepted ? 'Accepted' : 'Rejected'}
                      </span>
                    </td>
                    <td>{record.selfConsent ? '✓' : '—'}</td>
                    <td>{record.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="privacy-statement">
        <h3>Privacy & Security Statement</h3>
        <ul>
          <li>✓ Your consent records are stored securely and are auditable</li>
          <li>✓ Raw audio is never sent to external receivers - only cloned audio</li>
          <li>✓ You can withdraw your consent at any time</li>
          <li>✓ Your data is processed in accordance with GDPR and privacy regulations</li>
          <li>✓ All processing is logged and traceable for compliance</li>
        </ul>
      </div>

      <button className="btn btn-secondary" onClick={fetchConsentData}>
        Refresh
      </button>
    </div>
  );
};

export default ConsentStatus;
