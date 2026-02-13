// Rule-based multilingual intent and language detection
// Supports English, Hindi, and Hinglish without external AI/NLP

export type DetectedLanguage = 'english' | 'hindi' | 'hinglish' | 'mixed';
export type DetectedIntent = 'new-booking' | 'cancellation' | 'inquiry' | 'reschedule' | 'unknown';

export interface IntentDetectionResult {
  intent: DetectedIntent;
  language: DetectedLanguage;
  confidence: 'high' | 'medium' | 'low';
}

// Hindi/Devanagari character detection
function containsHindiScript(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

// Romanized Hindi (Hinglish) keywords
const hindiKeywords = [
  'mujhe', 'hai', 'chahiye', 'karwana', 'karna', 'kar', 'do', 'karo',
  'booking', 'service', 'urgent', 'jaldi', 'abhi', 'turant',
  'cancel', 'status', 'kab', 'kahan', 'kitne', 'time', 'change',
];

function detectLanguage(text: string): DetectedLanguage {
  const lowerText = text.toLowerCase();
  
  // Check for Devanagari script
  if (containsHindiScript(text)) {
    return 'hindi';
  }
  
  // Check for Hinglish keywords
  const hindiKeywordCount = hindiKeywords.filter(kw => lowerText.includes(kw)).length;
  
  if (hindiKeywordCount >= 2) {
    return 'hinglish';
  } else if (hindiKeywordCount === 1) {
    return 'mixed';
  }
  
  return 'english';
}

// Intent detection keywords
const intentPatterns = {
  'new-booking': {
    english: ['book', 'need', 'want', 'schedule', 'service', 'cleaning', 'plumbing', 'electrical', 'hvac', 'handyman', 'help', 'fix', 'repair'],
    hindi: ['बुक', 'चाहिए', 'सर्विस', 'साफ', 'ठीक', 'मरम्मत'],
    hinglish: ['book', 'chahiye', 'karwana', 'karna', 'service', 'clean', 'fix', 'repair'],
  },
  'cancellation': {
    english: ['cancel', 'delete', 'remove', 'stop', 'abort'],
    hindi: ['रद्द', 'कैंसिल', 'बंद'],
    hinglish: ['cancel', 'band', 'khatam', 'nahi chahiye'],
  },
  'inquiry': {
    english: ['status', 'check', 'where', 'when', 'details', 'info', 'information', 'my booking', 'booking id'],
    hindi: ['स्थिति', 'कहाँ', 'कब', 'जानकारी', 'डिटेल'],
    hinglish: ['status', 'kahan', 'kab', 'details', 'info', 'mera booking'],
  },
  'reschedule': {
    english: ['reschedule', 'change time', 'change date', 'postpone', 'move', 'shift', 'different time'],
    hindi: ['समय बदलें', 'तारीख बदलें', 'टाल'],
    hinglish: ['time change', 'date change', 'reschedule', 'badalna', 'shift'],
  },
};

function detectIntent(text: string, language: DetectedLanguage): { intent: DetectedIntent; confidence: 'high' | 'medium' | 'low' } {
  const lowerText = text.toLowerCase();
  
  // Score each intent
  const scores: Record<DetectedIntent, number> = {
    'new-booking': 0,
    'cancellation': 0,
    'inquiry': 0,
    'reschedule': 0,
    'unknown': 0,
  };
  
  // Check cancellation first (highest priority for explicit actions)
  for (const keyword of intentPatterns.cancellation.english) {
    if (lowerText.includes(keyword)) scores.cancellation += 3;
  }
  for (const keyword of intentPatterns.cancellation.hinglish) {
    if (lowerText.includes(keyword)) scores.cancellation += 3;
  }
  
  // Check reschedule
  for (const keyword of intentPatterns.reschedule.english) {
    if (lowerText.includes(keyword)) scores.reschedule += 3;
  }
  for (const keyword of intentPatterns.reschedule.hinglish) {
    if (lowerText.includes(keyword)) scores.reschedule += 3;
  }
  
  // Check inquiry/status
  for (const keyword of intentPatterns.inquiry.english) {
    if (lowerText.includes(keyword)) scores.inquiry += 2;
  }
  for (const keyword of intentPatterns.inquiry.hinglish) {
    if (lowerText.includes(keyword)) scores.inquiry += 2;
  }
  
  // Check new booking (default intent)
  for (const keyword of intentPatterns['new-booking'].english) {
    if (lowerText.includes(keyword)) scores['new-booking'] += 1;
  }
  for (const keyword of intentPatterns['new-booking'].hinglish) {
    if (lowerText.includes(keyword)) scores['new-booking'] += 1;
  }
  
  // Find highest scoring intent
  let maxScore = 0;
  let detectedIntent: DetectedIntent = 'unknown';
  
  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent as DetectedIntent;
    }
  }
  
  // Determine confidence based on score
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (maxScore >= 3) {
    confidence = 'high';
  } else if (maxScore >= 2) {
    confidence = 'medium';
  } else if (maxScore >= 1) {
    confidence = 'low';
  }
  
  // Default to new-booking if no clear intent and text is substantial
  if (detectedIntent === 'unknown' && text.trim().length > 5) {
    detectedIntent = 'new-booking';
    confidence = 'low';
  }
  
  return { intent: detectedIntent, confidence };
}

export function detectIntentAndLanguage(text: string): IntentDetectionResult {
  const language = detectLanguage(text);
  const { intent, confidence } = detectIntent(text, language);
  
  return {
    intent,
    language,
    confidence,
  };
}
