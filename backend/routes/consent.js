import express from 'express';
import { body, validationResult } from 'express-validator';
import * as ConsentModel from '../models/Consent.js';
import * as SessionModel from '../models/Session.js';
import { getClientIp, requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/consent/create
 * Create a new consent record
 * Requires: user authentication
 */
router.post(
  '/create',
  requireAuth,
  [
    body('consentType')
      .isIn(['voice_cloning', 'data_processing', 'model_training'])
      .withMessage('Invalid consent type'),
    body('consentVersion').trim().notEmpty(),
    body('consentText').trim().notEmpty(),
    body('isAccepted').isBoolean(),
    body('recordedAudioPath').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        consentType,
        consentVersion,
        consentText,
        isAccepted,
        recordedAudioPath,
        isSelfConsent = false,
      } = req.body;

      // In production: NEVER skip consent for real cloning/processing
      if (!isAccepted && !process.env.DEVELOPMENT_SKIP_CONSENT) {
        return res.status(400).json({
          error: 'Consent must be accepted before proceeding',
          consentType,
        });
      }

      const consent = await ConsentModel.createConsent({
        userId: req.userId,
        consentType,
        consentVersion,
        consentText,
        isAccepted,
        recordedAudioPath,
        ipAddress: getClientIp(req),
        userAgent: req.get('User-Agent'),
        isSelfConsent,
      });

      res.status(201).json({
        message: 'Consent record created successfully',
        consentId: consent.id,
        consentType: consent.consent_type,
        isAccepted: consent.is_accepted,
        createdAt: consent.created_at,
      });
    } catch (error) {
      console.error('[Consent] Creation error:', error);
      res.status(500).json({ error: 'Failed to create consent record' });
    }
  }
);

/**
 * GET /api/consent/verify/:consentType
 * Verify user has valid consent of specified type
 * Requires: user authentication
 */
router.get('/verify/:consentType', requireAuth, async (req, res) => {
  try {
    const { consentType } = req.params;

    const validTypes = ['voice_cloning', 'data_processing', 'model_training'];
    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: 'Invalid consent type' });
    }

    const consent = await ConsentModel.getLatestAcceptedConsent(req.userId, consentType);

    if (!consent) {
      return res.status(403).json({
        error: `No valid ${consentType} consent found`,
        consentType,
        message: 'Please accept the consent form before proceeding',
      });
    }

    res.json({
      consentId: consent.id,
      consentType: consent.consent_type,
      isAccepted: consent.is_accepted,
      acceptedAt: consent.created_at,
      isSelfConsent: consent.self_consent,
    });
  } catch (error) {
    console.error('[Consent] Verification error:', error);
    res.status(500).json({ error: 'Failed to verify consent' });
  }
});

/**
 * GET /api/consent/my-consents
 * Get all consent records for logged-in user
 * Requires: user authentication
 */
router.get('/my-consents', requireAuth, async (req, res) => {
  try {
    const consents = await ConsentModel.getUserConsents(req.userId);

    res.json({
      consentCount: consents.length,
      consents: consents.map((c) => ({
        id: c.id,
        type: c.consent_type,
        isAccepted: c.is_accepted,
        version: c.consent_version,
        createdAt: c.created_at,
        isSelfConsent: c.self_consent,
      })),
    });
  } catch (error) {
    console.error('[Consent] Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch consent records' });
  }
});

/**
 * GET /api/consent/audit-trail
 * Get audit trail of user's consent history
 * Requires: user authentication
 */
router.get('/audit-trail', requireAuth, async (req, res) => {
  try {
    const auditTrail = await ConsentModel.getConsentAuditTrail(req.userId);

    res.json({
      auditCount: auditTrail.length,
      auditTrail: auditTrail.map((record) => ({
        consentId: record.id,
        type: record.consent_type,
        accepted: record.is_accepted,
        timestamp: record.created_at,
        selfConsent: record.self_consent,
        ipAddress: record.ip_address,
      })),
    });
  } catch (error) {
    console.error('[Consent] Audit trail error:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

/**
 * POST /api/consent/self-consent
 * Quick self-consent flow for development
 * ONLY works when DEVELOPMENT_SKIP_CONSENT=true
 */
router.post('/self-consent', requireAuth, async (req, res) => {
  if (process.env.DEVELOPMENT_SKIP_CONSENT !== 'true') {
    return res.status(403).json({
      error: 'Self-consent mode is not enabled in this environment',
      environment: process.env.NODE_ENV,
    });
  }

  try {
    const { consentType = 'voice_cloning' } = req.body;

    const consent = await ConsentModel.createConsent({
      userId: req.userId,
      consentType,
      consentVersion: '1.0',
      consentText: `Auto-filled self-consent for ${consentType} (development only)`,
      isAccepted: true,
      recordedAudioPath: null,
      ipAddress: getClientIp(req),
      userAgent: req.get('User-Agent'),
      isSelfConsent: true,
    });

    res.status(201).json({
      message: 'Self-consent record created (DEVELOPMENT MODE ONLY)',
      consentId: consent.id,
      warning: 'This is for development only. Production use requires explicit user consent.',
      consentType: consent.consent_type,
      createdAt: consent.created_at,
    });
  } catch (error) {
    console.error('[Consent] Self-consent error:', error);
    res.status(500).json({ error: 'Failed to create self-consent record' });
  }
});

/**
 * GET /api/consent/sessions/:consentId
 * Get all sessions linked to a consent record
 * Requires: user authentication
 */
router.get('/sessions/:consentId', requireAuth, async (req, res) => {
  try {
    const { consentId } = req.params;

    // Verify consent belongs to user
    const consent = await ConsentModel.getLatestAcceptedConsent(req.userId, 'voice_cloning');
    if (!consent) {
      return res.status(403).json({ error: 'Consent not found or does not belong to you' });
    }

    const sessions = await SessionModel.getSessionsByConsent(consentId);

    res.json({
      consentId,
      sessionCount: sessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.id,
        status: s.status,
        processingTimeMs: s.processing_time_ms,
        createdAt: s.created_at,
        isClonedAudio: s.is_cloned_audio,
      })),
    });
  } catch (error) {
    console.error('[Consent] Sessions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions for consent' });
  }
});

/**
 * PUT /api/consent/withdraw/:consentId
 * Withdraw a consent (set is_accepted = false)
 * Requires: user authentication
 */
router.put('/withdraw/:consentId', requireAuth, async (req, res) => {
  try {
    const { consentId } = req.params;

    // Update consent to withdrawn state
    const updated = await ConsentModel.updateConsentStatus(consentId, false);

    if (!updated) {
      return res.status(404).json({ error: 'Consent record not found' });
    }

    res.json({
      message: 'Consent withdrawn successfully',
      consentId: updated.id,
      isAccepted: updated.is_accepted,
      withdrawnAt: updated.updated_at,
    });
  } catch (error) {
    console.error('[Consent] Withdrawal error:', error);
    res.status(500).json({ error: 'Failed to withdraw consent' });
  }
});

export default router;
