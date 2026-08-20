---
name: uriesmooth-backend-routes
description: "Use when: creating a new Express route, adding an endpoint to the backend API, or modifying existing routes. Includes validation patterns, auth middleware, error handling, and testing."
---

# URIESMOOTH Backend Route Development

> Skill for creating, modifying, or debugging Express.js routes following project patterns

## Quick Start

You are building routes for the URIESMOOTH Voice backend (Express.js).

**Key files**:
- Route definitions: `backend/routes/*.js`
- Models: `backend/models/*.js`
- Middleware: `backend/middleware/auth.js`
- Tests: `backend/tests/routes/*.test.js`

**Prerequisites**: Understand [AGENTS.md](../../AGENTS.md) sections on "Backend Route Pattern" and "Key Patterns".

---

## Creating a New Route

### Step 1: Plan the Endpoint

Define:
- **Method**: POST (create), GET (read), PUT (update), DELETE (delete)
- **Path**: `/api/<resource>/<action>`
- **Auth**: requireAuth or optionalAuth?
- **Input validation**: body, query, or param fields?
- **Success response**: HTTP status + JSON structure
- **Errors**: What can go wrong? (400, 401, 404, 500)

### Step 2: Create Route File

Create `backend/routes/<feature>.js`:

```javascript
import express from 'express';
import { body, validationResult } from 'express-validator';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import * as Model from '../models/Model.js';

const router = express.Router();

/**
 * POST /api/<resource>/<action>
 * Description: What this does
 * Auth: requireAuth
 * Returns: { message, data }
 */
router.post('/<action>',
  requireAuth,                          // Auth middleware
  [
    body('field1').notEmpty().withMessage('field1 is required'),
    body('field2').isIn(['option1', 'option2']).withMessage('Invalid field2')
  ],
  async (req, res) => {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    
    try {
      // Extract user context from JWT
      const userId = req.userId;           // From requireAuth middleware
      const ipAddress = req.ip;           // For audit trail
      const userAgent = req.get('User-Agent');
      
      // Call model operation
      const result = await Model.operation({
        userId,
        field1: req.body.field1,
        field2: req.body.field2,
        ipAddress,
        userAgent
      });
      
      // Success response
      res.status(201).json({
        message: 'Operation successful',
        data: result
      });
    } catch (error) {
      // Error logging with module prefix
      console.error('[Feature] Operation failed:', error);
      
      // Respond with user-safe message
      res.status(500).json({
        error: 'Failed to complete operation'
      });
    }
  }
);

export default router;
```

### Step 3: Add to Server

In `backend/server.js`:

```javascript
import featureRoutes from './routes/feature.js';
import consentRoutes from './routes/consent.js';

// Mount routes
app.use('/api/feature', featureRoutes);
app.use('/api/consent', consentRoutes);
```

### Step 4: Implement Model Method

In `backend/models/Model.js`:

```javascript
import { query, getOne } from '../config/database.js';

/**
 * Create resource with audit trail
 */
export const operation = async ({ userId, field1, field2, ipAddress, userAgent }) => {
  // Validate business logic
  if (!userId) throw new Error('User ID required');
  
  // Parameterized query (prevent SQL injection)
  const result = await query(
    'INSERT INTO resources (user_id, field1, field2, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, field1, field2, ipAddress, userAgent]
  );
  
  return result;
};

/**
 * Retrieve resource with error if not found
 */
export const getResource = async (resourceId) => {
  const resource = await getOne(
    'SELECT * FROM resources WHERE id = $1',
    [resourceId]
  );
  
  // Always check for null
  if (!resource) throw new Error(`Resource ${resourceId} not found`);
  
  return resource;
};
```

### Step 5: Write Tests

Create `backend/tests/routes/feature.test.js`:

