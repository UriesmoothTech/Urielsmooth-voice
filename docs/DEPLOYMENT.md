# Production Deployment Guide

## Overview

This guide covers deploying URIESMOOTH Voice to production environments. Includes:

- Docker containerization
- Cloud deployment (AWS, GCP)
- Database setup & backups
- SSL/TLS configuration
- Monitoring & logging
- Security hardening

---

## Part 1: Docker Setup

### Dockerfile (Backend)

Create `backend/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
```

### Dockerfile (Desktop App - Electron)

Create `desktop/Dockerfile.prod`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build React app
RUN npm run build

# Note: Electron app requires Windows/macOS/Linux distribution
# This builds the web version; for actual binary, use nativea  build system

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml (Production)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: uriesmooth-postgres
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - uriesmooth-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: uriesmooth-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      MOCK_SERVICES: ${MOCK_SERVICES}
      GCP_PROJECT_ID: ${GCP_PROJECT_ID}
      GOOGLE_APPLICATION_CREDENTIALS: ${GOOGLE_APPLICATION_CREDENTIALS}
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3001:3001"
    networks:
      - uriesmooth-network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3001/health']
      interval: 30s
      timeout: 3s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
    volumes:
      - /path/to/credentials.json:/app/credentials.json:ro
      - /audio:/audio

  nginx:
    image: nginx:alpine
    container_name: uriesmooth-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./certbot:/etc/letsencrypt:ro
    depends_on:
      - backend
    networks:
      - uriesmooth-network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local

networks:
  uriesmooth-network:
    driver: bridge
```

### .env.production

```env
# Environment
NODE_ENV=production

# Database
DB_NAME=uriesmooth_voice
DB_USER=voice_app_prod
DB_PASSWORD=generate_strong_password_here
DATABASE_URL=postgresql://voice_app_prod:password@postgres:5432/uriesmooth_voice

# JWT
JWT_SECRET=generate_32_char_random_string_here
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://uriesmooth.ai,https://app.uriesmooth.ai

# Services
MOCK_SERVICES=false
ASR_SERVICE=google_cloud_speech
MT_SERVICE=google_translate
TTS_SERVICE=vits_local
VAC_SERVICE=silero_vad

# Google Cloud
GCP_PROJECT_ID=uriesmooth-voice-prod
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

# Logging
LOG_LEVEL=info
DEBUG_AUDIO_PIPELINE=false

# Security
HELMET_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX=100

# Consent
CONSENT_REQUIRED=true
DEVELOPMENT_SKIP_CONSENT=false
SELF_CONSENT_MODE=false
```

---

## Part 2: Cloud Deployment

### AWS Deployment

#### EC2 Setup

```bash
# 1. Launch EC2 instance
# - Ubuntu 22.04 LTS
# - t3.medium (for production)
# - Security group: Allow 80, 443, 3001

# 2. Connect and setup
ssh -i your-key.pem ubuntu@your-instance-ip

# 3. Update system
sudo apt update && sudo apt upgrade -y

# 4. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ${USER}

# 5. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 6. Clone repository
git clone https://github.com/uriesmooth/voice.git
cd URIESMOOTH-VOICE

# 7. Setup environment
cp .env.example .env.production
nano .env.production  # Edit configuration

# 8. Start services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 9. Setup SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d uriesmooth.ai -d app.uriesmooth.ai
```

#### RDS Setup (Managed PostgreSQL)

```bash
# Create RDS instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier uriesmooth-voice-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username voice_app \
  --master-user-password $(openssl rand -base64 32) \
  --allocated-storage 20 \
  --backup-retention-period 30 \
  --multi-az

# Get endpoint
aws rds describe-db-instances \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

#### S3 Setup (Audio Storage)

```bash
# Create S3 bucket
aws s3 mb s3://uriesmooth-voice-audio --region us-east-1

# Set permissions
aws s3api put-bucket-versioning \
  --bucket uriesmooth-voice-audio \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket uriesmooth-voice-audio \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

### GCP Deployment

#### Cloud Run Setup

```bash
# 1. Configure gcloud
gcloud config set project uriesmooth-voice

# 2. Build Docker image
gcloud builds submit --tag gcr.io/uriesmooth-voice/backend

# 3. Deploy to Cloud Run
gcloud run deploy uriesmooth-backend \
  --image gcr.io/uriesmooth-voice/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 2 \
  --set-env-vars "NODE_ENV=production,DATABASE_URL=postgresql://..." \
  --timeout 3600s

# 4. Setup Cloud SQL
gcloud sql instances create uriesmooth-postgres \
  --database-version POSTGRES_15 \
  --tier db-f1-micro \
  --region us-central1 \
  --backup

# 5. Create database
gcloud sql databases create uriesmooth_voice \
  --instance uriesmooth-postgres

