import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/VACTestTool.css';

const VACTestTool = ({ token }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [vacResult, setVacResult] = useState(null);
  const [calibrationResult, setCalibrationResult] = useState(null);
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(0.5);

  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await checkVoiceActivity(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
    } catch (error) {
      setError('Failed to access microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  const checkVoiceActivity = async (audioBlob) => {
    try {
      // Send audio to VAC endpoint
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('threshold', threshold);

      const response = await axios.post('/api/audio/vac-check', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setVacResult(response.data);
    } catch (error) {
      console.error('VAC check failed:', error);
      setError('VAC analysis failed');
    }
  };

  const startCalibration = async () => {
    try {
      setIsCalibrating(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

      // Record for 5 seconds
      mediaRecorder.start();
      setTimeout(() => {
        mediaRecorder.stop();
      }, 5000);

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        await performCalibration(audioBlob);
      };
    } catch (error) {
      setError('Failed to start calibration: ' + error.message);
      setIsCalibrating(false);
    }
  };

  const performCalibration = async (audioBlob) => {
    try {
      // Mock calibration - in production would call VAC calibration endpoint
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = {
        calibrationId: `cal_${Date.now()}`,
        noiseFloorDb: -65.5,
        recommendedThreshold: 0.45,
        message: 'Calibration complete. Recommended threshold has been updated.',
      };

      setCalibrationResult(result);
      setThreshold(result.recommendedThreshold);
      setIsCalibrating(false);
    } catch (error) {
      setError('Calibration failed: ' + error.message);
      setIsCalibrating(false);
    }
  };

  return (
    <div className="vac-test-tool">
      <h2>🔊 Voice Activity Detection (VAC) Test & Calibration</h2>

      <div className="vac-info">
        <p>
          Use this tool to test and calibrate voice activity detection for your environment.
          VAC helps identify speech regions and optimize audio processing.
        </p>
      </div>

      <div className="vac-sections">
        <div className="vac-section">
          <h3>Test VAC Detection</h3>
          <p>Record a short audio sample to analyze voice activity detection.</p>

          <div className="threshold-control">
            <label>
              VAC Threshold:
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                disabled={isRecording}
              />
              <span className="threshold-value">{threshold.toFixed(2)}</span>
            </label>
            <small>Lower = more sensitive to voice, Higher = stricter detection</small>
          </div>

          <div className="recording-controls">
            {!isRecording ? (
              <button className="btn btn-primary" onClick={startRecording} disabled={isCalibrating}>
                🎙️ Start Test Recording (5s)
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopRecording}>
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {isRecording && (
            <div className="recording-indicator">
              <span className="pulse"></span> Recording in progress...
            </div>
          )}

          {vacResult && (
            <div className="vac-result">
              <h4>VAC Analysis Result</h4>
              <div className="result-info">
                <p>
                  <strong>Voice Activity Detected:</strong>{' '}
                  {vacResult.hasVoiceActivity ? '✅ Yes' : '❌ No'}
                </p>
                <p>
                  <strong>Speech Percentage:</strong> {vacResult.speechPercentage}%
                </p>
                <p>
                  <strong>Total Speech Duration:</strong> {vacResult.totalDurationMs}ms
                </p>
                <p>
                  <strong>Detected Segments:</strong> {vacResult.segments.length}
                </p>

                {vacResult.segments.length > 0 && (
                  <div className="segments">
                    <h5>Speech Segments:</h5>
                    {vacResult.segments.map((seg, idx) => (
                      <div key={idx} className="segment">
                        <span className="segment-time">
                          {seg.start_ms}ms - {seg.end_ms}ms
                        </span>
                        <span className="segment-confidence">
                          Confidence: {(seg.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="vac-section">
          <h3>Calibrate VAC for Environment</h3>
          <p>
            Calibration records ambient noise and optimizes VAC settings for your environment.
          </p>

          <div className="calibration-controls">
            <button
              className="btn btn-secondary"
              onClick={startCalibration}
              disabled={isCalibrating || isRecording}
            >
              {isCalibrating ? 'Calibrating...' : '⚙️ Start Calibration (5s)'}
            </button>
          </div>

          {isCalibrating && (
            <div className="calibration-progress">
              <span className="pulse"></span> Analyzing your environment...
            </div>
          )}

          {calibrationResult && (
            <div className="calibration-result">
              <h4>Calibration Results</h4>
              <div className="result-info">
                <p>
                  <strong>Noise Floor:</strong> {calibrationResult.noiseFloorDb} dB
                </p>
                <p>
                  <strong>Recommended Threshold:</strong> {calibrationResult.recommendedThreshold}
                </p>
                <p className="message">{calibrationResult.message}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="vac-tips">
        <h3>Tips for Best Results</h3>
        <ul>
          <li>Conduct calibration in a typical speaking environment</li>
          <li>Ensure microphone is at a comfortable distance (6-12 inches)</li>
          <li>Calibrate separately if your environment changes significantly</li>
          <li>Test VAC after calibration to verify detection accuracy</li>
          <li>
            Lower thresholds are more sensitive to background noise; adjust if needed
          </li>
        </ul>
      </div>
    </div>
  );
};

export default VACTestTool;