```javascript
import request from 'supertest';
import app from '../../server.js';
import * as Model from '../../models/Model.js';

jest.mock('../../models/Model.js');

describe('POST /api/feature/action', () => {
  it('should create resource with valid input', async () => {
    const mockToken = 'valid_jwt_token';
    Model.operation.mockResolvedValue({
      id: 'resource_123',
      field1: 'value1',
      field2: 'option1'
    });

    const response = await request(app)
      .post('/api/feature/action')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        field1: 'value1',
        field2: 'option1'
      });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe('resource_123');
  });

  it('should return 400 for missing field1', async () => {
    const mockToken = 'valid_jwt_token';

    const response = await request(app)
      .post('/api/feature/action')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        field2: 'option1'
        // Missing field1
      });

    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });

  it('should return 401 without auth token', async () => {
    const response = await request(app)
      .post('/api/feature/action')
      .send({
        field1: 'value1',
        field2: 'option1'
      });

    expect(response.status).toBe(401);
  });
});
```

### Step 6: Test Locally

```bash
cd backend
npm run dev                    # Terminal 1: Start server

# Terminal 2: Test endpoint
curl -X POST http://localhost:3001/api/feature/action \
  -H "Authorization: Bearer <valid_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"field1":"value1","field2":"option1"}'
```

---

## Common Route Patterns

### 1. Create with Audit Trail

```javascript
router.post('/create',
  requireAuth,
  [body('consentType').isIn(['voice_cloning', 'data_processing', 'model_training'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const result = await Model.create({
        userId: req.userId,
        consentType: req.body.consentType,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(201).json({ message: 'Created', data: result });
    } catch (error) {
      console.error('[Module] Create failed:', error);
      res.status(500).json({ error: 'Failed to create' });
    }
  }
);
```

### 2. Fetch with Authorization Check

```javascript
router.get('/:resourceId',
  requireAuth,
  async (req, res) => {
    try {
      const resource = await Model.getResource(req.params.resourceId);
      
      // Check ownership
      if (resource.user_id !== req.userId)
        return res.status(403).json({ error: 'Not authorized' });
      
      res.json({ data: resource });
    } catch (error) {
      console.error('[Module] Fetch failed:', error);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  }
);
```

### 3. Process with Fail-Safe Guards

```javascript
router.post('/process',
  requireAuth,
  [body('consentId').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      // Step 1: Verify consent
      const consent = await ConsentModel.verifyConsentExists(req.body.consentId);
      
      // Step 2: Create session
      const session = await SessionModel.createSession({
        consentId: req.body.consentId,
        userId: req.userId
      });
      
      // Step 3: Process (with validation at each step)
      const asrResult = await ASRService.recognize(req.body.audioPath);
      if (!asrResult.success) throw new Error('ASR failed');
      
      const mtResult = await MTService.translate(asrResult.text);
      if (!mtResult.success) throw new Error('MT failed');
      
      const ttsResult = await TTSService.synthesize(mtResult.translation);
      if (!ttsResult.success) throw new Error('TTS failed');
      
      // Step 4: Complete session with output marked as cloned
      const completedSession = await SessionModel.completeSession({
        sessionId: session.id,
        outputAudioPath: ttsResult.audio_path,
        isClonedAudio: true  // CRITICAL
      });
      
      res.json({
        message: 'Processing complete',
        data: completedSession
      });
    } catch (error) {
      console.error('[Processing] Pipeline failed:', error);
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);
```

---

## Checklist

Before marking a route as complete:

- ✅ Route file created in `backend/routes/<feature>.js`
- ✅ Handler validates input with express-validator
- ✅ Handler checks errors and returns 400 if invalid
- ✅ Handler uses requireAuth or optionalAuth
- ✅ All database queries use parameterized statements (`$1, $2`, etc.)
- ✅ Error logging includes module prefix: `[Module]`
- ✅ Response JSON has `message` (create/update) or `data` (read)
- ✅ Route mounted in `backend/server.js`
- ✅ Model method implemented if needed
- ✅ Unit tests written in `backend/tests/routes/<feature>.test.js`
- ✅ Local test successful with curl/Postman
- ✅ If processing audio: output marked `isClonedAudio: true`
- ✅ If requires consent: consent verified before processing

---

## Related Documentation

- [AGENTS.md - Backend Route Pattern](../../AGENTS.md#2-backend-route-pattern)
- [AGENTS.md - Authentication](../../AGENTS.md#5-authentication--authorization)
- [docs/API.md](../../docs/API.md) - API reference
- [TESTING.md](../../TESTING.md) - Test setup details

