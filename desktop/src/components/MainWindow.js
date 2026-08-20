import React, { useState, useEffect } from 'react';
import axios from 'axios';
import RecordingPanel from './RecordingPanel';
import ConsentStatus from './ConsentStatus';
import '../styles/MainWindow.css';

const MainWindow = ({ token, setToken }) => {
  const [activeTab, setActiveTab] = useState('record');
  const [backendHealth, setBackendHealth] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      checkBackendHealth();
      fetchUserSessions();
    }
  }, [token]);

  const checkBackendHealth = async () => {
    try {
      const response = await axios.post('/api/audio/health');
      setBackendHealth(response.data);
    } catch (error) {
      console.error('Backend health check failed:', error);
    }
  };

  const fetchUserSessions = async () => {
    try {
      const response = await axios.get('/api/audio/my-sessions');
      setUserSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  if (!token) {
    return (
      <div className="main-window auth-required">
        <div className="auth-panel">
          <h1>URIESMOOTH Voice</h1>
          <p>Please log in or create an account to continue.</p>
          <div className="auth-buttons">
            <button
              className="btn btn-primary"
              onClick={() => {
                // Redirect to login/consent
                if (window.electronAPI) {
                  window.electronAPI.openConsentWindow();
                }
              }}
            >
              Login / Consent
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-window">
      <div className="header">
        <h1>URIESMOOTH Voice - Desktop</h1>
        <div className="header-controls">
          <span className="health-indicator" title="Backend health">
            {backendHealth?.allHealthy ? '🟢 Online' : '🟡 Check connection'}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          🎙️ Record & Process
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 History
        </button>
        <button
          className={`tab ${activeTab === 'consent' ? 'active' : ''}`}
          onClick={() => setActiveTab('consent')}
        >
          ✅ Consent
        </button>
        <button
          className={`tab ${activeTab === 'vac' ? 'active' : ''}`}
          onClick={() => setActiveTab('vac')}
        >
          🔊 VAC Test
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'record' && <RecordingPanel token={token} />}

        {activeTab === 'history' && (
          <div className="history-panel">
            <h2>Processing History</h2>
            {userSessions.length === 0 ? (
              <p>No processing history yet.</p>
            ) : (
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Cloned Audio</th>
                  </tr>
                </thead>
                <tbody>
                  {userSessions.map((session) => (
                    <tr key={session.sessionId}>
                      <td>{new Date(session.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={`status ${session.status}`}>{session.status}</span>
                      </td>
                      <td>{session.processingTimeMs}ms</td>
                      <td>{session.isClonedAudio ? '✅' : '❌'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="btn btn-secondary" onClick={fetchUserSessions}>
              Refresh
            </button>
          </div>
        )}

        {activeTab === 'consent' && <ConsentStatus token={token} />}

        {activeTab === 'vac' && (
          <div className="vac-panel">
            <h2>VAC (Voice Activity Detection) Test</h2>
            <p>Use this tool to calibrate voice detection for your environment.</p>
            <button className="btn btn-primary" onClick={() => alert('VAC Test Coming Soon')}>
              Start VAC Calibration
            </button>
          </div>
        )}
      </div>

      <div className="footer">
        <p>
          URIESMOOTH Voice v0.1.0 • Privacy & Consent Focused • All audio is cloned
          before transmission
        </p>
      </div>
    </div>
  );
};

export default MainWindow;
