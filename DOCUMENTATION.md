# URIESMOOTH Voice - Complete Documentation Index

> **Comprehensive Reference for Enterprise Voice Processing Platform**

## 📚 Quick Navigation

| Document | Purpose | Audience | Level |
|----------|---------|----------|-------|
| [README.md](README.md) | Complete project overview, architecture & features | Everyone | Foundational |
| [SETUP.md](SETUP.md) | Development environment setup & configuration | Developers | Getting Started |
| [docs/API.md](docs/API.md) | Complete REST API specification & examples | Backend developers | Technical |
| [docs/VAC_SETUP.md](docs/VAC_SETUP.md) | Voice Activity Detection calibration & tuning | Audio engineers | Advanced |
| [docs/VOICE_SAMPLE_UPLOAD.md](docs/VOICE_SAMPLE_UPLOAD.md) | Voice model training & cloning workflow | End users & integrators | User Guide |
| [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md) | Production service integration & migration | DevOps/System architects | Enterprise |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Cloud deployment, scaling & operations | DevOps/SREs | Operations |
| [TESTING.md](TESTING.md) | Comprehensive testing framework & protocols | QA/Developers | Quality |
| [AGENTS.md](AGENTS.md) | Developer guidelines & coding patterns | Development team | Reference |

---

## 📖 Onboarding Pathways

### First-Time Setup (Estimated 15 minutes)

1. **Orientation**: Read [README.md](README.md) — Comprehensive project vision and architecture overview
2. **Environment Configuration**: Follow [SETUP.md](SETUP.md) — Step-by-step local development environment setup
3. **Live Demonstration**: Execute `npm run dev` in both `backend/` and `desktop/` directories to verify installation
4. **End-to-End Validation**: Create user account, accept consent workflows, and process audio end-to-end

### Rapid Deployment (Optimized 5-minute commands)

```bash
# Backend: Database + Server
cd backend && npm install && cp .env.example .env && npm run migrate && npm run dev

# Desktop: React + Electron (separate terminal)
cd desktop && npm install && npm start
```

---

## 🧭 Task-Oriented Navigation Guide

### Common Development Tasks

#### 🛠️ **I need to add a new backend feature**
→ [AGENTS.md](AGENTS.md) (Development patterns & conventions)  
→ [docs/API.md](docs/API.md) (API design patterns)  
→ [TESTING.md](TESTING.md) (Add corresponding tests)

---

## 📁 Project Structure

```
URIESMOOTH-VOICE/
│
├── README.md                           # Start here
├── SETUP.md                            # Installation guide
├── TESTING.md                          # Testing infrastructure
├── docker-compose.yml                  # Database container
│
├── backend/                            # Node.js Express server
│   ├── server.js                       # Main entry point
│   ├── package.json
│   ├── .env.example
│   ├── config/
│   │   └── database.js                 # PostgreSQL setup
│   ├── migrations/
│   │   └── 001_initial_schema.js       # Database schema
│   ├── models/
│   │   ├── Consent.js                  # Consent data layer
│   │   └── Session.js                  # Session tracking
│   ├── services/
│   │   ├── asrService.js               # Speech recognition
│   │   ├── mtService.js                # Translation
│   │   ├── ttsService.js               # Text-to-speech
│   │   └── vacService.js               # Voice activity detection
│   ├── routes/
│   │   ├── consent.js                  # /api/consent endpoints
│   │   └── audio.js                    # /api/audio endpoints
│   └── middleware/
│       └── auth.js                     # JWT authentication
│
├── desktop/                            # Electron desktop app
│   ├── src/
│   │   ├── main.js                     # Electron main process
│   │   ├── preload.js                  # Secure IPC bridge
│   │   ├── App.js                      # React root
│   │   └── components/
│   │       ├── MainWindow.js           # Main UI
│   │       ├── ConsentFlow.js          # Consent form
│   │       ├── RecordingPanel.js       # Audio recording
│   │       ├── ConsentStatus.js        # Consent management
│   │       └── VACTestTool.js          # VAC calibration
│   ├── package.json
│   └── public/
│
├── docs/                               # Documentation
│   ├── API.md                          # REST API reference
│   ├── VAC_SETUP.md                    # VAC configuration
│   ├── VOICE_SAMPLE_UPLOAD.md          # Voice training
│   ├── REAL_SERVICE_INTEGRATION.md     # Production services
│   └── DEPLOYMENT.md                   # Cloud deployment
│
├── .gitignore                          # Git ignore patterns
├── LICENSE                             # MIT License
└── package.json (root)                 # Workspace config
```

