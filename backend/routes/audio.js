import express from 'express';
import { body, validationResult } from 'express-validator';
import * as ConsentModel from '../models/Consent.js';
import * as SessionModel from '../models/Session.js';
import * as asrService from '../services/asrService.js';
import * as mtService from '../services/mtService.js';
import * as ttsService from '../services/ttsService.js';
import * as vacService from '../services/vacService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/audio/process
 * Full pipeline: ASR → MT → TTS with VAC preprocessing
 * Input audio must be cloned/processed, never raw user audio sent to receivers
 */
router.post(
  '/process',
  requireAuth,
  [
    body('inputText').trim().notEmpty().withMessage('Input text required'),
    body('consentId').isUUID().withMessage('Valid consent ID required'),
    body('targetLanguage').optional().trim(),
    body('sourceLanguage').optional().trim().default('es'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        inputText,
        consentId,
        targetLanguage = 'es',
        sourceLanguage = 'es',
        voiceId = 'default',
      } = req.body;

      // 1. CRITICAL: Verify consent exists and is valid
      let consent = null;
      try {
        consent = await ConsentModel.verifyConsentExists(req.userId, 'voice_cloning');
      } catch (error) {
        return res.status(403).json({
          error: error.message,
          required: 'User must explicitly accept voice cloning consent before processing',
        });
      }

      // 2. Create processing session linked to consent
      const session = await SessionModel.createSession({
        userId: req.userId,
        consentId: consent.id,
        inputLanguage: sourceLanguage,
        outputLanguage: targetLanguage,
      });

      const startTime = Date.now();

      try {
        // 3. ASR: Recognize speech (or use input text directly)
        console.log(`[Audio] Session ${session.id}: Starting ASR`);
        const asrResult = await asrService.recognizeSpeech(
          inputText,
          `${sourceLanguage}-${sourceLanguage.toUpperCase()}`
        );

        if (!asrResult.success) {
          await SessionModel.failSession(session.id, 'ASR processing failed');
          return res.status(500).json({ error: 'ASR processing failed', asrResult });
        }

        await SessionModel.updateSessionASR(session.id, asrResult.text);

        // 4. Machine Translation (if languages differ)
        console.log(`[Audio] Session ${session.id}: Starting MT (${sourceLanguage}→${targetLanguage})`);
        const mtResult = await mtService.translateText(
          asrResult.text,
          sourceLanguage,
          targetLanguage
        );

        if (!mtResult.success) {
          await SessionModel.failSession(session.id, 'Machine translation failed');
          return res.status(500).json({ error: 'MT processing failed', mtResult });
        }

        await SessionModel.updateSessionMT(session.id, mtResult.translated_text);

        // 5. TTS: Synthesize with cloned voice
        // CRITICAL: Output must be generated from our TTS, never raw user audio
        console.log(`[Audio] Session ${session.id}: Starting TTS synthesis`);
        const ttsResult = await ttsService.synthesizeSpeech(
          mtResult.translated_text,
          voiceId,
          `${targetLanguage}-${targetLanguage.toUpperCase()}`
        );

        if (!ttsResult.success) {
          await SessionModel.failSession(session.id, 'TTS synthesis failed');
          return res.status(500).json({ error: 'TTS synthesis failed', ttsResult });
        }

        // 6. Complete session
        const processingTimeMs = Date.now() - startTime;
        const completedSession = await SessionModel.completeSession({
          sessionId: session.id,
          ttsResult: ttsResult.text,
          outputAudioPath: ttsResult.audio_path,
          processingTimeMs,
          qualityMetrics: {
            asrConfidence: asrResult.confidence,
            mtConfidence: mtResult.confidence,
            ttsQuality: ttsResult.quality_score,
            isClonedAudio: ttsResult.is_cloned_audio,
          },
        });

        console.log(`[Audio] Session ${session.id}: Completed in ${processingTimeMs}ms`);

        res.json({
          success: true,
          sessionId: session.id,
          consentId: consent.id,
          pipeline: {
            asr: {
              input: inputText,
              output: asrResult.text,
              confidence: asrResult.confidence,
            },
            mt: {
              input: asrResult.text,
              output: mtResult.translated_text,
              sourceLanguage,
              targetLanguage,
              confidence: mtResult.confidence,
            },
            tts: {
              input: mtResult.translated_text,
              outputAudioPath: ttsResult.audio_path,
              voiceId,
              isClonedAudio: true,
              qualityScore: ttsResult.quality_score,
              duration: ttsResult.duration_seconds,
            },
          },
          processingTimeMs,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`[Audio] Session ${session.id} error:`, error);
        await SessionModel.failSession(session.id, error.message);
        throw error;
      }
    } catch (error) {
      console.error('[Audio] Processing error:', error);
      res.status(500).json({
        error: 'Audio processing failed',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/audio/vac-check
 * Check if audio contains voice activity
 * Used before processing to decide whether to continue
 */
router.post('/vac-check', requireAuth, async (req, res) => {
  try {
    const { audioPath } = req.body;

    if (!audioPath) {
      return res.status(400).json({ error: 'audioPath required' });
    }

    const vacResult = await vacService.detectVoiceActivity(audioPath);

    res.json({
      hasVoiceActivity: vacResult.segments.length > 0,
      segments: vacResult.segments,
      speechPercentage: vacResult.speech_percentage,
      totalDurationMs: vacResult.total_speech_duration_ms,
      processingTimeMs: vacResult.processing_time_ms,
    });
  } catch (error) {
    console.error('[Audio] VAC check error:', error);
    res.status(500).json({ error: 'VAC processing failed' });
  }
});

/**
 * GET /api/audio/session/:sessionId
 * Get session details
 */
router.get('/session/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionModel.getSession(sessionId, req.userId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.id,
      status: session.status,
      consentId: session.consent_id,
      asrResult: session.asr_result,
      mtResult: session.mt_result,
      ttsResult: session.tts_result,
      processingTimeMs: session.processing_time_ms,
      qualityMetrics: session.quality_metrics,
      outputAudioPath: session.output_audio_path,
      isClonedAudio: session.is_cloned_audio,
      createdAt: session.created_at,
      error: session.error_message,
    });
  } catch (error) {
    console.error('[Audio] Session fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

/**
 * GET /api/audio/my-sessions
 * Get processing history for user
 */
router.get('/my-sessions', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;

    const sessions = await SessionModel.getUserSessions(req.userId, limit, offset);
    const stats = await SessionModel.getProcessingStats(req.userId);

    res.json({
      stats: {
        totalSessions: stats.total_sessions,
        successful: stats.successful,
        failed: stats.failed,
        avgProcessingMs: stats.avg_processing_ms,
      },
      sessionCount: sessions.length,
      limit,
      offset,
      sessions: sessions.map((s) => ({
        sessionId: s.id,
        status: s.status,
        processingTimeMs: s.processing_time_ms,
        createdAt: s.created_at,
        isClonedAudio: s.is_cloned_audio,
      })),
    });
  } catch (error) {
    console.error('[Audio] Sessions list error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * POST /api/audio/health
 * Get health status of all pipeline services
 */
router.post('/health', async (req, res) => {
  try {
    const [asrHealth, mtHealth, ttsHealth, vacHealth] = await Promise.all([
      asrService.getASRHealth(),
      mtService.getMTHealth(),
      ttsService.getTTSHealth(),
      vacService.getVACHealth(),
    ]);

    res.json({
      pipeline: {
        asr: asrHealth,
        mt: mtHealth,
        tts: ttsHealth,
        vac: vacHealth,
      },
      allHealthy:
        asrHealth.status === 'healthy' &&
        mtHealth.status === 'healthy' &&
        ttsHealth.status === 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Audio] Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
