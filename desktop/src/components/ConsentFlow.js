import React, { useState } from 'react';
import axios from 'axios';
import '../styles/ConsentFlow.css';

const ConsentFlow = ({ setToken }) => {
  const [step, setStep] = useState('form'); // form, recording, complete
  const [consentType, setConsentType] = useState('voice_cloning');
  const [isAccepted, setIsAccepted] = useState(false);
  const [recordedAudioPath, setRecordedAudioPath] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const consentTexts = {
    voice_cloning: {
      title: 'Voice Cloning Consent',
      description:
        'This system will use your voice samples to create a trained voice model for text-to-speech synthesis. Your voice will not be shared with third parties.',
      terms: [
        '✓ I understand my voice samples will be used to create a personalized voice model',
        '✓ I understand this model will be used for real-time speech synthesis',
        '✓ I give permission for my voice data to be stored securely',
        '✓ I can withdraw this consent at any time',
      ],
    },
    data_processing: {
      title: 'Data Processing Consent',
      description:
        'Your audio and text data will be processed through our ASR, translation, and TTS pipeline. Raw audio is never sent to external services.',
      terms: [
        '✓ I understand my data will be processed through our secure pipeline',
        '✓ I understand raw audio will not be sent to external receivers',
        '✓ I understand data is retained only as long as necessary',
      ],
    },
    model_training: {
      title: 'Model Training Consent',
      description:
        'Your voice samples may be used to further improve our voice cloning models if you opt in.',
      terms: [
        '✓ I agree to allow my voice samples to be used for model improvement',
        '✓ I understand this can be disabled at any time',
      ],
    },
  };

  const handleRecordAudio = async () => {
    // Mock recording for now
    // In production, this would use Web Audio API or Electron's native audio capture
    setIsRecording(true);
    setStep('recording');

    // Simulate 5-second recording
    setTimeout(() => {
      setIsRecording(false);
      setRecordedAudioPath(`/audio/consent_${Date.now()}.wav`);
      setStep('form');
    }, 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAccepted) {
      setError('You must accept the consent to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // For development: use self-consent quick-accept
      const isDev = process.env.NODE_ENV === 'development';

      const consentResponse = await axios.post(
        isDev ? '/api/consent/self-consent' : '/api/consent/create',
        {
          consentType,
          consentVersion: '1.0',
          consentText: consentTexts[consentType].description,
          isAccepted: true,
          recordedAudioPath,
          isSelfConsent: isDev,
        }
      );

      const consentId = consentResponse.data.consentId;

      // Mock user ID and token creation
      // In production, this would come from a login/signup endpoint
      const mockUserId = `user_${Date.now()}`;
      const mockToken = `token_${consentId}_${mockUserId}`;

      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('user_id', mockUserId);
      localStorage.setItem('consent_id', consentId);

      setToken(mockToken);
      setUserId(mockUserId);
      setStep('complete');

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error) {
      console.error('Consent submission failed:', error);
      setError(error.response?.data?.error || 'Consent submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'recording') {
    return (
      <div className="consent-flow recording">
        <div className="recording-panel">
          <h2>Recording Consent Audio</h2>
          <div className="recording-indicator">
            <div className="pulse"></div>
            <p>Recording in progress...</p>
          </div>
          <p className="instruction">
            Please read and affirm your understanding of the consent terms above.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="consent-flow complete">
        <div className="complete-panel">
          <h2>✅ Consent Recorded Successfully</h2>
          <p>Thank you for providing your consent. Your account is being set up...</p>
          <p className="redirect-message">Redirecting to main application...</p>
        </div>
      </div>
    );
  }

  const currentConsent = consentTexts[consentType];

  return (
    <div className="consent-flow form">
      <div className="consent-container">
        <h1>URIESMOOTH Voice - Consent & Setup</h1>

        <div className="consent-type-selector">
          <label>
            <input
              type="radio"
              value="voice_cloning"
              checked={consentType === 'voice_cloning'}
              onChange={(e) => setConsentType(e.target.value)}
            />
            Voice Cloning
          </label>
          <label>
            <input
              type="radio"
              value="data_processing"
              checked={consentType === 'data_processing'}
              onChange={(e) => setConsentType(e.target.value)}
            />
            Data Processing
          </label>
          <label>
            <input
              type="radio"
              value="model_training"
              checked={consentType === 'model_training'}
              onChange={(e) => setConsentType(e.target.value)}
            />
            Model Training (Optional)
          </label>
        </div>

        <div className="consent-document">
          <h2>{currentConsent.title}</h2>
          <p className="description">{currentConsent.description}</p>

          <div className="terms">
            <h3>Terms You're Agreeing To:</h3>
            {currentConsent.terms.map((term, index) => (
              <div key={index} className="term">
                {term}
              </div>
            ))}
          </div>

          <div className="consent-actions">
            <button
              className="btn btn-secondary"
              onClick={handleRecordAudio}
              disabled={isRecording || loading}
            >
              🎙️ Record Consent Audio (Optional)
            </button>
            {recordedAudioPath && (
              <div className="recording-indicator">✓ Consent audio recorded</div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={isAccepted}
                  onChange={(e) => setIsAccepted(e.target.checked)}
                />
                I have read and understand the above terms. I give my explicit consent to
                proceed.
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={!isAccepted || loading}>
              {loading ? 'Processing...' : 'Accept & Continue'}
            </button>
          </form>

          <div className="privacy-note">
            <p>
              <strong>Privacy Note:</strong> Your consent record is stored securely and is
              auditable. All audio processing enforces fail-closed behavior - raw audio is
              never sent to external receivers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsentFlow;
