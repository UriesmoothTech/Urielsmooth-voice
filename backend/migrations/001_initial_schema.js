export const up = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  voice_profile_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Consent records (auditable, immutable)
CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,
  consent_version VARCHAR(10) NOT NULL,
  consent_text TEXT NOT NULL,
  is_accepted BOOLEAN NOT NULL,
  recorded_audio_path VARCHAR(500),
  audio_hash VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  consent_signature VARCHAR(500),
  self_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_consent_type CHECK (consent_type IN ('voice_cloning', 'data_processing', 'model_training'))
);

-- Voice samples (for training and cloning)
CREATE TABLE IF NOT EXISTS voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE RESTRICT,
  file_path VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64) NOT NULL UNIQUE,
  duration_seconds FLOAT,
  sample_rate INTEGER,
  bit_depth INTEGER,
  channels INTEGER,
  quality_score FLOAT,
  transcription TEXT,
  language VARCHAR(10),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (links every interaction to consent)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE RESTRICT,
  input_audio_path VARCHAR(500),
  input_audio_hash VARCHAR(64),
  output_audio_path VARCHAR(500),
  output_audio_hash VARCHAR(64),
  asr_result TEXT,
  mt_result TEXT,
  tts_result TEXT,
  processing_time_ms INTEGER,
  input_language VARCHAR(10),
  output_language VARCHAR(10),
  quality_metrics JSONB,
  error_message TEXT,
  status VARCHAR(50),
  is_cloned_audio BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_consents_user_id ON consents(user_id);
CREATE INDEX idx_consents_created_at ON consents(created_at DESC);
CREATE INDEX idx_consents_is_accepted ON consents(is_accepted);
CREATE INDEX idx_voice_samples_user_id ON voice_samples(user_id);
CREATE INDEX idx_voice_samples_consent_id ON voice_samples(consent_id);
CREATE INDEX idx_voice_samples_file_hash ON voice_samples(file_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_consent_id ON sessions(consent_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_consents_timestamp BEFORE UPDATE ON consents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_voice_samples_timestamp BEFORE UPDATE ON voice_samples
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_sessions_timestamp BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
`;

export const down = `
DROP TRIGGER IF EXISTS update_sessions_timestamp ON sessions;
DROP TRIGGER IF EXISTS update_voice_samples_timestamp ON voice_samples;
DROP TRIGGER IF EXISTS update_consents_timestamp ON consents;
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
DROP FUNCTION IF EXISTS update_timestamp();
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS voice_samples;
DROP TABLE IF EXISTS consents;
DROP TABLE IF EXISTS users;
`;
