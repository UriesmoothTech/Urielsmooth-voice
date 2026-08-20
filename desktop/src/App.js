import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import components
import MainWindow from './components/MainWindow';
import ConsentFlow from './components/ConsentFlow';
import RecordingPanel from './components/RecordingPanel';
import VACTestTool from './components/VACTestTool';

const App = () => {
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [isDev, setIsDev] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Get Electron env config
        if (window.electronAPI) {
          const config = await window.electronAPI.getEnvConfig();
          setBackendUrl(config.backendUrl);
          setIsDev(config.isDev);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Setup axios default configuration
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = backendUrl;
  }, [token, backendUrl]);

  if (loading) {
    return <div className="app-loading">Initializing URIESMOOTH Voice...</div>;
  }

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<MainWindow token={token} setToken={setToken} />} />
          <Route path="/consent" element={<ConsentFlow setToken={setToken} />} />
          <Route path="/recording" element={<RecordingPanel token={token} />} />
          <Route path="/vac-test" element={<VACTestTool token={token} />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
