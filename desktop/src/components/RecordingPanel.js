import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../styles/RecordingPanel.css';

const RecordingPanel = ({ token }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sourceLanguage, setSourceLanguage] = useState('es');
  const [targetLanguage, setTargetLanguage] = useState('es');

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
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        handleAudioProcessing(audioBlob);
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

  const handleAudioProcessing = async (audioBlob) => {
    setProcessing(true);
    setError(null);

    try {
      // Convert audio blob to base64 for transmission
      const reader = new FileReader();
      reader.onloadend = async () => {
        const audioData = reader.result;

        // Send to backend for processing
        const response = await axios.post(
          '/api/audio/process',
          {
            inputText: transcript || '[Audio from microphone]',
            consentId: localStorage.getItem('consent_id'),
            sourceLanguage,
            targetLanguage,
            voiceId: 'default',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        setResult(response.data);
        setProcessing(false);

        // Auto-play output audio (if available)
        if (response.data.pipeline.tts.outputAudioPath) {
          playAudio(response.data.pipeline.tts.outputAudioPath);
        }
      };
      reader.readAsArrayBuffer(audioBlob);
    } catch (error) {
      console.error('Processing failed:', error);
      setError(error.response?.data?.error || 'Processing failed');
      setProcessing(false);
    }
  };

  const playAudio = (audioPath) => {
    const audio = new Audio(audioPath);
    audio.play().catch((err) => console.error('Audio playback failed:', err));
  };

  const handleTextInput = async (e) => {
    e.preventDefault();

    if (!transcript.trim()) {
      setError('Please enter text or record audio');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/audio/process',
        {
          inputText: transcript,
          consentId: localStorage.getItem('consent_id'),
          sourceLanguage,
          targetLanguage,
          voiceId: 'default',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
      setProcessing(false);

      // Auto-play output audio
      if (response.data.pipeline.tts.outputAudioPath) {
        playAudio(response.data.pipeline.tts.outputAudioPath);
      }
    } catch (error) {
      console.error('Processing failed:', error);
      setError(error.response?.data?.error || 'Processing failed');
      setProcessing(false);
    }
  };

  return (
    <div className="recording-panel">
      <div className="controls-section">
        <h2>🎙️ Record & Process</h2>

        <div className="language-selector">
          <div className="language-pair">
            <label>
              Source Language:
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}>
                <option value="es">Spanish (es)</option>
                <option value="en">English (en)</option>
                <option value="fr">French (fr)</option>
              </select>
            </label>

            <label>
              Target Language:
              <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}>
                <option value="es">Spanish (es)</option>
                <option value="en">English (en)</option>
                <option value="fr">French (fr)</option>
              </select>
            </label>
          </div>
        </div>

        <div className="recording-section">
          <div className="recording-controls">
            {!isRecording ? (
              <button className="btn btn-primary btn-large" onClick={startRecording}>
                🎙️ Start Recording
              </button>
            ) : (
              <button className="btn btn-danger btn-large" onClick={stopRecording}>
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {isRecording && <div className="recording-indicator recording">Recording...</div>}
        </div>

        <div className="text-input-section">
          <form onSubmit={handleTextInput}>
            <label>Or type text:</label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Enter Spanish text to synthesize..."
              disabled={isRecording || processing}
              rows={4}
            />
            <button type="submit" className="btn btn-secondary" disabled={isRecording || processing}>
              {processing ? 'Processing...' : '▶️ Process Text'}
            </button>
          </form>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {result && (
        <div className="result-section">
          <h3>Processing Results</h3>

          <div className="result-card">
            <h4>Pipeline Results</h4>
            <div className="pipeline-steps">
              <div className="step">
                <strong>ASR (Speech Recognition)</strong>
                <p>{result.pipeline.asr.output}</p>
                <small>Confidence: {(result.pipeline.asr.confidence * 100).toFixed(1)}%</small>
              </div>

              <div className="arrow">→</div>

              <div className="step">
                <strong>MT (Translation)</strong>
                <p>
                  {result.pipeline.mt.sourceLanguage} → {result.pipeline.mt.targetLanguage}
                </p>
                <p>{result.pipeline.mt.output}</p>
                <small>Confidence: {(result.pipeline.mt.confidence * 100).toFixed(1)}%</small>
              </div>

              <div className="arrow">→</div>

              <div className="step">
                <strong>TTS (Speech Synthesis)</strong>
                <p>✅ Cloned Audio Generated</p>
                <p>Duration: {result.pipeline.tts.duration.toFixed(2)}s</p>
                <small>Quality Score: {(result.pipeline.tts.qualityScore * 100).toFixed(1)}%</small>
              </div>
            </div>
          </div>

          <div className="metadata">
            <p>
              <strong>Session ID:</strong> {result.sessionId}
            </p>
            <p>
              <strong>Processing Time:</strong> {result.processingTimeMs}ms
            </p>
            <p>
              <strong>Cloned Audio:</strong> ✅ Yes (Raw audio not transmitted)
            </p>
          </div>

          <button className="btn btn-secondary" onClick={() => setResult(null)}>
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
};

export default RecordingPanel;