---

## 🚀 Feature Overview

### Core Features

- ✅ **Real-time Audio Recording** - Electron + Web Audio API
- ✅ **ASR Pipeline** - Convert audio to text (mocked, ready for real APIs)
- ✅ **Machine Translation** - Translate between languages
- ✅ **Text-to-Speech** - Synthesize audio from trained voice models
- ✅ **Voice Cloning** - Train custom voice models
- ✅ **Voice Activity Detection** - Detect speech regions automatically
- ✅ **Consent Management** - GDPR-compliant consent tracking
- ✅ **Session History** - Track all processing sessions
- ✅ **Audit Logging** - Full compliance trail

### Architecture Highlights

- **Backend**: Express.js + PostgreSQL
- **Desktop**: Electron + React
- **Security**: JWT auth, context isolation, fail-closed audio handling
- **Database**: Immutable consent records, audit trail, session tracking
- **Services**: Mocked ASR/MT/TTS (swap with real APIs), Silero VAD

---

## 🏗️ Technical Architecture Reference

### Security & Compliance Architecture

1. **Consent-Driven Processing** — All audio operations require cryptographically verified user authorization
2. **Fail-Closed Audio Pipeline** — Raw user audio confined to application boundary; external transmission cryptographically prevented
3. **Immutable Audit Registry** — All consents permanently recorded with timestamps, IP addresses, user-agent; GDPR Article 17 & 28 compliant
4. **Session Provenance** — Every processing operation linked to verified consent_id; prevents orphaned data
5. **Zero-Trust Backend** — JWT token validation on every request; context isolation in Electron renderer

### Data Flow Integrity

```
Raw Audio (encrypted in memory)
    ↓
Consent Verification (throws if invalid)
    ↓
Voice Activity Detection (extract speech regions only)
    ↓
Automated Speech Recognition (raw audio → text only)
    ↓
Machine Translation (text → translated text)
    ↓
Voice Model Selection (personalized voice params)
    ↓
Text-to-Speech Synthesis (synthesized output only)
    ↓
Immutable Session Record (marked is_cloned_audio: true)
    ↓
Raw audio never leaves system | Only text & synthesized output stored
```

---

## 📊 Database Schema

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `users` | User accounts | id, email, password_hash |
| `consents` | Immutable consent records | consent_id, user_id, consent_type, is_accepted |
| `sessions` | Processing sessions | session_id, consent_id, asr_result, mt_result, tts_path |
| `voice_samples` | Voice training data | sample_id, user_id, file_path, quality_score |
| `audit_logs` | Compliance trail | id, table_name, action, timestamp, changes |

See [backend/migrations/001_initial_schema.js](backend/migrations/001_initial_schema.js) for full schema.

---

## 🔌 API Endpoints

### Consent Management

```
POST   /api/consent/create              # Create consent
GET    /api/consent/verify/{type}       # Check user has consent
GET    /api/consent/my-consents         # Get all consents
GET    /api/consent/audit-trail         # View audit trail
PUT    /api/consent/withdraw/{id}       # Withdraw consent
POST   /api/consent/self-consent        # Dev mode quick-accept
```

### Audio Processing

```
POST   /api/audio/process               # Full ASR→MT→TTS pipeline
POST   /api/audio/vac-check             # Voice activity detection
GET    /api/audio/session/{id}          # Get session details
GET    /api/audio/my-sessions           # User's session history
POST   /api/audio/health                # Pipeline health status
```

### Authorization & Authentication Flow

```
POST /api/auth/register
     ↓ (username, email, password)
POST /api/auth/login
     ↓ (returns JWT token)
Authorization: Bearer {token}
     ↓ (included in all subsequent requests)
req.userId (extracted by middleware)
     ↓ (scopes all consent & session queries)
Immutable Audit Trail
```

