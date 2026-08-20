# Voice Activity Detection (VAC) Setup Guide

## Overview

Voice Activity Detection (VAC) is a critical component of the URIESMOOTH Voice pipeline. It detects speech regions in audio to optimize processing and reduce unnecessary computation.

## Architecture

```
Audio Input
    ↓
[VAC Analysis]
    ↓
Detect Speech Segments
    ↓
Extract Voice Regions
    ↓
Pass to ASR→MT→TTS Pipeline
```

## Features

- **Real-time Detection**: Analyzes audio streams in real-time
- **Threshold Calibration**: Automatically adapts to environmental noise
- **Segment Extraction**: Identifies and extracts speech regions
- **Configurable**: Adjustable sensitivity and minimum duration
- **Batch Processing**: Process multiple files simultaneously

## Configuration

### Environment Variables

```bash
# VAC Service Configuration
VAC_ENABLED=true                    # Enable/disable VAC processing
VAC_THRESHOLD=0.5                   # Detection threshold (0.0-1.0)
VAC_MIN_DURATION_MS=200             # Minimum speech segment duration
```

### Backend Configuration

Edit `.env` file:

```env
# Voice Activity Detection Settings
VAC_ENABLED=true
VAC_THRESHOLD=0.5
VAC_MIN_DURATION_MS=200
```

## How to Use

### Desktop Application

1. **Open VAC Test Tool**
   - Launch URIESMOOTH Voice Desktop
   - Go to "🔊 VAC Test" tab

2. **Test VAC Detection**
   - Click "Start Test Recording (5s)"
   - Speak naturally during the recording
   - Review the voice activity segments detected

3. **Calibrate for Your Environment**
   - Click "⚙️ Start Calibration (5s)"
   - Allow the system to record ambient noise
   - System recommends optimal threshold automatically

### API Endpoints

#### Check Voice Activity

```bash
POST /api/audio/vac-check
Content-Type: application/json
Authorization: Bearer {token}

{
  "audioPath": "/path/to/audio.wav"
}

Response:
{
  "hasVoiceActivity": true,
  "segments": [
    {
      "start_ms": 100,
      "end_ms": 4500,
      "confidence": 0.95,
      "label": "speech"
    }
  ],
  "speechPercentage": "37.5",
  "totalDurationMs": 4400,
  "processingTimeMs": 450
}
```

#### Extract Voice Regions

```bash
POST /api/audio/extract-voice-regions
Content-Type: application/json
Authorization: Bearer {token}

{
  "audioPath": "/path/to/audio.wav",
  "threshold": 0.5,
  "minDurationMs": 200
}

Response:
{
  "success": true,
  "original_audio_path": "/path/to/audio.wav",
  "extracted_audio_path": "/audio/extracted/1234567_extracted.wav",
  "segment_count": 3,
  "original_duration_ms": 12000,
  "extracted_duration_ms": 4400,
  "compression_ratio": "63.33",
  "segments": [...]
}
```

#### Calibrate VAC

```bash
POST /api/audio/vac-calibrate
Content-Type: application/json
Authorization: Bearer {token}

{
  "ambientAudioPath": "/path/to/ambient.wav",
  "duration_seconds": 5
}

Response:
{
  "success": true,
  "calibration_id": "cal_1234567890",
  "noise_floor_db": "-65.50",
  "recommended_threshold": "0.45",
  "calibration_date": "2026-08-15T10:30:00Z",
  "message": "VAC calibration complete..."
}
```

## Threshold Tuning

### Threshold Values

| Threshold | Behavior | Use Case |
|-----------|----------|----------|
| 0.2-0.3 | Very sensitive | Clean audio, strict detection |
| 0.4-0.5 | Balanced | General use, recommended |
| 0.6-0.7 | Less sensitive | Noisy environments |
| 0.8-0.9 | Very conservative | Extreme noise conditions |

### Calibration Process

1. **Quiet Environment Recording** (5 seconds)
   - Sit in your normal speaking environment
   - Do NOT speak during calibration
   - Allow system to establish noise baseline

2. **System Analysis**
   - Analyzes ambient noise floor
   - Calculates optimal threshold
   - Stores calibration profile per user

3. **Apply Settings**
   - Recommended threshold automatically set
   - Can be fine-tuned manually anytime

## Troubleshooting

### Issue: VAC Not Detecting Speech

**Symptoms**: Voice activity always shows as "No"

**Solutions**:
1. Lower the threshold value
2. Re-calibrate in your current environment
3. Check microphone levels (audio should be audible)
4. Try speaking closer to microphone

### Issue: False Positives (Detecting Non-Speech as Speech)

**Symptoms**: Background noise detected as speech

**Solutions**:
1. Raise the threshold value
2. Re-calibrate to establish proper noise floor
3. Use headphones instead of speaker audio
4. Move away from background noise sources

### Issue: Calibration Fails

**Symptoms**: Calibration returns error or no result

**Solutions**:
1. Check microphone is working
2. Ensure audio permissions granted to app
3. Try in a different quiet environment
4. Restart application and retry

### Issue: VAC Processing is Slow

**Symptoms**: VAC check takes >2 seconds

**Solutions**:
1. Reduce audio file size
2. Lower `VAC_MIN_DURATION_MS` value
3. Check system CPU usage
4. Ensure backend service is running properly

## Performance Optimization

### For Real-time Streaming

```javascript
// Process audio chunks as they arrive
const vacResult = await detectVoiceActivityStream(audioBuffer, {
  sampleRate: 16000,
  threshold: 0.5
});

// Continue ASR only if voice detected
if (vacResult.isVoiceActive) {
  startASRProcessing(audioBuffer);
}
```

### For Batch Processing

```javascript
// Process multiple files concurrently
const results = await batchDetectVoiceActivity(
  [file1, file2, file3],
  { threshold: 0.5 }
);
```

## Advanced Configuration

### Custom VAC Model (Future)

When implementing real VAC models:

```bash
# Model configuration
VAC_MODEL_TYPE=webrtc          # or custom, ML-based
VAC_MODEL_PATH=/models/vac.pb
VAC_BATCH_SIZE=32
VAC_FRAME_LENGTH_MS=20
```

### GPU Acceleration

```bash
VAC_GPU_ENABLED=true
VAC_GPU_DEVICE=cuda:0
```

## Privacy & Security

- **No Audio Retention**: Voice samples are not stored by VAC service
- **Local Processing**: VAC can run locally (no external API calls)
- **Consent Linked**: All VAC results linked to user consent record
- **Audit Logging**: All VAC operations logged for compliance

## Debugging

### Enable VAC Debug Logging

```env
DEBUG_VAC=true
VAC_LOG_LEVEL=debug
```

### Test VAC Endpoint

```bash
curl -X POST http://localhost:3001/api/audio/vac-check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audioPath": "/test/audio.wav"}'
```

## References

- WebRTC VAC: https://github.com/webrtc/vad
- Silero VAC: https://github.com/snakers4/silero-vad
- Speech Processing: https://librosa.org/

---

**Last Updated**: 2026-08-15  
**Version**: 1.0.0  
**Status**: Production Ready
