# Installation & Setup Guide

## Prerequisites

Before starting, ensure you have the following installed:

### Required
- **Node.js** 18.0.0 or higher ([Download](https://nodejs.org/))
- **npm** 9.0.0+ or **yarn** 3.0.0+ (comes with Node.js)
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/download/))
- **Git** 2.37+

### Optional
- **Docker** 20.10+ & **Docker Compose** 2.0+ (for containerized database)
- **Python** 3.8+ (for advanced ML features)
- **CUDA** 11.8+ (for GPU-accelerated training, optional)

### System Requirements
- **Memory**: 8GB RAM minimum (16GB recommended)
- **Storage**: 10GB free space (20GB for voice model training)
- **OS**: Windows 10+, macOS 11+, or Linux (Ubuntu 20.04+)

## Backend Installation

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

**Expected Output**:
```
added 150 packages in 25s
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://voice_app:changeme@localhost:5432/uriesmooth_voice
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# JWT Authentication
JWT_SECRET=your_secret_key_min_32_chars_long
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:3000,electron://app

# Services (mocked by default)
MOCK_SERVICES=true
ASR_SERVICE_URL=http://localhost:5000
MT_SERVICE_URL=http://localhost:5001
TTS_SERVICE_URL=http://localhost:5002

# VAC Configuration
VAC_ENABLED=true
VAC_THRESHOLD=0.5
VAC_MIN_DURATION_MS=200

# Consent Management
CONSENT_REQUIRED=true
DEVELOPMENT_SKIP_CONSENT=false
SELF_CONSENT_MODE=true

# Logging
DEBUG_AUDIO_PIPELINE=false
LOG_LEVEL=info
```

### Step 3: Database Setup

#### Option A: PostgreSQL (Local Installation)

```bash
# Create database
createdb -U postgres uriesmooth_voice

# Create app user
psql -U postgres -d uriesmooth_voice -c "CREATE USER voice_app WITH PASSWORD 'changeme';"
psql -U postgres -d uriesmooth_voice -c "GRANT ALL PRIVILEGES ON DATABASE uriesmooth_voice TO voice_app;"
```

#### Option B: Docker (Recommended)

```bash
# From project root
docker-compose up -d

# Verify containers running
docker-compose ps

# Access pgAdmin at http://localhost:5050
# User: admin@uriesmooth.ai
# Pass: admin
```

### Step 4: Run Database Migrations

```bash
cd backend
npm run migrate

# Expected output:
# ✓ Running migration 001_initial_schema.js
# ✓ All migrations completed successfully
```

**Verify migration success**:
```bash
psql -U voice_app -d uriesmooth_voice -c "\dt"

# Should show:
# users | consents | voice_samples | sessions | audit_logs
```

### Step 5: Start Backend Server

```bash
npm run dev

# Expected output:
# Server running on port 3001
# Database: uriesmooth_voice connected
# VAC enabled with threshold 0.5
```

**Verify server health**:
```bash
curl http://localhost:3001/api/audio/health

# Response:
# {
#   "status": "ok",
#   "timestamp": "2026-08-15T10:00:00Z",
#   "services": {
#     "database": "healthy",
#     "asr": "healthy",
#     "mt": "healthy",
#     "tts": "healthy",
#     "vac": "healthy"
#   }
# }
```

## Desktop Application Installation

### Step 1: Install Dependencies

```bash
cd desktop
npm install
```

**Expected Output**:
```
added 250 packages in 45s
```

### Step 2: Configure Backend URL

Edit `desktop/src/App.js`:

```javascript
// Line ~20
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
```

### Step 3: Start Development Mode

```bash
npm start

# This will:
# 1. Start React dev server (http://localhost:3000)
# 2. Launch Electron window
# 3. Show consent flow on first run
```

**Expected Behavior**:
- Electron window opens
- Consent form displayed (skip button available in dev mode)
- Ready for testing

### Step 4: Build for Production

```bash
npm run build        # All platforms
npm run build:win    # Windows only
npm run build:mac    # macOS only
npm run build:linux  # Linux only

# Output location: desktop/out/ or desktop/dist/
```

## Complete Development Stack

### Terminal 1: Backend Server

```bash
cd backend
npm run dev

# Output:
# Server running on port 3001
# Ready for API requests
```

### Terminal 2: Desktop App

```bash
cd desktop
npm start

# Opens Electron window automatically
# React dev server on localhost:3000
```