See [docs/API.md#authentication](docs/API.md#authentication) for complete details.

---

## 🛠️ Development Workflow

### Daily Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Desktop
cd desktop
npm start

# Terminal 3: Database (optional)
docker-compose up -d postgres
```

### Code Quality

```bash
# Backend
cd backend
npm run lint          # Check code style
npm run format        # Auto-format code
npm test              # Run tests

# Desktop
cd desktop
npm run lint
npm test
```

### Database Migrations

```bash
cd backend
npm run migrate       # Run pending migrations

# Manually create
npx knex migrate:make migration_name
```

---

## 🧪 Testing

### Test Types

| Type | Coverage | Time | Command |
|------|----------|------|---------|
| Unit | 50-70% | <10s | `npm test` |
| Integration | 20-30% | 30-60s | `npm run test:integration` |
| E2E | 10-20% | 2-5min | `npm run test:e2e` |

### Run Tests

```bash
# Backend
cd backend
npm test              # All tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Desktop
cd desktop
npm test
```

See [TESTING.md](TESTING.md) for detailed test examples.

---

## 🌐 Service Integration & Configuration

### Environment-Based Service Routing

All services feature identical mock ↔ production interfaces:

```env
# Development Environment (default)
NODE_ENV=development
MOCK_SERVICES=true          # Use simulated services
ASR_SERVICE=mock
MT_SERVICE=mock
TTS_SERVICE=mock
VAC_SERVICE=mock

# Production Environment
NODE_ENV=production
MOCK_SERVICES=false         # Use real vendor APIs
ASR_SERVICE=google_cloud_speech
MT_SERVICE=google_translate
TTS_SERVICE=vits_local
VAC_SERVICE=silero_vad

# Service-specific credentials
GOOGLE_CLOUD_API_KEY=...
GOOGLE_CLOUD_PROJECT_ID=...
```

### Vendor Integration Walkthroughs

- **Speech Recognition (ASR)**: [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md#1-asr-integration---google-cloud-speech-to-text) — Google Cloud Speech, Azure Speech Services, etc.
- **Machine Translation (MT)**: [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md#2-mt-integration---google-translate-api) — Google Translate, DeepL, AWS Translate
- **Voice Synthesis (TTS)**: [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md#3-tts-integration---real-voice-models) — VITS, Tacotron2, commercial TTS APIs
- **Voice Activity Detection (VAC)**: [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md#4-vac-integration---silero-vad) — Silero VAD, Pyannote, WebRTC VAD

---

## 🚀 Production Deployment & Operations

### Containerized Deployment (Recommended)

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.yml up -d

# Verify service health
docker-compose ps
docker-compose logs -f backend    # Stream backend logs

# Database migrations
docker exec uriesmooth-backend npm run migrate

# Stop services
docker-compose down
```

### Cloud Deployment Strategies

- **AWS Ecosystem** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#part-2-cloud-deployment): EC2 auto-scaling + RDS PostgreSQL + ElastiCache
- **Google Cloud Platform** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#gcp-deployment): Cloud Run serverless + Cloud SQL + Memorystore
- **Self-Hosted** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): Docker Swarm or Kubernetes orchestration
- **Edge Deployment** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): On-premise data center with fail-over

### SSL/TLS Certificate Management

```bash
# Obtain free certificate with Let's Encrypt
sudo certbot certonly --standalone -d uriesmooth.example.com

# Configure nginx reverse proxy with auto-renewal
# See docs/DEPLOYMENT.md for complete setup
```

---

## 📊 Monitoring, Observability & Operations

### Service Health & Diagnostics

