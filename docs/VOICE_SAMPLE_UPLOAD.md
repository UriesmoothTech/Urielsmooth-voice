# Voice Sample Upload & Training Guide

## Overview

URIESMOOTH Voice uses your voice samples to train a personalized voice cloning model. This guide explains how to record, upload, and manage your voice samples.

## Privacy & Consent

**Important**: Before uploading voice samples, you must:

1. ✅ Accept the voice cloning consent form
2. ✅ Provide explicit written consent (recorded in system)
3. ✅ Understand your data usage and retention policies
4. ✅ Have the ability to withdraw consent anytime

## Recording Requirements

### Audio Specifications

| Requirement | Specification |
|------------|---------------|
| **Format** | WAV, MP3, FLAC (16-bit recommended) |
| **Sample Rate** | 16kHz, 22.05kHz, 44.1kHz, or 48kHz |
| **Duration** | 20-60 seconds per sample (minimum) |
| **Quality** | Clean, minimal background noise |
| **Bitrate** | 128kbps minimum (256kbps recommended) |
| **Channels** | Mono or Stereo |
| **File Size** | Max 50MB per sample |

### Recording Environment

✅ **Optimal Conditions**
- Quiet room, minimal background noise
- Consistent distance from microphone (6-12 inches)
- Clear, natural speaking voice
- Normal speaking pace
- Standard microphone or headset

❌ **Avoid**
- Background music, traffic, or machinery noise
- Shouting or whispering
- Extreme room echo or reverb
- Poor quality or damaged recordings
- Very fast or abnormally slow speech

## Recording Your Voice Samples

### Option 1: Use Desktop VAC Test Tool

1. **Open URIESMOOTH Voice**
   - Launch desktop application
   - Navigate to "🔊 VAC Test" tab

2. **Record Sample**
   - Click "Start Test Recording"
   - Speak naturally and clearly
   - Click "Stop Recording"

3. **Review Quality**
   - VAC analysis shows voice clarity
   - Segments display detected speech regions
   - Quality score indicates audio fitness

### Option 2: Use Voice Recording Service

Recommended platforms:
- Audacity (Free, open-source)
- GarageBand (macOS, free)
- Voice Memos (iOS, free)
- Google Recorder (Android, free)

Steps:
1. Open recording application
2. Start recording
3. Speak in Spanish (or your native language)
4. Stop and export as WAV or MP3
5. Save with descriptive name

### Option 3: Professional Recording Studio

For best quality:
- Visit local recording studio
- Record 5-10 samples
- Request 16-bit, 44.1kHz WAV export
- Ensure clean, mastered audio

## Sample Guidelines

### What to Record

**Good samples include:**
- Natural conversation and dialogue
- Reading paragraphs or sentences
- Storytelling or narration
- Variety of emotions and intonation
- Different vowel and consonant combinations

### Spanish Phoneme Coverage

Ensure samples include these sounds:
- Vowels: a, e, i, o, u (separate and combined)
- Consonants: r, rr (rolled vs. hard)
- Fricatives: z, c (Spanish th sound), s, f, j, x
- Affricates: ch, ll
- Nasal sounds: m, n, ñ

Example phrases:
- "Hola, mi nombre es Luna."
- "¿Cómo estás hoy?"
- "La inteligencia artificial es fascinante."
- "Me encanta cantar y hablar en español."

## Upload Process

### Via Desktop Application

1. **Open Settings**
   - Click ⚙️ Settings (bottom menu)

2. **Navigate to Voice Samples**
   - Select "Voice Training" or "My Voice Samples"

3. **Upload Sample**
   - Click "+ Add Voice Sample"
   - Select audio file from computer
   - Enter sample description (optional)
   - Review quality indicators
   - Click "Upload"

4. **Confirm Consent**
   - Review consent checkbox
   - Confirm this sample is your voice
   - Mark as "Self-Consent" if applicable
   - Submit

### Via API

```bash
curl -X POST http://localhost:3001/api/voice/samples/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@/path/to/sample.wav" \
  -F "description=Natural conversation sample 1" \
  -F "language=es-ES" \
  -F "consentId=consent_abc123"

Response:
{
  "success": true,
  "sampleId": "sample_xyz789",
  "fileHash": "a1b2c3d4e5f6...",
  "duration": 35.5,
  "sampleRate": 16000,
  "qualityScore": 0.92,
  "processingStatus": "queued",
  "message": "Voice sample received. Quality check in progress."
}
```

## Training Your Model

### Automatic Training

Once you have ≥20 voice samples:

1. **Trigger Training**
   - Desktop app: Click "Train Voice Model"
   - API: POST `/api/voice/train` with sample IDs

2. **Monitor Progress**
   - Email notifications at each stage
   - Dashboard shows real-time training metrics
   - Estimated completion time displayed

3. **Available After Training**
   - Model appears in voice selection
   - Can be used for TTS synthesis immediately
   - Continues improving with more samples

### Manual Training Request

```bash
curl -X POST http://localhost:3001/api/voice/train \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleIds": ["sample_1", "sample_2", ...],
    "voiceLabel": "My Trained Voice v1",
    "modelType": "VITS",
    "epochs": 100,
    "gpuEnabled": true
  }'

Response:
{
  "success": true,
  "jobId": "job_abc123",
  "status": "queued",
  "estimatedDurationHours": 4,
  "message": "Training job created. You'll receive updates via email."
}
```

## Monitoring Training

### Dashboard View

- **Status**: queued → preprocessing → training → validation → completed
- **Progress**: Percentage complete
- **Metrics**: Loss value, validation accuracy
- **Time**: Elapsed and remaining

