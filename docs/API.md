# URIESMOOTH Voice API Reference

## Overview

Complete REST API documentation for URIESMOOTH Voice backend service running on `http://localhost:3001`.

**Authentication**: All endpoints (except `/health`) require JWT Bearer token in `Authorization` header.

**Base URL**: `http://localhost:3001`

**Version**: 1.0.0  
**Last Updated**: 2026-08-15

---

## Table of Contents

- [Authentication](#authentication)
- [Health Checks](#health-checks)
- [Consent Management](#consent-management)
- [Audio Processing](#audio-processing)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

### Overview

URIESMOOTH uses JWT (JSON Web Token) for authentication. Tokens expire after 24 hours (configurable).

### Token Structure

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Payload

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "iat": 1692100000,
  "exp": 1692186400
}
```

### Getting a Token

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2026-08-15T10:00:00Z"
  },
  "expiresIn": "24h"
}
```

**Errors**:
- `401` - Invalid email or password
- `400` - Missing required fields

#### Register

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "newuser@example.com",
    "createdAt": "2026-08-15T10:00:00Z"
  }
}
```

**Errors**:
- `400` - User already exists
- `400` - Weak password
- `400` - Invalid email format

#### Refresh Token

```http
POST /api/auth/refresh
Authorization: Bearer {expired_or_valid_token}
```

**Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

## Health Checks

### Server Health

```http
GET /health
```

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-08-15T10:00:00Z",
  "uptime": 3600
}
```

### Pipeline Health

Detailed health status of all services.

```http
POST /api/audio/health
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "status": "ok",
  "timestamp": "2026-08-15T10:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "responseTime": 12,
      "connections": 5
    },
    "asr": {
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2026-08-15T10:00:00Z"
    },
    "mt": {
      "status": "healthy",
      "responseTime": 38,
      "lastCheck": "2026-08-15T10:00:00Z"
    },
    "tts": {
      "status": "healthy",
      "responseTime": 62,
      "lastCheck": "2026-08-15T10:00:00Z"
    },
    "vac": {
      "status": "healthy",
      "responseTime": 28,
      "lastCheck": "2026-08-15T10:00:00Z"
    }
  }
}
```

---

## Consent Management

### Create Consent

Record explicit user consent for audio processing.

```http
POST /api/consent/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "consentType": "voice_cloning",
  "consentVersion": "1.0",
  "consentText": "I consent to my voice being recorded and used for training a voice clone model...",
  "isAccepted": true,
  "recordedAudioPath": "/audio/consent_recordings/user_123_20260815.wav"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `consentType` | enum | Yes | `voice_cloning`, `data_processing`, or `model_training` |
| `consentVersion` | string | Yes | Version of consent form (e.g., "1.0") |
| `consentText` | string | Yes | Full text of consent |
| `isAccepted` | boolean | Yes | User acceptance (true/false) |
| `recordedAudioPath` | string | No | Path to audio confirmation recording |

**Response** (201):
```json
{
  "success": true,
  "consentId": "consent_123abc",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "consentType": "voice_cloning",
  "isAccepted": true,
  "createdAt": "2026-08-15T10:00:00Z",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

**Errors**:
- `400` - Missing required fields
- `400` - Invalid consent type
- `401` - Unauthorized (invalid token)

### Verify Consent

Check if user has accepted a specific consent type.

```http
GET /api/consent/verify/{consentType}
Authorization: Bearer {token}
```

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `consentType` | path | `voice_cloning`, `data_processing`, or `model_training` |

**Response** (200 - Has Consent):
```json
{
  "success": true,
  "hasConsent": true,
  "consentId": "consent_123abc",
  "consentType": "voice_cloning",
  "isAccepted": true,
  "createdAt": "2026-08-15T10:00:00Z",
  "ipAddress": "192.168.1.1"
}
```

**Response** (200 - No Consent):
```json
{
  "success": true,
  "hasConsent": false,
  "consentType": "voice_cloning",
  "message": "User has not accepted this consent type"
}
```

**Errors**:
- `400` - Invalid consent type
- `401` - Unauthorized

### Get User Consents

Retrieve all consent records for current user.

```http
GET /api/consent/my-consents
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Max results per page |
| `offset` | integer | 0 | Pagination offset |
| `status` | string | - | Filter: `active`, `withdrawn`, `expired` |

**Response** (200):
```json
{
  "success": true,
  "consents": [
    {
      "consentId": "consent_123abc",
      "consentType": "voice_cloning",
      "isAccepted": true,
      "status": "active",
      "createdAt": "2026-08-15T10:00:00Z",
      "withdrawnAt": null,
      "ipAddress": "192.168.1.1"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Consent Audit Trail

View full compliance audit trail for consent records.

```http
GET /api/consent/audit-trail
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `consentId` | string | - | Filter by specific consent |
| `limit` | integer | 100 | Max results |
| `offset` | integer | 0 | Pagination offset |

**Response** (200):
```json
{
  "success": true,
  "auditLog": [
    {
      "id": "audit_1",
      "consentId": "consent_123abc",
      "action": "created",
      "timestamp": "2026-08-15T10:00:00Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "changes": {
        "isAccepted": "true",
        "consentType": "voice_cloning"
      }
    },
    {
      "id": "audit_2",
      "consentId": "consent_123abc",
      "action": "used_in_session",
      "timestamp": "2026-08-15T10:05:00Z",
      "sessionId": "session_456def"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 100,
    "offset": 0
  }
}
```

### Withdraw Consent

Permanently withdraw a consent record (GDPR compliance).

```http
PUT /api/consent/withdraw/{consentId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "User requested data deletion"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | No | Reason for withdrawal |

**Response** (200):
```json
{
  "success": true,
  "consentId": "consent_123abc",
  "status": "withdrawn",
  "withdrawnAt": "2026-08-15T10:10:00Z",
  "message": "Consent withdrawn. All associated data will be processed per retention policy."
}
```

**Important**: Withdrawing consent will:
- ✅ Mark consent as withdrawn
- ✅ Prevent new processing sessions
- ✅ Keep audit logs (for legal compliance)
- ✅ Queue voice samples for deletion (after 30 days)

**Errors**:
- `404` - Consent not found
- `400` - Consent already withdrawn
- `401` - Unauthorized

### Self-Consent (Development Mode)

Quick consent acceptance for development/testing. Only available if `SELF_CONSENT_MODE=true` in `.env`.

```http
POST /api/consent/self-consent
Authorization: Bearer {token}
Content-Type: application/json

{
  "consentType": "voice_cloning"
}
```

**Response** (201):
```json
{
  "success": true,
  "consentId": "consent_dev_123",
  "consentType": "voice_cloning",
  "isAccepted": true,
  "isDevelopmentMode": true,
  "createdAt": "2026-08-15T10:00:00Z",
  "message": "Development consent accepted. Not valid for production use."
}
```

---

## Audio Processing

### Process Audio Through Pipeline

Full ASR → MT → TTS synthesis pipeline.

```http
POST /api/audio/process
Authorization: Bearer {token}
Content-Type: application/json

{
  "inputText": "Hello, how are you today?",
  "consentId": "consent_123abc",
  "sourceLanguage": "en",
  "targetLanguage": "es",
  "voiceId": "default_voice"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `inputText` | string | Yes | Text to synthesize |
| `consentId` | string | Yes | Valid consent ID |
| `sourceLanguage` | string | No | Input language (default: "en") |
| `targetLanguage` | string | No | Output language (default: same as source) |
| `voiceId` | string | No | Trained voice model ID (default: "default_voice") |

**Supported Languages**:
- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `pt` - Portuguese
- `it` - Italian

**Response** (200):
```json
{
  "success": true,
  "sessionId": "session_789ghi",
  "consentId": "consent_123abc",
  "status": "completed",
  "pipeline": {
    "asr": {
      "recognizedText": "Hello, how are you today?",
      "language": "en",
      "confidence": 0.92,
      "processingTime": 450
    },
    "mt": {
      "translatedText": "Hola, ¿cómo estás hoy?",
      "sourceLanguage": "en",
      "targetLanguage": "es",
      "confidence": 0.95,
      "processingTime": 320
    },
    "tts": {
      "audioPath": "/audio/output/session_789ghi.wav",
      "audioHash": "a1b2c3d4e5f6...",
      "duration": 3.2,
      "sampleRate": 22050,
      "isClonedAudio": true,
      "voiceModel": "default_voice",
      "processingTime": 1200
    }
  },
  "qualityMetrics": {
    "asrConfidence": 0.92,
    "mtConfidence": 0.95,
    "ttsNaturalness": 0.88,
    "overallScore": 0.91
  },
  "processingTime": 1970,
  "createdAt": "2026-08-15T10:00:00Z"
}
```

**Errors**:
- `400` - Missing required fields
- `401` - Unauthorized
- `403` - No valid consent found
- `500` - Service error

### Voice Activity Detection (VAC)

Analyze audio for voice activity and extract speech regions.

```http
POST /api/audio/vac-check
Authorization: Bearer {token}
Content-Type: application/json

{
  "audioPath": "/audio/input/sample.wav",
  "threshold": 0.5
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audioPath` | string | Yes | Path to audio file |
| `threshold` | float | No | VAC threshold 0.0-1.0 (default: env VAC_THRESHOLD) |

**Response** (200):
```json
{
  "success": true,
  "audioPath": "/audio/input/sample.wav",
  "hasVoiceActivity": true,
  "voiceActivityLevel": 0.78,
  "segments": [
    {
      "segmentId": "seg_1",
      "startMs": 120,
      "endMs": 3450,
      "duration": 3330,
      "confidence": 0.92
    },
    {
      "segmentId": "seg_2",
      "startMs": 4200,
      "endMs": 7890,
      "duration": 3690,
      "confidence": 0.88
    }
  ],
  "totalSpeechDuration": 7020,
  "noiseLevel": 0.15,
  "processingTime": 245
}
```

**Errors**:
- `400` - Invalid threshold
- `404` - Audio file not found
- `500` - Service error

### Start Recording Session

Initialize a real-time recording session.

```http
POST /api/audio/start-recording
Authorization: Bearer {token}
Content-Type: application/json

{
  "consentId": "consent_123abc",
  "sessionLabel": "Morning Practice Session"
}
```

**Response** (201):
```json
{
  "success": true,
  "recordingSessionId": "recording_123xyz",
  "consentId": "consent_123abc",
  "startedAt": "2026-08-15T10:00:00Z",
  "streamUrl": "ws://localhost:3001/api/audio/stream/recording_123xyz",
  "message": "Recording session started. Connect WebSocket to stream audio."
}
```

### Get Session Details

Retrieve processing results for a specific session.

```http
GET /api/audio/session/{sessionId}
Authorization: Bearer {token}
```

**Response** (200):
```json
{
  "success": true,
  "sessionId": "session_789ghi",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "consentId": "consent_123abc",
  "status": "completed",
  "pipeline": {
    "asr": { "recognizedText": "...", "confidence": 0.92 },
    "mt": { "translatedText": "...", "confidence": 0.95 },
    "tts": { "audioPath": "...", "isClonedAudio": true }
  },
  "qualityMetrics": {
    "asrConfidence": 0.92,
    "mtConfidence": 0.95,
    "ttsNaturalness": 0.88,
    "overallScore": 0.91
  },
  "processingTime": 1970,
  "createdAt": "2026-08-15T10:00:00Z",
  "updatedAt": "2026-08-15T10:00:33Z"
}
```

### Get User Sessions

List all processing sessions for current user.

```http
GET /api/audio/my-sessions
Authorization: Bearer {token}
```

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Max results per page |
| `offset` | integer | 0 | Pagination offset |
| `status` | string | - | Filter: `pending`, `completed`, `failed` |
| `consentId` | string | - | Filter by consent |

**Response** (200):
```json
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session_789ghi",
      "consentId": "consent_123abc",
      "status": "completed",
      "inputText": "Hello world",
      "qualityScore": 0.91,
      "processingTime": 1970,
      "createdAt": "2026-08-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable error message",
  "timestamp": "2026-08-15T10:00:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `invalid_token` | 401 | Missing or invalid JWT token |
| `token_expired` | 401 | Token has expired |
| `unauthorized` | 401 | User not authorized for this resource |
| `bad_request` | 400 | Invalid request parameters |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource already exists |
| `validation_error` | 400 | Input validation failed |
| `service_error` | 500 | Internal service error |
| `no_consent` | 403 | User has not provided required consent |

### Example Error Response

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "success": false,
  "error": "invalid_token",
  "message": "JWT token is invalid or expired",
  "timestamp": "2026-08-15T10:00:00Z"
}
```

---

## Rate Limiting

API endpoints are rate-limited per user:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/audio/process` | 100 | 1 hour |
| `/api/audio/vac-check` | 500 | 1 hour |
| All other endpoints | 1000 | 1 hour |

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692186400
```

When limit exceeded (429):

```json
{
  "success": false,
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again after 3600 seconds.",
  "retryAfter": 3600
}
```

---

## Code Examples

### cURL

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'

# 3. Create consent
curl -X POST http://localhost:3001/api/consent/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "consentType": "voice_cloning",
    "consentVersion": "1.0",
    "consentText": "I consent...",
    "isAccepted": true
  }'

# 4. Process audio
curl -X POST http://localhost:3001/api/audio/process \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inputText": "Hello world",
    "consentId": "consent_123abc",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001'
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Register
async function register(email, password) {
  const response = await api.post('/api/auth/register', { email, password });
  return response.data;
}

// Process audio
async function processAudio(inputText, consentId, targetLanguage = 'es') {
  const response = await api.post('/api/audio/process', {
    inputText,
    consentId,
    sourceLanguage: 'en',
    targetLanguage
  });
  return response.data;
}
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3001'

class UrieSmoothClient:
    def __init__(self, token=None):
        self.token = token
        self.headers = {'Authorization': f'Bearer {token}'} if token else {}
    
    def register(self, email, password):
        response = requests.post(
            f'{BASE_URL}/api/auth/register',
            json={'email': email, 'password': password}
        )
        return response.json()
    
    def process_audio(self, input_text, consent_id, target_language='es'):
        response = requests.post(
            f'{BASE_URL}/api/audio/process',
            headers=self.headers,
            json={
                'inputText': input_text,
                'consentId': consent_id,
                'sourceLanguage': 'en',
                'targetLanguage': target_language
            }
        )
        return response.json()

# Usage
client = UrieSmoothClient(token='your_jwt_token')
result = client.process_audio('Hello world', 'consent_123abc', 'es')
print(result)
```

---

## Webhooks (Future)

Webhook support planned for v1.1.0 to notify on:
- Session completion
- Training job status updates
- Consent expiration/withdrawal
- Service health changes

---

## Changelog

### v1.0.0 (2026-08-15)
- Initial API release
- Consent management endpoints
- Audio processing pipeline
- VAC analysis
- Session tracking

---

**Questions?** Contact support@uriesmooth.ai or check [docs/](../docs/)
