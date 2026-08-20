/**
 * Mocked Machine Translation (MT) Service
 * Ready to be replaced with real services (Google Translate, AWS Translate, etc.)
 */

/**
 * Mock MT: Translate Spanish text
 * In production, this would call an actual MT API
 */
export const translateText = async (text, sourceLanguage = 'es', targetLanguage = 'en') => {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 1500 + 300));

  // Mock translations
  const translations = {
    'Hola, este es un mensaje de prueba para la síntesis de voz.': {
      en: 'Hello, this is a test message for voice synthesis.',
      fr: 'Bonjour, ceci est un message de test pour la synthèse vocale.',
    },
    'Mi nombre es Luna y me encanta cantar.': {
      en: 'My name is Luna and I love to sing.',
      fr: 'Je m\'appelle Luna et j\'aime chanter.',
    },
    'La inteligencia artificial está transformando la forma de comunicarnos.': {
      en: 'Artificial intelligence is transforming the way we communicate.',
      fr: 'L\'intelligence artificielle transforme notre façon de communiquer.',
    },
  };

  // If sourceLanguage === targetLanguage, return original
  if (sourceLanguage === targetLanguage) {
    return {
      success: true,
      original_text: text,
      translated_text: text,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      confidence: 1.0,
      processing_time_ms: 100,
      timestamp: new Date().toISOString(),
    };
  }

  // Get translation or return mock
  const translated =
    translations[text]?.[targetLanguage] ||
    `[MOCK TRANSLATION] ${text} (${sourceLanguage} → ${targetLanguage})`;

  return {
    success: true,
    original_text: text,
    translated_text: translated,
    source_language: sourceLanguage,
    target_language: targetLanguage,
    confidence: 0.89 + Math.random() * 0.1,
    processing_time_ms: Math.random() * 1000 + 500,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Batch translation
 */
export const batchTranslate = async (texts, sourceLanguage = 'es', targetLanguage = 'en') => {
  const results = await Promise.all(
    texts.map((text) => translateText(text, sourceLanguage, targetLanguage))
  );

  return {
    success: true,
    count: results.length,
    translations: results,
    source_language: sourceLanguage,
    target_language: targetLanguage,
  };
};

/**
 * Detect language
 */
export const detectLanguage = async (text) => {
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 500 + 100));

  // Simple mock language detection
  const languagePatterns = {
    es: /\b(hola|qué|está|sido|como|para|una|el|la|de|por)\b/i,
    en: /\b(hello|what|is|been|how|for|an|the|of|by)\b/i,
    fr: /\b(bonjour|quoi|est|été|comment|pour|un|le|de|par)\b/i,
  };

  let detectedLanguage = 'es';
  let highestScore = 0;

  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > highestScore) {
      highestScore = matches.length;
      detectedLanguage = lang;
    }
  }

  return {
    success: true,
    text: text.substring(0, 100),
    detected_language: detectedLanguage,
    confidence: 0.75 + Math.random() * 0.2,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Get MT service health
 */
export const getMTHealth = async () => {
  return {
    service: 'Machine Translation',
    status: 'healthy',
    version: '1.0.0-mock',
    supported_languages: ['es', 'en', 'fr', 'de', 'it', 'pt'],
    language_pairs: [
      'es→en',
      'es→fr',
      'en→es',
      'en→fr',
      'fr→es',
      'fr→en',
    ],
    timestamp: new Date().toISOString(),
  };
};

export default {
  translateText,
  batchTranslate,
  detectLanguage,
  getMTHealth,
};
