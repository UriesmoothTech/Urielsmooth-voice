# URIESMOOTH Voice - AI Agent Instructions

> Guide for AI coding agents working in this codebase

## Quick Context

**URIESMOOTH Voice** is a professional-grade desktop application for real-time speech processing with strict consent management and fail-closed security. It combines:
- Real-time voice recording & processing (ASR→MT→TTS pipeline)
- Voice cloning with trained voice models  
- Voice Activity Detection (VAC) calibration
- Auditable consent management system (GDPR-compliant)
- Fail-closed architecture (raw audio NEVER sent to external services)

**Tech Stack**:
- **Backend**: Express.js + PostgreSQL (Node.js 18+)
- **Desktop**: Electron + React (Node.js 18+)
- **Database**: PostgreSQL 13+ (or Docker)

---

## 🎯 Before You Start

### Setup Checklist
1. ✅ Node.js 18+ installed
2. ✅ PostgreSQL 13+ running (or use `docker-compose up -d`)
3. ✅ Read [README.md](README.md) to understand the project
4. ✅ Follow [SETUP.md](SETUP.md) for installation

### Common First Commands

**Backend Development**:
```bash
cd backend
npm install
cp .env.example .env         # Edit with your config
npm run migrate              # Create database schema
npm run dev                  # Start server (port 3001)
```

**Desktop Development** (new terminal):
```bash
cd desktop
npm install
npm start                    # Concurrently runs React (3000) + Electron
```

### Database Setup
Use Docker (recommended):
```bash
# From project root
docker-compose up -d
# Creates PostgreSQL on localhost:5432, user: voice_app, password: changeme
```

---

## 📁 Project Structure & Where Things Live

### Backend Architecture
```
backend/
├── server.js              ← Express app entry point
├── config/database.js     ← PostgreSQL connection & query helpers
├── middleware/auth.js     ← JWT auth middleware (requireAuth, optionalAuth)
├── models/
│   ├── Consent.js        ← Consent data layer (immutable audit trail)
│   └── Session.js        ← Session tracking (ASR→MT→TTS execution)
├── services/
│   ├── asrService.js     ← Speech recognition (mock, replace for production)
│   ├── mtService.js      ← Translation
│   ├── ttsService.js     ← Text-to-speech synthesis
│   └── vacService.js     ← Voice Activity Detection
└── routes/
    ├── consent.js        ← POST/GET consent endpoints
    └── audio.js          ← Audio processing pipeline
```

### Desktop Architecture
```
desktop/src/
├── main.js               ← Electron main process
├── preload.js            ← Safe IPC bridge to renderer
├── App.js                ← React root component
└── components/
    ├── MainWindow.js     ← Main UI container
    ├── ConsentFlow.js    ← Consent acceptance UI
    ├── RecordingPanel.js ← Audio recording
    ├── ConsentStatus.js  ← Show consent history
    └── VACTestTool.js    ← Voice Activity Detection calibration
```

### Database Schema
```
users              → system users (email, password_hash, voice_profile_id)
consents           → immutable audit trail (consent_type: voice_cloning|data_processing|model_training)
sessions           → ASR→MT→TTS execution linked to consent (ON DELETE RESTRICT)
voice_samples      → training data for voice cloning (ON DELETE RESTRICT)
audit_logs         → append-only compliance trail
```

**Critical**: Never delete from `consents` or `voice_samples`—only update `is_accepted` status. Preserves compliance trail.

---

## 🔑 Key Patterns & Conventions

### 1. Naming Conventions

| What | Pattern | Example |
|------|---------|---------|
| JavaScript files | camelCase | `asrService.js`, `ConsentFlow.js` |
| React components | PascalCase | `<RecordingPanel />`, `<ConsentFlow />` |
| Functions | Action + Subject | `createConsent()`, `verifyConsentExists()`, `updateSessionASR()` |
| Database columns | snake_case + boolean prefix | `is_accepted`, `is_cloned_audio`, `created_at` |
| Constants | UPPERCASE_SNAKE_CASE | `JWT_SECRET`, `VAC_THRESHOLD` |

### 2. Backend Route Pattern

```javascript
// Express route with validation, auth, error handling
router.post('/api/consent/create',
  requireAuth,                          // Auth gate (throws 401 if invalid)
  [
    body('consentType').isIn(['voice_cloning', 'data_processing', 'model_training']),
    body('isAccepted').isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    
    try {
      const consent = await ConsentModel.createConsent({
        userId: req.userId,              // From JWT token
        consentType: req.body.consentType,
        isAccepted: req.body.isAccepted,
        ipAddress: req.ip,               // Captured for audit
        userAgent: req.get('User-Agent')
      });
      res.status(201).json({ message: 'Consent created', data: consent });
    } catch (error) {
      console.error('[Consent] Creation failed:', error);
      res.status(500).json({ error: 'Failed to create consent' });
    }
  }
);
```

### 3. Audio Processing Pipeline (Fail-Safe)

The `audio.js` route implements fail-closed architecture:

