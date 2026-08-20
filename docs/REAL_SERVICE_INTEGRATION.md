# Real Service Integration Guide

## Overview

URIESMOOTH Voice currently uses mocked services for development. This guide covers integrating with production-grade services for:

- **ASR** (Automatic Speech Recognition)
- **MT** (Machine Translation)
- **TTS** (Text-to-Speech)
- **VAC** (Voice Activity Detection)

---

## 1. ASR Integration - Google Cloud Speech-to-Text

### Setup

1. **Create Google Cloud Project**
   ```bash
   # Install Google Cloud SDK
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   
   # Authenticate
   gcloud auth application-default login
   
   # Create project
   gcloud projects create uriesmooth-voice --set-as-default
   ```

2. **Enable Speech-to-Text API**
   ```bash
   gcloud services enable speech.googleapis.com
   ```

3. **Install Node.js Client**
   ```bash
   cd backend
   npm install @google-cloud/speech
   ```

4. **Create Service Account** (for production)
   ```bash
   gcloud iam service-accounts create uriesmooth-voice-asr
   
   gcloud projects add-iam-policy-binding uriesmooth-voice \
     --member=serviceAccount:uriesmooth-voice-asr@uriesmooth-voice.iam.gserviceaccount.com \
     --role=roles/speech.admin
   
   gcloud iam service-accounts keys create ./credentials.json \
     --iam-account=uriesmooth-voice-asr@uriesmooth-voice.iam.gserviceaccount.com
   
   export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/credentials.json
   ```

### Implementation

Replace `backend/services/asrService.js`:

```javascript
const speech = require('@google-cloud/speech');
const fs = require('fs');

class ASRService {
  constructor() {
    this.client = new speech.SpeechClient({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }

  async recognizeSpeech(audioPath, language = 'es-ES') {
    try {
      const audio = {
        content: fs.readFileSync(audioPath).toString('base64'),
      };

      const request = {
        audio: audio,
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: language,
          enableAutomaticPunctuation: true,
          model: 'latest_long', // Best for longer audio
          useEnhanced: true,
        },
      };

      const [response] = await this.client.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');

      const confidence = response.results[0]?.alternatives[0]?.confidence || 0.95;

      return {
        text: transcription,
        language: language,
        confidence: confidence,
        timestamp: new Date().toISOString(),
        processingTime: Date.now()
      };
    } catch (error) {
      console.error('ASR Error:', error);
      throw new Error(`Speech recognition failed: ${error.message}`);
    }
  }

  async recognizeSpeechFromStream(audioStream, language = 'es-ES') {
    // For real-time streaming
    return new Promise((resolve, reject) => {
      const request = {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: language,
        },
        interimResults: true,
      };

      const recognizeStream = this.client.streamingRecognize(request);

      let finalTranscript = '';

      recognizeStream.on('data', (data) => {
        const transcript = data.results[0]?.alternatives[0]?.transcript || '';
        
        if (data.results[0]?.isFinal) {
          finalTranscript += transcript + ' ';
        }
      });

      recognizeStream.on('error', reject);
      recognizeStream.on('end', () => {
        resolve({
          text: finalTranscript.trim(),
          confidence: 0.95,
          timestamp: new Date().toISOString()
        });
      });

      audioStream.pipe(recognizeStream);
    });
  }

  async getASRHealth() {
    try {
      // Test recognition with simple audio
      const testAudio = Buffer.from('test');
      await this.client.recognize({
        audio: { content: testAudio.toString('base64') },
        config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US' }
      });

      return { status: 'healthy', service: 'Google Cloud Speech-to-Text' };
    } catch (error) {
      return { status: 'unhealthy', service: 'Google Cloud Speech-to-Text', error: error.message };
    }
  }
}

module.exports = new ASRService();
```

### Configuration (.env)

```env
GCP_PROJECT_ID=uriesmooth-voice
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
ASR_SERVICE=google_cloud_speech
ASR_LANGUAGE=es-ES
```

