import { query, getOne, getAll } from '../config/database.js';
import crypto from 'crypto';

/**
 * Create a new consent record
 */
export const createConsent = async ({
  userId,
  consentType,
  consentVersion,
  consentText,
  isAccepted,
  recordedAudioPath = null,
  ipAddress,
  userAgent,
  isSelfConsent = false,
}) => {
  const audioHash = recordedAudioPath
    ? crypto.createHash('sha256').update(recordedAudioPath).digest('hex')
    : null;

  const result = await query(
    `INSERT INTO consents (
      user_id, consent_type, consent_version, consent_text, 
      is_accepted, recorded_audio_path, audio_hash, ip_address, 
      user_agent, self_consent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      userId,
      consentType,
      consentVersion,
      consentText,
      isAccepted,
      recordedAudioPath,
      audioHash,
      ipAddress,
      userAgent,
      isSelfConsent,
    ]
  );

  return result.rows[0];
};

/**
 * Get all consents for a user
 */
export const getUserConsents = async (userId) => {
  return getAll(
    `SELECT * FROM consents WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
};

/**
 * Get latest accepted consent of a type for user
 */
export const getLatestAcceptedConsent = async (userId, consentType) => {
  return getOne(
    `SELECT * FROM consents 
     WHERE user_id = $1 AND consent_type = $2 AND is_accepted = true
     ORDER BY created_at DESC LIMIT 1`,
    [userId, consentType]
  );
};

/**
 * Verify user has valid consent before processing
 */
export const verifyConsentExists = async (userId, consentType) => {
  const consent = await getLatestAcceptedConsent(userId, consentType);
  
  if (!consent) {
    throw new Error(
      `No valid ${consentType} consent found for user. Consent must be obtained before processing.`
    );
  }

  return consent;
};

/**
 * Get all consent records (audit)
 */
export const getAllConsents = async (limit = 100, offset = 0) => {
  return getAll(
    `SELECT * FROM consents 
     ORDER BY created_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
};

/**
 * Update consent record (mark as withdrawn, etc.)
 */
export const updateConsentStatus = async (consentId, isAccepted) => {
  const result = await query(
    `UPDATE consents SET is_accepted = $1 WHERE id = $2 RETURNING *`,
    [isAccepted, consentId]
  );

  return result.rows[0];
};

/**
 * Get consent audit trail for user
 */
export const getConsentAuditTrail = async (userId) => {
  return getAll(
    `SELECT 
      id, user_id, consent_type, is_accepted, 
      created_at, self_consent, ip_address
     FROM consents 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [userId]
  );
};