```javascript
POST /api/audio/process {
  consentId, languageCode, audioPath
}

1. Verify consent exists (throws if not)
2. Create session linked to consent
3. ASR: Convert audio → text (validate success)
4. MT: Translate text if needed (validate success)
5. TTS: Synthesize output with trained voice (validate success)
6. Mark output as is_cloned_audio: true (CRITICAL)
7. Complete session with metrics
```

**Critical Guard**: Raw user audio NEVER sent to external services. Only text and synthesized output leave the system.

### 4. Consent Model Operations

```javascript
// Create (immutable insert)
await Consent.createConsent({ userId, consentType, isAccepted, ipAddress, userAgent })

// Get latest accepted consent of type
await Consent.getLatestAcceptedConsent(userId, 'voice_cloning')

// Verify consent exists (throws if not found)
await Consent.verifyConsentExists(consentId)

// Get full audit trail
await Consent.getConsentAuditTrail(consentId)

// Update status only (never delete)
await query('UPDATE consents SET is_accepted = $1, updated_at = now() WHERE id = $2', 
            [isAccepted, consentId])
```

### 5. Authentication & Authorization

All backend endpoints use JWT:

```javascript
// Middleware: requireAuth (401 if invalid)
app.use(requireAuth);

// Middleware: optionalAuth (add req.userId if valid, continue if not)
app.use(optionalAuth);

// JWT payload: { userId, email, iat, exp }
// Token format: Bearer <token>
// Expiry: 24 hours (configurable via JWT_EXPIRY)
```

Desktop sends token:
```javascript
const response = await axios.post('/api/endpoint', payload, {
  headers: { Authorization: `Bearer ${token}` }
});
```

### 6. Database Query Helpers

All queries use parameterized statements (prevent SQL injection):

```javascript
// Single row
const consent = await getOne(
  'SELECT * FROM consents WHERE id = $1 AND is_accepted = $2',
  [consentId, true]
);

// Multiple rows  
const sessions = await getAll(
  'SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
  [userId]
);

// Insert with return
const result = await query(
  'INSERT INTO consents (user_id, consent_type, is_accepted, ip_address) VALUES ($1, $2, $3, $4) RETURNING *',
  [userId, 'voice_cloning', true, ipAddress]
);

// Always check for null/empty results
if (!consent) throw new Error('Consent not found');
```

### 7. Service Mock-to-Production Pattern

All services (ASR, MT, TTS, VAC) follow same structure:

```javascript
// Current: Mock with simulated latency
export const recognizeSpeech = async (audioPath, language) => {
  await delay(Math.random() * 2000 + 500);  // Simulate API latency
  return {
    success: true,
    text: 'Mocked transcription result',
    confidence: 0.87,
    language_detected: language,
    processing_time_ms: 1523,
    timestamp: new Date().toISOString(),
    warning: 'MOCK SERVICE - Replace with real ASR integration'
  };
};

// Production: Drop-in replacement with real API calls
export const recognizeSpeech = async (audioPath, language) => {
  const response = await axios.post(process.env.ASR_SERVICE_URL, {
    audio_path: audioPath,
    language: language
  });
  return response.data;  // Same format as mock
};
```

**Key**: Response format is identical mock↔production.

### 8. React Component Pattern

```javascript
const RecordingPanel = ({ token }) => {
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize on mount
  }, []);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('/api/audio/process', 
        { consentId, languageCode, audioPath },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update UI with response.data
    } catch (error) {
      setError(error.response?.data?.error || 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Processing...</div>;
  if (error) return <div className="error">{error}</div>;
  return (
    <div className="recording-panel">
      {/* UI */}
    </div>
  );
};
```

---

## 🚀 Development Workflows

### Adding a Backend Route

1. **Define in `backend/routes/<feature>.js`**
   ```javascript
   router.post('/endpoint', requireAuth, [validation], async (req, res) => {
     // Try-catch with console.error logging
   });
   ```

2. **Add to model if needed** (`backend/models/Model.js`)
   ```javascript
   export const operationName = async (params) => {
     const result = await query(sql, [params]);
     return result;
   };
   ```

3. **Update test file** (`backend/tests/routes/<feature>.test.js`)

4. **Test locally**:
   ```bash
   npm run dev              # Terminal 1
   curl -X POST http://localhost:3001/api/endpoint \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```

### Adding a Desktop Component

1. **Create component** (`desktop/src/components/ComponentName.js`)
   ```javascript
   const ComponentName = ({ token }) => {
     const [state, setState] = useState(null);
     return <div>{/* UI */}</div>;
   };
   export default ComponentName;
   ```

2. **Add styles** (`desktop/src/styles/ComponentName.css`)

3. **Import in `App.js`** and render

4. **Test**: `npm start` runs React + Electron together

### Working with Migrations

1. **Create new migration** (manually in `backend/migrations/002_feature_name.js`)
   ```javascript
   export const up = `
     ALTER TABLE sessions ADD COLUMN feature_field VARCHAR(255);
   `;
   
   export const down = `
     ALTER TABLE sessions DROP COLUMN feature_field;
   `;
   ```