### Terminal 3: Database (if not using Docker)

```bash
# Optional: pgAdmin in browser
docker-compose up -d  # if using Docker
```

## Verification Checklist

After setup, verify all components:

```bash
# 1. Check backend
curl http://localhost:3001/health

# 2. Check database connection
psql -U voice_app -d uriesmooth_voice -c "SELECT COUNT(*) FROM users;"

# 3. Desktop app should launch automatically
# Consent form should appear

# 4. Create test user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@uriesmooth.ai",
    "password": "TestPassword123!"
  }'

# 5. Test audio processing
curl -X POST http://localhost:3001/api/audio/process \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "inputText": "Hello world",
    "consentId": "{consentId}",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'
```

## Troubleshooting

### Backend Won't Start

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready -h localhost -U voice_app

# If using Docker, verify containers
docker-compose ps

# Restart Docker services
docker-compose restart postgres
```

**Error**: `Database does not exist`

**Solution**:
```bash
# Run migrations again
npm run migrate

# Or manually create database
createdb -U postgres uriesmooth_voice
```

### Desktop App Won't Launch

**Error**: `Error: spawn npm ENOENT`

**Solution**:
```bash
# Clear node_modules and reinstall
cd desktop
rm -rf node_modules package-lock.json
npm install
npm start
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE :::3001`

**Solution**:
```bash
# Find and kill process using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Or use different port
PORT=3002 npm run dev
```

### No Audio Output

**Error**: Microphone not accessible

**Solution**:
1. Check browser permissions:
   - Open DevTools (F12)
   - Look for mic permission prompts
   - Grant microphone access

2. Check system audio:
   ```bash
   # Linux
   pactl list short sources
   
   # macOS
   system_profiler SPAudioDataType
   ```

### VAC Not Detecting Voice

**Solution**: Adjust VAC threshold in `.env`:

```env
VAC_THRESHOLD=0.3  # More sensitive
# or
VAC_THRESHOLD=0.7  # Less sensitive
```

Then restart backend and recalibrate in app.

## Development Commands

### Backend

```bash
npm run dev           # Start with hot-reload
npm run migrate       # Run database migrations
npm test              # Run test suite
npm run lint          # Check code style
npm run format        # Format code
npm run debug         # Debug mode with inspector
```

### Desktop

```bash
npm start             # Start dev mode
npm run build         # Build for current platform
npm run pack          # Create installer (no sign)
npm run make          # Build & package
npm test              # Run React tests
npm run lint          # Check code style
```

## Docker Quick Start

```bash
# Start entire stack with Docker
docker-compose up -d

# Check logs
docker-compose logs -f postgres

# Stop everything
docker-compose down

# Clean up volumes (WARNING: deletes database)
docker-compose down -v
```

## Environment Files

### .env.example (Backend)

Default values for all configuration options.

### .env.development (Optional)

Development-specific overrides:
```env
NODE_ENV=development
DEBUG_AUDIO_PIPELINE=true
MOCK_SERVICES=true
DEVELOPMENT_SKIP_CONSENT=true
```

### .env.production (Optional)

Production settings:
```env
NODE_ENV=production
CONSENT_REQUIRED=true
DEVELOPMENT_SKIP_CONSENT=false
MOCK_SERVICES=false  # Use real services
LOG_LEVEL=warn
```

## Next Steps

1. **Review Documentation**
   - Read [docs/API.md](../docs/API.md) for endpoint details
   - Check [docs/VAC_SETUP.md](../docs/VAC_SETUP.md) for voice settings
   - See [docs/VOICE_SAMPLE_UPLOAD.md](../docs/VOICE_SAMPLE_UPLOAD.md) for recording

2. **Run Tests**
   ```bash
   cd backend
   npm test
   
   cd ../desktop
   npm test
   ```

3. **Integrate Real Services**
   - Replace mocked ASR with Google Cloud Speech-to-Text
   - Replace mocked MT with Google Translate API
   - Replace mocked TTS with real model

4. **Prepare Voice Samples**
   - Record 20+ voice samples
   - Upload through desktop app
   - Train voice model

## Support

- 📖 Documentation: [docs/](../docs/)
- 🐛 Issues: GitHub Issues
- 💬 Questions: GitHub Discussions
- 📧 Support: support@uriesmooth.ai

---

**Last Updated**: 2026-08-15  
**Version**: 1.0.0
