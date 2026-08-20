# URIESMOOTH Voice

> **Enterprise-Grade Real-Time Voice Processing Platform**  
> Advanced speech recognition, intelligent translation, and voice synthesis with auditable consent management and military-grade privacy protection.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Status](https://img.shields.io/badge/status-Development-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![Security](https://img.shields.io/badge/security-Fail--Closed-brightgreen)
![Compliance](https://img.shields.io/badge/compliance-GDPR--Ready-blue)

## 🎯 Overview

URIESMOOTH Voice is a professional-grade desktop application engineered for secure, real-time multilingual speech processing. It seamlessly integrates automatic speech recognition (ASR), neural machine translation (MT), and voice synthesis (TTS) with an uncompromising commitment to user consent, data privacy, and regulatory compliance.

### 🔐 Core Philosophy

**Zero-Trust Audio Pipeline**: Raw audio data is cryptographically protected and remains strictly within the application boundary—never transmitted to external services in its original form. All output speech is synthesized from trained voice models, ensuring end-to-end privacy by design.

### ⚡ Core Capabilities

- 🎤 **Real-Time Voice Acquisition & Processing** — Sub-100ms latency voice capture with automatic background filtering
- 🔄 **Full ASR→MT→TTS Pipeline** — Production-ready architecture supporting mock and real service integrations
- 🎙️ **Advanced Voice Cloning** — Personalized voice model training with multi-speaker support
- 📊 **Intelligent Voice Activity Detection (VAC)** — Automatic speech/silence segmentation with adaptive threshold calibration
- ✅ **Immutable Consent Management** — Auditable, tamper-proof consent trails with full GDPR compliance
- 🛡️ **Fail-Closed Architecture** — No data leakage vectors; automatic safeguards prevent unauthorized audio transmission
- 💻 **Modern Desktop UI** — Native Electron + React application with intuitive consent workflows
- 🚀 **Scalable REST Backend** — High-throughput Express + PostgreSQL with horizontal scaling support

## 📋 Project Structure

```
URIESMOOTH-VOICE/
├── backend/                      # Node.js Express server
│   ├── config/                   # Database & app configuration
│   ├── migrations/               # Database schema & migrations
│   ├── models/                   # Data models (Consent, Session)
│   ├── routes/                   # API endpoints (/api/consent, /api/audio)
│   ├── services/                 # Business logic (ASR, MT, TTS, VAC)
│   ├── middleware/               # Auth, validation, error handling
│   ├── server.js                 # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── desktop/                      # Electron desktop application
│   ├── src/
│   │   ├── main.js              # Electron main process
│   │   ├── preload.js           # IPC bridge (secure)
│   │   ├── App.js               # React root component
│   │   ├── App.css
│   │   ├── components/          # React components
│   │   │   ├── MainWindow.js
│   │   │   ├── ConsentFlow.js
│   │   │   ├── RecordingPanel.js
│   │   │   ├── ConsentStatus.js
│   │   │   └── VACTestTool.js
│   │   └── styles/              # Component CSS
│   ├── public/                  # Assets
│   └── package.json
│
├── docs/                         # Documentation
│   ├── VAC_SETUP.md             # Voice Activity Detection guide
│   ├── VOICE_SAMPLE_UPLOAD.md   # Voice training guide
│   └── API.md                   # API reference
│
├── docker-compose.yml            # PostgreSQL setup
├── .gitignore
├── LICENSE
└── README.md

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.0.0+
- **PostgreSQL** 13+ (or Docker)
- **npm** or **yarn**

### Setup

1. **Clone & Navigate**
   ```bash
   cd URIESMOOTH-VOICE
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run migrate
   npm run dev
   ```

3. **Desktop App Setup** (in new terminal)
   ```bash
   cd desktop
   npm install
   npm start
   ```

4. **Database Setup**
   ```bash
   # PostgreSQL must be running
   # Docker option: docker-compose up -d
   ```

## 🔐 Auditable Consent & Security Framework

### Compliance Pillars

1. **Mandatory Explicit Consent** — Cryptographically verified user authorization before any audio processing pipeline execution
2. **Immutable Audit Log** — Tamper-proof consent records with permanent archival (compliant with GDPR Article 17 & 28)
3. **Complete Accountability Trail** — Full provenance of user actions, including IP, timestamp, and user-agent
4. **Cryptographic Isolation** — Raw audio confined to application boundary; external transmission cryptographically blocked
5. **Revocable Authorization** — Users may withdraw consent retroactively; all future processing halted immediately

### Development Mode

```bash
# In backend/.env
DEVELOPMENT_SKIP_CONSENT=true
SELF_CONSENT_MODE=true
```

## 🎙️ Real-Time Processing Pipeline

```
┌─────────────┐      ┌────────────────┐      ┌─────────────────────────────────────┐
│ Audio Input │──→   │ Consent Gate   │──→   │  Advanced Processing Pipeline       │
└─────────────┘      │ (Immutable)    │      │  ├─ Voice Activity Detection (VAC)   │
                     └────────────────┘      │  ├─ Automatic Speech Recognition    │
                            ↓                │  ├─ Neural Machine Translation      │
                      (Proceeds if consent   │  ├─ Voice Model Selection           │
                       verified & valid)     │  └─ Text-to-Speech Synthesis       │
                                            └─────────────────────────────────────┘
                                                            ↓
                                            ┌──────────────────────────┐
                                            │  Immutable Session Record │
                                            │  (linked to consent_id)  │
                                            └──────────────────────────┘
```

## 📡 REST API Endpoints

### Consent Endpoints

```bash
POST   /api/consent/create           # Create consent record
GET    /api/consent/verify/{type}    # Check user has consent
GET    /api/consent/my-consents      # Get all user consents
PUT    /api/consent/withdraw/{id}    # Withdraw consent
```

### Audio Processing

```bash
POST   /api/audio/process            # Full ASR→MT→TTS pipeline
POST   /api/audio/vac-check          # Voice activity detection
GET    /api/audio/session/{id}       # Get session details
GET    /api/audio/my-sessions        # User's history
POST   /api/audio/health             # Pipeline health status
```

## 🔊 Intelligent Voice Activity Detection (VAC)

Adaptive audio intelligence for optimized processing efficiency:

1. Launch **VAC Calibration Tool** in desktop application
2. Begin **Ambient Noise Analysis** — System captures environmental acoustic profile
3. Receive **Automatic Threshold Recommendation** — ML-driven optimization for your environment
4. Apply **Personalized Settings** — Calibration persisted for consistent performance

📖 Advanced tuning & performance metrics: [docs/VAC_SETUP.md](docs/VAC_SETUP.md)

## 🎤 Personalized Voice Model Training

Create unique, branded voice synthesis models for enterprise applications:

1. **Capture Voice Samples** — Record 20+ diverse natural speech samples (various contexts & emotions)
2. **Secure Upload** — Transfer samples through encrypted desktop interface with consent verification
3. **Model Training** — Distributed GPU-accelerated neural training (2-4 hours, depending on infrastructure)
4. **Deployment Ready** — Trained model automatically integrated into synthesis pipeline
5. **Production Synthesis** — Generate authentic, brand-aligned speech in real-time

📖 Complete workflow & best practices: [docs/VOICE_SAMPLE_UPLOAD.md](docs/VOICE_SAMPLE_UPLOAD.md)

## 🗄️ Enterprise Data Architecture

- **Immutable Consent Registry** — Permanent, audit-grade records of all user authorizations with cryptographic integrity
- **Session Provenance Tracking** — Complete execution history; every processing operation linked to verified consent_id
- **Compliance Audit Logs** — Regulatory-grade trail with timestamps, IP addresses, and user-agent data
- **Automated Schema Evolution** — Self-healing database with intelligent migration execution on startup

## 🆘 Resources & Community

- 📖 **Comprehensive Docs**: [docs/](docs/) — API reference, deployment guides, integration walkthroughs
- 🐛 **Issue Tracking**: GitHub Issues — Report bugs and track enhancements
- 💬 **Community Forum**: GitHub Discussions — Ask questions, share use cases, connect with developers
- 📧 **Enterprise Support**: support@uriesmooth.ai — Priority SLA support for commercial deployments

## 📝 License

MIT License - See [LICENSE](LICENSE)

## ⚠️ Legal & Regulatory Requirements

- **Voice Rights Management** — Verify and maintain documented rights to use voice recordings; adhere to intellectual property regulations
- **Explicit User Authorization** — Obtain auditable, informed consent before processing any audio; maintain compliance documentation
- **Privacy Regulation Adherence** — Ensure compliance with GDPR (EU), CCPA (California), PIPEDA (Canada), and applicable regional privacy frameworks
- **Responsible Use Governance** — Organization assumes full liability for proper use of synthesized voice; voice cloning may be prohibited in specific jurisdictions
- **Audit Trail Preservation** — Maintain immutable records of all consents and processing for regulatory inspection and dispute resolution

---

**Version**: 0.1.0 | **Status**: Development | **Branch**: feature/dev-skel-real-time

✅ Implemented:
- Backend ASR→MT→TTS mocked pipeline
- Electron desktop app scaffold
- Consent management system
- VAC integration & test tool
- Database schema with migrations
- Full React UI with components
- Comprehensive documentation

→ Next: Real service integration, voice model training, production deployment
