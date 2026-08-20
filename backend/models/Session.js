import { query, getOne, getAll } from '../config/database.js';
import crypto from 'crypto';

/**
 * Create a new processing session (always linked to consent)
 */
export const createSession = async ({
  userId,
  consentId,
  inputLanguage = 'es',
  outputLanguage = 'es',
}) => {
  const result = await query(
    `INSERT INTO sessions (
      user_id, consent_id, input_language, output_language, status
    ) VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *`,
    [userId, consentId, inputLanguage, outputLanguage]
  );

  return result.rows[0];
};

/**
 * Update session with ASR results
 */
export const updateSessionASR = async (sessionId, asrResult) => {
  const result = await query(
    `UPDATE sessions SET asr_result = $1, status = 'processing' 
     WHERE id = $2 RETURNING *`,
    [asrResult, sessionId]
  );

  return result.rows[0];
};

/**
 * Update session with machine translation results
 */
export const updateSessionMT = async (sessionId, mtResult) => {
  const result = await query(
    `UPDATE sessions SET mt_result = $1 
     WHERE id = $2 RETURNING *`,
    [mtResult, sessionId]
  );

  return result.rows[0];
};

/**
 * Complete session with TTS results
 */
export const completeSession = async ({
  sessionId,
  ttsResult,
  outputAudioPath,
  processingTimeMs,
  qualityMetrics = {},
}) => {
  const outputAudioHash = outputAudioPath
    ? crypto.createHash('sha256').update(outputAudioPath).digest('hex')
    : null;

  const result = await query(
    `UPDATE sessions SET 
      tts_result = $1, 
      output_audio_path = $2,
      output_audio_hash = $3,
      processing_time_ms = $4,
      quality_metrics = $5,
      status = 'completed',
      is_cloned_audio = true
     WHERE id = $6 RETURNING *`,
    [
      ttsResult,
      outputAudioPath,
      outputAudioHash,
      processingTimeMs,
      JSON.stringify(qualityMetrics),
      sessionId,
    ]
  );

  return result.rows[0];
};

/**
 * Fail a session with error message
 */
export const failSession = async (sessionId, errorMessage, inputAudioPath = null) => {
  const inputAudioHash = inputAudioPath
    ? crypto.createHash('sha256').update(inputAudioPath).digest('hex')
    : null;

  const result = await query(
    `UPDATE sessions SET 
      error_message = $1,
      input_audio_path = $2,
      input_audio_hash = $3,
      status = 'failed'
     WHERE id = $4 RETURNING *`,
    [errorMessage, inputAudioPath, inputAudioHash, sessionId]
  );

  return result.rows[0];
};

/**
 * Get session by ID (with consent verification)
 */
export const getSession = async (sessionId, userId = null) => {
  let query_text = 'SELECT * FROM sessions WHERE id = $1';
  const params = [sessionId];

  if (userId) {
    query_text += ' AND user_id = $2';
    params.push(userId);
  }

  return getOne(query_text, params);
};

/**
 * Get all sessions for user
 */
export const getUserSessions = async (userId, limit = 50, offset = 0) => {
  return getAll(
    `SELECT * FROM sessions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
};

/**
 * Get sessions linked to a consent record
 */
export const getSessionsByConsent = async (consentId) => {
  return getAll(
    `SELECT * FROM sessions 
     WHERE consent_id = $1 
     ORDER BY created_at DESC`,
    [consentId]
  );
};

/**
 * Get processing statistics
 */
export const getProcessingStats = async (userId) => {
  const stats = await getOne(
    `SELECT 
      COUNT(*) as total_sessions,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
      AVG(CASE WHEN processing_time_ms IS NOT NULL THEN processing_time_ms END)::INTEGER as avg_processing_ms
     FROM sessions 
     WHERE user_id = $1`,
    [userId]
  );

  return stats;
};