2. **Run**: `npm run migrate`

3. **Rollback**: Modify `backend/migrations/run.js` to skip last migration

**Never manually alter schema—always use migrations.**

### Integrating a Real Service

Replace mock service:

1. **Update `backend/services/asrService.js`** (example):
   ```javascript
   export const recognizeSpeech = async (audioPath, language) => {
     const response = await axios.post(process.env.ASR_SERVICE_URL, {
       audio_path: audioPath,
       language: language
     });
     return response.data;  // Must match mock format
   };
   ```

2. **Set env variables** in `.env`:
   ```
   ASR_SERVICE_URL=https://api.asr-provider.com/v1/recognize
   MOCK_SERVICES=false
   ```

3. **Update `audio.js` route** if additional validation needed

4. **Test pipeline**: Desktop → Backend → Real Service

---

## ⚠️ Critical Constraints & Pitfalls

### 🔒 Fail-Closed Security
- Raw audio **NEVER** sent to external services
- Only text (ASR output, MT result) and synthesized audio leave the system
- All TTS outputs marked `is_cloned_audio: true`
- Session links prevent orphaned data

**If you see code sending raw audio to external APIs, STOP—this violates the core architecture.**

### 🔐 Consent Management
- Every audio processing requires verified consent
- Consent is immutable (create-only, never delete)
- Audit trail captures IP, user-agent, timestamp
- Multiple consent types: `voice_cloning`, `data_processing`, `model_training`

**If you see code processing audio without checking consent, STOP.**

### 🗄️ Database Integrity
- Foreign key constraints: `ON DELETE RESTRICT` on consents/voice_samples
- Automatic `updated_at` via trigger function
- Always use parameterized queries (`$1, $2`, not string interpolation)

**If you see raw SQL with string interpolation, STOP—SQL injection risk.**

### 🎤 Voice Activity Detection (VAC)
- Mock implementation uses threshold-based segments
- Real implementation should detect silence/speech regions
- Configurable: `VAC_THRESHOLD` (0-1), `VAC_MIN_DURATION_MS`
- Optimizes processing efficiency

### 🔗 Electron-Backend Communication
- Context isolation enforced (renderer can't access Node APIs)
- Preload bridge only exposes approved IPC methods
- Use HTTPS in production
- JWT tokens expire after 24 hours

---

## 📚 Documentation Map

For detailed information, consult:

| Need | Document |
|------|----------|
| Project overview | [README.md](README.md) |
| Installation & setup | [SETUP.md](SETUP.md) |
| API reference | [docs/API.md](docs/API.md) |
| Voice cloning workflow | [docs/VOICE_SAMPLE_UPLOAD.md](docs/VOICE_SAMPLE_UPLOAD.md) |
| VAC calibration | [docs/VAC_SETUP.md](docs/VAC_SETUP.md) |
| Production integration | [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md) |
| Cloud deployment | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| Testing | [TESTING.md](TESTING.md) |

---

## 🔍 Common Tasks

### "I need to add a consent type"
1. Update database enum: `backend/migrations/002_new_migration.js`
2. Run migration: `npm run migrate`
3. Update validation in routes: `backend/routes/consent.js`
4. Update model if needed: `backend/models/Consent.js`
5. Add tests

### "I need to add an audio processing step"
1. Create service: `backend/services/newService.js` (follow mock pattern)
2. Add to audio pipeline: `backend/routes/audio.js`
3. Add validation + error handling
4. Update session tracking if needed
5. Test end-to-end

### "I need to update the consent UI"
1. Edit component: `desktop/src/components/ConsentFlow.js`
2. Update styles: `desktop/src/styles/ConsentFlow.css`
3. Test with `npm start`

### "I need to change database schema"
1. Create migration (never edit existing)
2. Run `npm run migrate`
3. Update models to reflect schema
4. Update routes/services as needed

### "My tests are failing"
1. Check environment: Is PostgreSQL running?
2. Check `.env`: Is `DATABASE_URL` correct?
3. Run migrations: `npm run migrate`
4. Check logs: `npm run test -- --verbose`
5. See [TESTING.md](TESTING.md) for test setup

---

## 🎓 Pro Tips

✅ **Do This**:
- Use [SETUP.md](SETUP.md) for troubleshooting
- Check existing patterns before adding new code
- Run migrations before testing
- Use parameterized queries
- Add tests for new features
- Comment non-obvious logic
- Check `.env.example` for all available config

❌ **Don't Do This**:
- Don't send raw audio to external APIs
- Don't skip consent verification
- Don't use string interpolation in SQL
- Don't delete from `consents` or `voice_samples` tables
- Don't modify migrations after running them
- Don't hardcode configuration values

---

## 📞 Getting Help

1. **Setup issues?** → [SETUP.md](SETUP.md) Troubleshooting section
2. **API questions?** → [docs/API.md](docs/API.md)
3. **Architecture questions?** → This file or [README.md](README.md)
4. **Testing help?** → [TESTING.md](TESTING.md)
5. **Integration help?** → [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md)

---

**Last Updated**: August 2026 | Version 0.1.0