### Email Updates

You'll receive emails at:
- Training started
- Training progress (every hour)
- Training complete
- Model ready for use

### API Status Check

```bash
curl http://localhost:3001/api/voice/train/{jobId}/status \
  -H "Authorization: Bearer YOUR_TOKEN"

Response:
{
  "jobId": "job_abc123",
  "status": "training",
  "progress": 45,
  "epoch": 45,
  "loss": 0.1234,
  "timeRemainingHours": 2,
  "logs": "..."
}
```

## Managing Your Samples

### View All Samples

```bash
curl http://localhost:3001/api/voice/samples \
  -H "Authorization: Bearer YOUR_TOKEN"

Response:
{
  "samples": [
    {
      "id": "sample_1",
      "name": "Natural conversation 1",
      "uploadedAt": "2026-08-15T10:00:00Z",
      "duration": 35.5,
      "qualityScore": 0.92,
      "status": "approved"
    }
  ]
}
```

### Delete Sample

```bash
curl -X DELETE http://localhost:3001/api/voice/samples/{sampleId} \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Retrain Model

To improve your trained model:
1. Upload additional samples (10+ recommended)
2. Request new training run
3. Specify "Version 2" label
4. Old model remains available

## Quality Assurance

### Automatic Quality Checks

Each uploaded sample is analyzed for:
- ✅ Audio bitrate and sample rate
- ✅ Voice clarity and intelligibility
- ✅ Signal-to-noise ratio
- ✅ Phoneme coverage
- ✅ Recording duration

### Quality Score Interpretation

| Score | Assessment | Action |
|-------|-----------|--------|
| 0.90-1.0 | Excellent | Ready for training |
| 0.75-0.89 | Good | Ready for training |
| 0.60-0.74 | Acceptable | May train, but consider re-recording |
| <0.60 | Poor | Please re-record sample |

### Re-recording Tips

If quality score is low:
1. **Test microphone**: Ensure it's functioning properly
2. **Reduce noise**: Record in quieter environment
3. **Check levels**: Audio should be clear, not distorted
4. **Speak clearly**: Enunciate naturally and confidently
5. **Distance**: Keep microphone 6-12 inches away

## Storage & Retention

### Where Your Data is Stored

- **Voice Samples**: `/audio/samples/{userId}/`
- **Database Records**: PostgreSQL, encrypted at rest
- **Processing Cache**: Temporary `/audio/processing/` (auto-deleted)
- **Trained Models**: `/models/{userId}/` (after training)

### Retention Policy

- **Raw Samples**: Stored indefinitely (linked to consent)
- **Trained Models**: Deleted if consent withdrawn
- **Processing Data**: Auto-deleted after 30 days
- **Audit Logs**: Retained for 7 years (compliance)

### Withdrawal of Consent

You can delete all voice data anytime:

```bash
curl -X POST http://localhost:3001/api/consent/withdraw/{consentId} \
  -H "Authorization: Bearer YOUR_TOKEN"

This will:
- Delete all voice samples
- Remove trained models
- Retain audit logs (for legal compliance)
```

## Pricing & GPU Requirements

### Cloud Training

- **No Local GPU**: $2.99 per model training (4 hours typical)
- **High Priority**: $9.99 (1 hour GPU allocation)
- **Bulk Training**: Contact support for enterprise pricing

### Local GPU Training

If you have compatible GPU:
1. Set `GPU_ENABLED=true` in `.env`
2. Specify GPU: `GPU_DEVICE=cuda:0`
3. Requires 6GB+ VRAM for training
4. No cloud charges if using local resources

Supported GPUs:
- NVIDIA (CUDA compute capability 6.0+)
- AMD (ROCm compatible)
- Apple Silicon (Metal acceleration)

## Troubleshooting

### Upload Fails

**Error**: "File too large"
- **Solution**: Compress audio to MP3 format or trim duration

**Error**: "Invalid audio format"
- **Solution**: Convert to WAV using Audacity (free)

**Error**: "Unsupported sample rate"
- **Solution**: Resample to 16kHz or 44.1kHz

### Training Issues

**Error**: "Not enough samples"
- **Solution**: Upload minimum 10-20 samples

**Error**: "Training timeout"
- **Solution**: Try fewer samples or lower epochs

**Error**: "GPU out of memory"
- **Solution**: Reduce batch size in training config

### Quality Score Too Low

1. **Check recording**
   - Ensure audio is clear and audible
   - Reduce background noise
   - Re-record if necessary

2. **Adjust settings**
   - Different microphone
   - Different recording app
   - Different environment

3. **Contact support**
   - Email: support@uriesmooth.ai
   - Provide sample for analysis

## Advanced Features

### A/B Voice Testing

Compare different voice models:

```bash
curl -X POST http://localhost:3001/api/voice/compare \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sample text to synthesize",
    "voiceIds": ["voice_v1", "voice_v2"],
    "language": "es-ES"
  }'
```

### Fine-tuning Parameters

```bash
# Adjust model characteristics
{
  "voiceId": "voice_v1",
  "settings": {
    "pitch": 1.0,           # 0.5-2.0
    "speed": 1.0,           # 0.5-2.0
    "emotion": "neutral",   # neutral, happy, sad, angry
    "prosody": "natural"    # natural, robotic, expressive
  }
}
```

## Support

- **Documentation**: https://docs.uriesmooth.ai
- **Email**: support@uriesmooth.ai
- **GitHub Issues**: https://github.com/uriesmooth/voice/issues
- **Community**: https://forum.uriesmooth.ai

---

**Last Updated**: 2026-08-15  
**Version**: 1.0.0  
**Status**: Production Ready