# 6. Setup Cloud Storage for audio
gsutil mb -l us-central1 gs://uriesmooth-voice-audio
gsutil versioning set on gs://uriesmooth-voice-audio
```

#### Load Balancer Setup

```bash
# Create load balancer
gcloud compute load-balancers create uriesmooth-lb \
  --global \
  --enable-cdn \
  --backends INSTANCE_GROUP=backend-ig \
  --backend-protocol HTTP2
```

---

## Part 3: Database Management

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backups"
DB_NAME="uriesmooth_voice"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U voice_app $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz \
  s3://uriesmooth-voice-backups/postgres/

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

### Cron Job

```bash
# Add to crontab -e
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### Recovery Process

```bash
# List backups
aws s3 ls s3://uriesmooth-voice-backups/postgres/

# Download backup
aws s3 cp s3://uriesmooth-voice-backups/postgres/backup_20260815_020000.sql.gz .

# Restore
gunzip backup_20260815_020000.sql.gz
psql -U voice_app uriesmooth_voice < backup_20260815_020000.sql
```

---

## Part 4: SSL/TLS Configuration

### Nginx Configuration

Create `nginx.conf`:

```nginx
upstream backend {
  server backend:3001;
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name uriesmooth.ai www.uriesmooth.ai;
  
  location /.well-known/acme-challenge {
    root /var/www/certbot;
  }
  
  location / {
    return 301 https://$server_name$request_uri;
  }
}

# HTTPS
server {
  listen 443 ssl http2;
  server_name uriesmooth.ai www.uriesmooth.ai;

  # SSL certificates
  ssl_certificate /etc/letsencrypt/live/uriesmooth.ai/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/uriesmooth.ai/privkey.pem;

  # SSL configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  ssl_prefer_server_ciphers on;
  ssl_session_cache shared:SSL:10m;
  ssl_session_timeout 10m;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Proxy settings
  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket support
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
  location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://backend;
  }

  # Gzip compression
  gzip on;
  gzip_vary on;
  gzip_proxied any;
  gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
}
```

### Let's Encrypt Auto-Renewal

```bash
#!/bin/bash
# renew-certs.sh

certbot renew --quiet

# Reload Nginx
docker exec uriesmooth-nginx nginx -s reload
```

Add to crontab:
```bash
0 3 * * * /usr/local/bin/renew-certs.sh >> /var/log/certbot.log 2>&1
```

---

## Part 5: Monitoring & Logging

### Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

### Docker Logging

```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=backend"
```

### Centralized Logging (ELK Stack)

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - "5601:5601"
  depends_on:
    - elasticsearch
```

---

## Part 6: Security Hardening

### Network Security

```bash
# Firewall rules
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 3001/tcp     # Block direct backend access
sudo ufw enable
```

### Application Security

```javascript
// backend/server.js - Security headers
const helmet = require('helmet');
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
  },
}));
```

### Database Security

```sql
-- Restrict user permissions
REVOKE ALL ON DATABASE uriesmooth_voice FROM voice_app;
GRANT CONNECT ON DATABASE uriesmooth_voice TO voice_app;

-- Enable password authentication
ALTER USER voice_app WITH PASSWORD 'strong_password';

-- Enable SSL
ALTER SYSTEM SET ssl = on;
SELECT pg_reload_conf();
```

---

## Part 7: Performance Optimization

### Database Optimization

```sql
-- Create indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Enable autovacuum
ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.01);

-- Connection pooling (PgBouncer)
```

### Caching Strategy

```javascript
// backend/middleware/cache.js
const redis = require('redis');
const client = redis.createClient();

app.use(async (req, res, next) => {
  if (req.method === 'GET') {
    const cacheKey = `${req.path}:${req.user?.id}`;
    const cached = await client.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  }
  next();
});
```

### CDN Configuration

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
  expires 30d;
  add_header Cache-Control "public, immutable";
}
```

---

## Deployment Checklist

- [ ] Database backups configured and tested
- [ ] SSL/TLS certificates installed
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Health checks passing
- [ ] Logging operational
- [ ] Monitoring alerts set up
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Firewall rules configured
- [ ] Automated backups working
- [ ] Disaster recovery plan documented

---

## Troubleshooting

### Container won't start

```bash
docker logs uriesmooth-backend
docker-compose logs -f backend
```

### Database connection issues

```bash
# Test connection
docker exec uriesmooth-backend psql $DATABASE_URL -c "SELECT 1"

# Check network
docker network inspect uriesmooth-network
```

### Certificate renewal failed

```bash
# Manually renew
certbot renew --force-renewal
docker exec uriesmooth-nginx nginx -s reload
```

---

**Last Updated**: 2026-08-15  
**Version**: 1.0.0

Support: support@uriesmooth.ai
