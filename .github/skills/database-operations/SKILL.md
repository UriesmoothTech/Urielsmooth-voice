---
name: uriesmooth-database-operations
description: "Use when: creating database migrations, modifying schema, writing database queries, or working with models and data access. Covers migrations, queries, models, and schema changes."
---

# URIESMOOTH Database Operations

> Skill for database schema changes, migrations, queries, and model operations following project patterns

## Quick Start

You are working with the URIESMOOTH Voice PostgreSQL database.

**Key files**:
- Migrations: `backend/migrations/*.js`
- Models: `backend/models/*.js`
- Database config: `backend/config/database.js`
- Schema: Defined in `backend/migrations/001_initial_schema.js`

**Prerequisites**: Understand [AGENTS.md](../../AGENTS.md) sections on "Database Schema", "Database Query Helpers", and "Working with Migrations".

**Current database**: PostgreSQL 13+, running on localhost:5432 (or Docker)

---

## Understanding the Schema

The database has 5 core tables:

### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  voice_profile_id UUID REFERENCES voice_profiles(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### `consents` (Immutable Audit Trail)
```sql
CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) CHECK (consent_type IN ('voice_cloning', 'data_processing', 'model_training')),
  is_accepted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_self_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**CRITICAL**: Never delete. Only update `is_accepted` status.

### `sessions` (Audio Processing Pipeline)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE RESTRICT,  -- Prevents orphaning
  asr_input_text VARCHAR(1000),
  asr_confidence NUMERIC(3,2),
  mt_input_language VARCHAR(5),
  mt_output_language VARCHAR(5),
  mt_translated_text VARCHAR(1000),
  tts_output_audio_path VARCHAR(500),
  is_cloned_audio BOOLEAN DEFAULT false,
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**CRITICAL**: `ON DELETE RESTRICT` on consent prevents deleting consent with linked sessions.

### `voice_samples` (Training Data)
```sql
CREATE TABLE voice_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL REFERENCES consents(id) ON DELETE RESTRICT,  -- Preserves audit
  audio_file_path VARCHAR(500) NOT NULL,
  quality_score NUMERIC(3,2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### `audit_logs` (Append-Only Compliance)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Creating a Migration

**NEVER** edit existing migration files or schema directly. Always create new migrations.

### Step 1: Create Migration File

Create `backend/migrations/002_feature_name.js`:

```javascript
/**
 * Migration: Add feature_field to sessions table
 * Date: August 2026
 * Purpose: Track feature-specific metadata
 * Rollback: If needed, downtime acceptable as table is rebuilt
 */

export const up = `
  -- Add column
  ALTER TABLE sessions 
  ADD COLUMN feature_field VARCHAR(255) DEFAULT NULL;
  
  -- Add index if high-cardinality queries
  CREATE INDEX idx_sessions_feature_field 
  ON sessions(feature_field);
  
  -- Audit log
  INSERT INTO audit_logs (action, details) 
  VALUES ('schema_change', '{"change": "Added feature_field to sessions"}');
`;

export const down = `
  -- Drop index first
  DROP INDEX IF EXISTS idx_sessions_feature_field;
  
  -- Drop column
  ALTER TABLE sessions 
  DROP COLUMN IF EXISTS feature_field;
  
  -- Audit log
  INSERT INTO audit_logs (action, details) 
  VALUES ('schema_rollback', '{"change": "Removed feature_field from sessions"}');
`;
```

### Step 2: Run Migration

```bash
cd backend
npm run migrate
```

**Output should show**:
```
✓ Migration 001_initial_schema.js applied
✓ Migration 002_feature_name.js applied
✓ Database schema updated
```

### Step 3: Verify Schema

```bash
# Connect to PostgreSQL
psql -U voice_app -d uriesmooth_voice -h localhost

# List tables
\dt

# Describe sessions table
\d sessions

# Exit
\q
```

---

## Best Practices for Migrations

### ✅ DO

- Create new migration files for every schema change
- Include descriptive filename: `002_add_feature_name.js`
- Provide both `up` and `down` functions
- Add comments explaining the change and purpose
- Test rollback with `npm run migrate` (modify run.js temporarily)
- Run migrations on a backup database first
- Include audit log entries for compliance

### ❌ DON'T

- Edit existing migration files
- Create multiple schema changes in one migration (break into steps)
- Forget `CONSTRAINT` checks (use `CHECK` for enums)
- Add `NOT NULL` columns without defaults (causes downtime)
- Delete data columns without archiving first
- Forget to add indexes for high-cardinality lookups
- Leave untested rollback procedures

---

## Database Queries & Models

### Import Query Helpers

In `backend/models/Model.js`:

```javascript
import { query, getOne, getAll } from '../config/database.js';

// query(sql, [params])  → Returns raw result (INSERT/UPDATE)
// getOne(sql, [params]) → Returns first row or throws
// getAll(sql, [params]) → Returns array of rows
```

### Pattern: Create with Validation

```javascript
export const createConsent = async ({ userId, consentType, isAccepted, ipAddress, userAgent }) => {
  // Validate enum
  const validTypes = ['voice_cloning', 'data_processing', 'model_training'];
  if (!validTypes.includes(consentType)) {
    throw new Error(`Invalid consent type: ${consentType}`);
  }

  // Parameterized query (prevent SQL injection)
  const result = await query(
    `INSERT INTO consents (user_id, consent_type, is_accepted, ip_address, user_agent) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [userId, consentType, isAccepted, ipAddress, userAgent]
  );

  return result[0];  // query() returns array
};
```

### Pattern: Fetch with Error Handling

```javascript
export const getLatestAcceptedConsent = async (userId, consentType) => {
  const consent = await getOne(
    `SELECT * FROM consents 
     WHERE user_id = $1 AND consent_type = $2 AND is_accepted = true 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId, consentType]
  );

  // getOne() throws if no rows found
  if (!consent) {
    throw new Error(`No accepted consent found for user ${userId}`);
  }

  return consent;
};
```

### Pattern: Update Specific Fields

```javascript
export const updateSessionASR = async (sessionId, { asrInputText, asrConfidence }) => {
  const result = await query(
    `UPDATE sessions 
     SET asr_input_text = $1, asr_confidence = $2, updated_at = now() 
     WHERE id = $3 
     RETURNING *`,
    [asrInputText, asrConfidence, sessionId]
  );

  if (!result[0]) {
    throw new Error(`Session ${sessionId} not found`);
  }

  return result[0];
};
```

### Pattern: List with Pagination

```javascript
export const getUserSessions = async (userId, limit = 50, offset = 0) => {
  const sessions = await getAll(
    `SELECT * FROM sessions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return sessions;  // Returns array (empty if no rows)
};
```

### Pattern: Verify Resource Exists (Assertion)

```javascript
export const verifyConsentExists = async (consentId) => {
  const consent = await getOne(
    'SELECT id FROM consents WHERE id = $1',
    [consentId]
  );

  // Throws if not found (can't proceed)
  if (!consent) {
    throw new Error(`Consent ${consentId} not found - cannot process`);
  }

  return true;
};
```

---

## Common Tasks

### Adding a Column to Existing Table

1. **Create migration** (`backend/migrations/002_add_field.js`):
   ```javascript
   export const up = `
     ALTER TABLE sessions 
     ADD COLUMN IF NOT EXISTS new_field VARCHAR(255) DEFAULT 'default_value';
   `;
   
   export const down = `
     ALTER TABLE sessions 
     DROP COLUMN IF EXISTS new_field;
   `;
   ```

2. **Run migration**:
   ```bash
   npm run migrate
   ```

3. **Update model** if queries need the new field

4. **Update route** if validation needed

### Adding an Index for Performance

```javascript
export const up = `
  -- Create index on high-cardinality column
  CREATE INDEX idx_sessions_consent_id ON sessions(consent_id);
  
  -- Composite index for common WHERE + ORDER queries
  CREATE INDEX idx_sessions_user_created ON sessions(user_id, created_at DESC);
`;

export const down = `
  DROP INDEX IF EXISTS idx_sessions_consent_id;
  DROP INDEX IF EXISTS idx_sessions_user_created;
`;
```

### Removing a Column (Breaking Change)

1. **Migrate first** (add column with default):
   ```bash
   npm run migrate
   ```

2. **Update code** to not write to old column (deploy code)

3. **Next migration** drops column:
   ```javascript
   export const up = `
     ALTER TABLE sessions DROP COLUMN old_field;
   `;
   ```

4. **Run second migration**:
   ```bash
   npm run migrate
   ```

### Adding Foreign Key Constraint

```javascript
export const up = `
  -- Add foreign key from voice_samples to voice_profiles
  ALTER TABLE voice_samples 
  ADD CONSTRAINT fk_voice_samples_profile 
  FOREIGN KEY (voice_profile_id) 
  REFERENCES voice_profiles(id) 
  ON DELETE CASCADE;
`;

export const down = `
  ALTER TABLE voice_samples 
  DROP CONSTRAINT fk_voice_samples_profile;
`;
```

---

## Query Performance Tips

### Use Indexes for WHERE Clauses

```javascript
// Fast: indexed column
export const getSessionsByConsent = async (consentId) => {
  return getAll(
    'SELECT * FROM sessions WHERE consent_id = $1',  // consent_id is indexed
    [consentId]
  );
};

// Slow: unindexed column
export const getSessionsByMetadata = async (metadata) => {
  return getAll(
    'SELECT * FROM sessions WHERE metadata = $1',  // Not indexed
    [metadata]
  );
};
```

### Use LIMIT for Large Tables

```javascript
// Safe
const recentSessions = await getAll(
  'SELECT * FROM sessions ORDER BY created_at DESC LIMIT 100',
  []
);

// Dangerous
const allSessions = await getAll(
  'SELECT * FROM sessions',  // Could return millions of rows
  []
);
```

### Use Parameterized Queries Always

```javascript
// ✅ Safe
const user = await getOne(
  'SELECT * FROM users WHERE email = $1',
  [userEmail]
);

// ❌ Vulnerable to SQL injection
const user = await getOne(
  `SELECT * FROM users WHERE email = '${userEmail}'`,
  []
);
```

---

## Troubleshooting

### Migration Won't Run

```bash
# 1. Check database connection
psql -U voice_app -d uriesmooth_voice -h localhost

# 2. Check migrations table
SELECT * FROM migrations;

# 3. Check logs
npm run migrate -- --verbose
```

### Foreign Key Constraint Violation

```sql
-- Error: Cannot delete consent with linked sessions
-- Solution: Sessions have ON DELETE RESTRICT on consent_id

-- Check orphaned records
SELECT * FROM sessions WHERE consent_id NOT IN (SELECT id FROM consents);

-- Fix: Delete sessions first, then consent
BEGIN;
  DELETE FROM sessions WHERE consent_id = 'consent_id_here';
  DELETE FROM consents WHERE id = 'consent_id_here';
COMMIT;
```

### Duplicate Key Errors

```sql
-- Add UNIQUE constraint
ALTER TABLE users ADD CONSTRAINT uq_email UNIQUE(email);

-- Or use ON CONFLICT
INSERT INTO users (email, password_hash) 
VALUES ($1, $2) 
ON CONFLICT(email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
```

---

## Checklist

Before completing database work:

- ✅ Migration file created with `up` and `down` functions
- ✅ Migration tested locally with `npm run migrate`
- ✅ Schema constraints added (UNIQUE, CHECK, FOREIGN KEY)
- ✅ Indexes added for high-cardinality queries
- ✅ Model method implemented or updated
- ✅ Parameterized queries used (`$1, $2`, etc.) - no string interpolation
- ✅ Error handling checks for null/empty results
- ✅ Audit log entry added if compliance-related
- ✅ All queries tested with sample data
- ✅ Rollback tested if critical migration

---

## Related Documentation

- [AGENTS.md - Database Schema](../../AGENTS.md#database-schema--where-things-live)
- [AGENTS.md - Database Query Helpers](../../AGENTS.md#6-database-query-helpers)
- [AGENTS.md - Working with Migrations](../../AGENTS.md#working-with-migrations)
- [SETUP.md](../../SETUP.md) - Database setup and troubleshooting
- [docs/API.md](../../docs/API.md) - API endpoints with model requirements

