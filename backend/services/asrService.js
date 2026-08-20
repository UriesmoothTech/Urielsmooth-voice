/**
 * Mocked Automatic Speech Recognition (ASR) Service
 * Ready to be replaced with real services (Google Cloud Speech-to-Text, AWS Transcribe, etc.)
 */

/**
 * Mock ASR: Convert Spanish audio to text
 * In production, this would call an actual ASR API
 */
export const recognizeSpeech = async (audioPath, language = 'es-ES') => {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 2000 + 500));

  // Mock results based on language
  const mockResults = {
    'es-ES': 'Hola, este es un mensaje de prueba para la síntesis de voz.',
    'es-MX': 'Buenas días, estoy probando el sistema de reconocimiento de voz.',
    'es-AR': 'Che, mirá este mensaje de prueba en el sistema.',
    'en-US': 'Hello, this is a test message for voice synthesis.',
    'en-GB': 'Good morning, I am testing the voice recognition system.',
  };

  const result = mockResults[language] || mockResults['es-ES'];

  return {
    success: true,
    text: result,
    language,
    confidence: 0.87 + Math.random() * 0.1,
    duration_seconds: Math.random() * 10 + 2,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Mock ASR with audio file (would be called with actual uploaded file)
 */
export const recognizeSpeechFromFile = async (filePath, language = 'es-ES') => {
  try {
    // In real implementation, this would:
    // 1. Verify file hash against database
    // 2. Stream file to ASR API
    // 3. Return structured result

    const mockResponses = [
      {
        text: 'Mi nombre es Luna y me encanta cantar.',
        confidence: 0.92,
      },
      {
        text: 'Este es un sistema de síntesis de voz en tiempo real.',
        confidence: 0.88,
      },
      {
        text: 'La inteligencia artificial está transformando la forma de comunicarnos.',
        confidence: 0.91,
      },
    ];

    const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3000 + 1000));

    return {
      success: true,
      text: response.text,
      language,
      confidence: response.confidence,
      duration_seconds: 8,
      processing_time_ms: Math.random() * 2000 + 1000,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Batch ASR (for processing multiple samples)
 */
export const batchRecognizeSpeech = async (filePaths, language = 'es-ES') => {
  const results = await Promise.all(
    filePaths.map((path) => recognizeSpeechFromFile(path, language))
  );

  return results;
};

/**
 * Get ASR service health
 */
export const getASRHealth = async () => {
  return {
    service: 'ASR',
    status: 'healthy',
    version: '1.0.0-mock',
    supported_languages: ['es-ES', 'es-MX', 'es-AR', 'en-US', 'en-GB'],
    timestamp: new Date().toISOString(),
  };
};

export default {
  recognizeSpeech,
  recognizeSpeechFromFile,
  batchRecognizeSpeech,
  getASRHealth,
};