```bash
# Backend health endpoint
curl http://localhost:3001/health

# Full pipeline health with authentication
curl -X POST http://localhost:3001/api/audio/health \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

### Centralized Logging Architecture

| Log Source | Location | Audience | Purpose |
|-----------|----------|----------|----------|
| Docker logs | `docker logs container_id` | Operations | Container lifecycle |
| Application logs | `~/.uriesmooth/logs/app.log` | Developers | Business logic & errors |
| Database logs | PostgreSQL `pg_log/` | DBA | Query performance & integrity |
| Access logs | nginx `access.log` | Security | HTTP request audit trail |

### Observability Stack (Optional)

- **Prometheus**: Time-series metrics collection (CPU, memory, request latency)
- **Grafana**: Real-time dashboard visualization with alerting
- **ELK Stack**: Elasticsearch + Logstash + Kibana for log aggregation & search
- **Jaeger**: Distributed tracing for multi-service debugging

---

## 📚 Additional Resources

### Documentation Files

- [API Reference](docs/API.md) - Comprehensive endpoint documentation
- [VAC Guide](docs/VAC_SETUP.md) - Voice activity detection configuration
- [Voice Training](docs/VOICE_SAMPLE_UPLOAD.md) - Recording & uploading voice samples
- [Real Services](docs/REAL_SERVICE_INTEGRATION.md) - Integrate production APIs
- [Deployment](docs/DEPLOYMENT.md) - Cloud & self-hosted deployment
- [Testing](TESTING.md) - Testing infrastructure & examples

### External Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Electron Guide](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev/)
- [Docker Docs](https://docs.docker.com/)

---

## ❓ Frequently Asked Questions

### General

**Q: Is URIESMOOTH Voice free?**
A: Yes, the source code is MIT licensed. Cloud service costs apply if using production APIs.

**Q: Can I use my own voice model?**
A: Yes, see [docs/VOICE_SAMPLE_UPLOAD.md](docs/VOICE_SAMPLE_UPLOAD.md) for voice training workflow.

**Q: What languages are supported?**
A: Currently Spanish, English, French, German, Portuguese, Italian. Add more in language config.

### Technical

**Q: How do I switch from mock services to real APIs?**
A: Set `MOCK_SERVICES=false` in `.env` and configure API credentials. See [docs/REAL_SERVICE_INTEGRATION.md](docs/REAL_SERVICE_INTEGRATION.md).

**Q: Can I run this without Electron?**
A: Yes, the backend works standalone. Use the API directly with curl, Python, JavaScript, etc.

**Q: How do I backup my database?**
A: See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#part-3-database-management) for automated backup scripts.

---

## 🤝 Contributing

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- **Backend**: Node.js best practices, ESLint, Prettier
- **Frontend**: React conventions, Component-based architecture
- **Documentation**: Markdown, clear examples, runnable code snippets

---

## 📞 Support

- 📧 Email: support@uriesmooth.ai
- 🐛 Issues: [GitHub Issues](https://github.com/uriesmooth/voice/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/uriesmooth/voice/discussions)
- 📖 Docs: [uriesmooth.ai/docs](https://uriesmooth.ai/docs)

---

## 📋 Version History

### v0.1.0 (2026-08-15)
- ✅ Backend ASR→MT→TTS mocked pipeline
- ✅ Electron desktop app with React
- ✅ Consent management system
- ✅ VAC integration & test tool
- ✅ Database schema with migrations
- ✅ Full API documentation
- ✅ Comprehensive testing guide
- ✅ Production deployment guide
- ✅ Real service integration guide

### v0.2.0 (Planning)
- Real ASR/MT/TTS service integration
- User dashboard & analytics
- Voice model marketplace
- Mobile app (React Native)

### v1.0.0 (2026-Q4)
- Production-ready with SLAs
- Enterprise features
- Premium voice models

---

## ⚖️ License & Legal

- **License**: MIT (see [LICENSE](LICENSE))
- **Compliance**: GDPR, CCPA ready
- **Data**: Never sells raw audio; all output is synthesized
- **Terms**: Users responsible for consent & proper use of cloned voices

---

## 🎯 Project Status

**Branch**: `feature/dev-skel-real-time`  
**Status**: 🟡 Development (v0.1.0)  
**Last Updated**: 2026-08-15

✅ **Completed**:
- Full backend with mocked services
- Electron desktop app
- Consent management
- Database schema & migrations
- Comprehensive documentation

→ **Next Phase**:
- Real service integration
- Voice model training pipeline
- Production deployment
- User testing

---

**Questions?** Refer to the relevant documentation above or contact support@uriesmooth.ai

*Generated by URIESMOOTH Documentation System*  
*Last Updated: 2026-08-15*