### Cost Estimation

- **Pricing**: $0.024 per 15 seconds
- **1000 requests/month (5 min avg)**: ~$96/month
- **Free tier**: 60 minutes/month

### Alternative: AWS Transcribe

```bash
npm install aws-sdk
```

Configuration:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
ASR_SERVICE=aws_transcribe
```

---

## 2. MT Integration - Google Translate API

### Setup

1. **Enable Translation API**
   ```bash
   gcloud services enable translate.googleapis.com
   ```

2. **Install Client**
   ```bash
   npm install @google-cloud/translate
   ```

### Implementation

Replace `backend/services/mtService.js`:

```javascript
const { Translate } = require('@google-cloud/translate').v2;

class MTService {
  constructor() {
    this.translate = new Translate({
      projectId: process.env.GCP_PROJECT_ID
    });
  }

  async translateText(text, sourceLanguage, targetLanguage) {
    try {
      const [translation] = await this.translate.translate(text, {
        from: sourceLanguage,
        to: targetLanguage,
        format: 'text'
      });

      return {
        original: text,
        translated: translation,
        sourceLanguage,
        targetLanguage,
        confidence: 0.95,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async detectLanguage(text) {
    try {
      const [detection] = await this.translate.detect(text);
      
      if (Array.isArray(detection)) {
        return detection[0].language;
      }
      
      return detection.language;
    } catch (error) {
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  async batchTranslate(texts, sourceLanguage, targetLanguage) {
    try {
      const [translations] = await this.translate.translate(texts, {
        from: sourceLanguage,
        to: targetLanguage,
        format: 'text'
      });

      return texts.map((original, i) => ({
        original,
        translated: translations[i],
        sourceLanguage,
        targetLanguage
      }));
    } catch (error) {
      throw new Error(`Batch translation failed: ${error.message}`);
    }
  }

  async getMTHealth() {
    try {
      await this.translate.translate('test', { to: 'es' });
      return { status: 'healthy', service: 'Google Translate' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
}

module.exports = new MTService();
```

### Cost Estimation

- **Pricing**: $15-25 per 1M characters
- **1000 requests/month (50 chars avg)**: ~$0.75/month
- **Free tier**: 500k characters/month

### Alternative: AWS Translate

```bash
npm install aws-sdk
```

---

## 3. TTS Integration - Real Voice Models

### Option A: Google Cloud Text-to-Speech

```bash
npm install @google-cloud/text-to-speech
```

Implementation:

```javascript
const textToSpeech = require('@google-cloud/text-to-speech');

class TTSService {
  constructor() {
    this.client = new textToSpeech.TextToSpeechClient();
  }

  async synthesizeSpeech(text, voiceId = 'es-ES-Neural2-A') {
    try {
      const request = {
        input: { text: text },
        voice: {
          languageCode: 'es-ES',
          name: voiceId,
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: 22050,
        },
      };

      const [response] = await this.client.synthesizeSpeech(request);
      const audioContent = response.audioContent;

      // Save audio
      const filename = `/audio/output/${Date.now()}_synthesis.wav`;
      fs.writeFileSync(filename, audioContent, 'binary');

      return {
        audioPath: filename,
        duration: text.split(' ').length * 0.5, // Approximate
        sampleRate: 22050,
        isClonedAudio: false,
        voiceModel: voiceId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`TTS failed: ${error.message}`);
    }
  }

  async cloneVoiceFromSamples(sampleIds) {
    // Google Cloud doesn't support true voice cloning
    // Use VITS or Glow-TTS models locally instead
    throw new Error('Use VITS for voice cloning');
  }
}
```

### Option B: Local VITS Model (Best for Voice Cloning)

VITS is an open-source neural vocoder perfect for voice cloning.

```bash
# Clone VITS repository
git clone https://github.com/jaywalnut310/vits.git
cd vits
pip install -r requirements.txt

# Download pretrained model
wget https://huggingface.co/spaces/Plachta/VITS-fast-fine-tuning/resolve/main/models/vits_gta_pretrained.pth
```

Implementation:

```javascript
const { spawn } = require('child_process');
const path = require('path');

class TTSService {
  async synthesizeSpeech(text, voiceId = 'default') {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'vits_synthesis.py');
      
      const python = spawn('python', [
        pythonScript,
        '--text', text,
        '--voice', voiceId,
        '--output', `/audio/output/${Date.now()}.wav`
      ]);

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`VITS synthesis failed: ${error}`));
        } else {
          const audioPath = JSON.parse(output).audioPath;
          resolve({
            audioPath,
            duration: text.split(' ').length * 0.5,
            sampleRate: 22050,
            isClonedAudio: true,
            voiceModel: voiceId,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
  }

  async cloneVoiceFromSamples(sampleIds, voiceLabel) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'vits_finetune.py');
      
      const python = spawn('python', [
        pythonScript,
        '--samples', JSON.stringify(sampleIds),
        '--voice', voiceLabel,
        '--epochs', '100'
      ]);

      let jobId = `job_${Date.now()}`;

      python.on('close', () => {
        resolve({
          jobId,
          status: 'completed',
          voiceModel: voiceLabel,
          estimatedTime: '2-4 hours'
        });
      });

      python.on('error', reject);
    });
  }
}

module.exports = new TTSService();
```

### Cost Comparison

| Service | Cost | Voice Cloning | Latency |
|---------|------|---------------|---------:|
| Google Cloud TTS | $16/1M chars | No | 1-2s |
| Azure Speech | $16/1M chars | No | 1-2s |
| VITS (Local) | Free | ✅ Yes | 2-5s |
| Eleven Labs | $5-30/month | ✅ Yes | 500ms-2s |
| Coqui TTS | Free | ✅ Yes | 3-8s |

---

## 4. VAC Integration - Silero VAD

### Setup

```bash
cd backend
npm install onnxruntime-web
```

### Implementation

```javascript
const ort = require('onnxruntime-web');
const { AudioContext } = require('standardized-audio-context');

class VACService {
  constructor() {
    this.model = null;
    this.audioContext = new AudioContext();
  }

  async initialize() {
    // Download Silero VAD model
    const modelUrl = 'https://models.silero.ai/vad_models/silero_vad_v5.onnx';
    this.model = await ort.InferenceSession.create(modelUrl);
  }

  async detectVoiceActivity(audioPath, threshold = 0.5) {
    try {
      const audioBuffer = await this.loadAudioFile(audioPath);
      const audioData = audioBuffer.getChannelData(0);

      const segments = [];
      let isVoiceActive = false;
      let segmentStart = null;

      // Process audio in chunks
      const chunkSize = 512;
      for (let i = 0; i < audioData.length; i += chunkSize) {
        const chunk = audioData.slice(i, i + chunkSize);
        
        // Run VAD inference
        const feeds = {
          input: new ort.Tensor('float32', chunk, [1, chunk.length])
        };
        
        const results = await this.model.run(feeds);
        const confidence = results.output.data[0];

        if (confidence > threshold && !isVoiceActive) {
          // Voice activity started
          isVoiceActive = true;
          segmentStart = i / this.audioContext.sampleRate * 1000; // ms
        } else if (confidence <= threshold && isVoiceActive) {
          // Voice activity ended
          isVoiceActive = false;
          segments.push({
            startMs: Math.round(segmentStart),
            endMs: Math.round(i / this.audioContext.sampleRate * 1000),
            confidence: confidence,
            duration: Math.round((i - segmentStart * 1000 / this.audioContext.sampleRate) / this.audioContext.sampleRate * 1000)
          });
        }
      }

      return {
        hasVoiceActivity: segments.length > 0,
        segments,
        totalSpeechDuration: segments.reduce((sum, s) => sum + s.duration, 0),
        noiseLevel: this.estimateNoiseLevel(audioData),
        confidence: threshold
      };
    } catch (error) {
      throw new Error(`VAC detection failed: ${error.message}`);
    }
  }

  estimateNoiseLevel(audioData) {
    // Simple noise estimation
    let energy = 0;
    for (let sample of audioData) {
      energy += sample * sample;
    }
    const rms = Math.sqrt(energy / audioData.length);
    return Math.min(1.0, rms * 10); // Normalize to 0-1
  }

  async loadAudioFile(filePath) {
    const fs = require('fs').promises;
    const buffer = await fs.readFile(filePath);
    return this.audioContext.decodeAudioData(buffer);
  }
}

module.exports = new VACService();
```

### Cost Estimation

**Silero VAD**: Completely free, runs locally

---

## Configuration Management

### .env Template

```env
# ============================================================================
# REAL SERVICE CONFIGURATION
# ============================================================================

# Google Cloud
GCP_PROJECT_ID=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# AWS (if using AWS services)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Service Selection
ASR_SERVICE=google_cloud_speech      # or: aws_transcribe, local
MT_SERVICE=google_translate           # or: aws_translate, local
TTS_SERVICE=vits_local                # or: google_cloud_tts, eleven_labs
VAC_SERVICE=silero_vad                # or: webrtc_vad, local

# Service URLs (if running in containers)
ASR_SERVICE_URL=http://asr-service:5000
MT_SERVICE_URL=http://mt-service:5001
TTS_SERVICE_URL=http://tts-service:5002
VAC_SERVICE_URL=http://vac-service:5003

# VITS Configuration (for voice cloning)
VITS_MODEL_PATH=/models/vits/model.pth
VITS_CONFIG_PATH=/models/vits/config.json
VITS_SAMPLE_RATE=22050
VITS_ENABLE_GPU=true
VITS_GPU_DEVICE=cuda:0

# Silero VAD
VAC_MODEL_PATH=/models/silero_vad_v5.onnx
VAC_THRESHOLD=0.5
VAC_MIN_DURATION_MS=200
VAC_CONFIDENCE_THRESHOLD=0.5
```

---

## Monitoring & Health Checks

### Service Health Endpoint

```javascript
// backend/middleware/healthCheck.js
app.get('/api/health/services', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {}
  };

  // Check each service
  try {
    health.services.asr = await asrService.getHealth();
  } catch (e) {
    health.services.asr = { status: 'unhealthy', error: e.message };
  }

  try {
    health.services.mt = await mtService.getHealth();
  } catch (e) {
    health.services.mt = { status: 'unhealthy', error: e.message };
  }

  try {
    health.services.tts = await ttsService.getHealth();
  } catch (e) {
    health.services.tts = { status: 'unhealthy', error: e.message };
  }

  try {
    health.services.vac = await vacService.getHealth();
  } catch (e) {
    health.services.vac = { status: 'unhealthy', error: e.message };
  }

  res.json(health);
});
```

---

## Cost Analysis (Monthly Estimate)

For 1000 users processing 10 sessions/month (100 minute avg):

| Service | Cost |
|---------|-----:|
| Google Cloud ASR | $96.00 |
| Google Translate | $0.75 |
| Google Cloud TTS | $96.00 |
| Silero VAD | Free |
| **Total** | **$192.75** |

---

## Migration Path

1. **Phase 1** (Current): Mock services for development
2. **Phase 2**: Integrate Google Cloud services (easy, well-documented)
3. **Phase 3**: Add local VITS for voice cloning (better quality, no recurring costs)
4. **Phase 4**: Optimize with caching and batch processing

---

## Troubleshooting

### API Rate Limits

```javascript
// Add retry logic
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

### Service Timeouts

```env
ASR_TIMEOUT=30000        # 30 seconds
MT_TIMEOUT=10000         # 10 seconds
TTS_TIMEOUT=60000        # 60 seconds
VAC_TIMEOUT=15000        # 15 seconds
```

---

**Last Updated**: 2026-08-15  
**Version**: 1.0.0

For support: support@uriesmooth.ai
