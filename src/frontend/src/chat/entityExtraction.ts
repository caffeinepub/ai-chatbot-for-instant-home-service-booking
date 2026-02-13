// Rule-based entity extraction for booking information
// Extracts: service category, area, urgency/priority, location, time preference

export interface ExtractedEntities {
  serviceCategory?: string;
  area?: string;
  priority?: 'urgent' | 'high' | 'normal';
  location?: string;
  timePreference?: 'asap' | 'morning' | 'afternoon' | 'evening';
}

export interface EntityExtractionResult {
  entities: ExtractedEntities;
  confidence: 'high' | 'medium' | 'low';
  ambiguous: boolean;
}

// Service category keywords
const serviceCategoryKeywords: Record<string, string[]> = {
  'Cleaning': ['clean', 'cleaning', 'साफ', 'safai', 'saaf', 'deep clean', 'kitchen clean', 'bathroom clean'],
  'Plumbing': ['plumb', 'plumbing', 'pipe', 'leak', 'tap', 'नल', 'पाइप', 'leakage', 'water'],
  'Electrical': ['electric', 'electrical', 'wiring', 'light', 'switch', 'बिजली', 'bijli', 'power', 'socket'],
  'HVAC': ['hvac', 'ac', 'air condition', 'heating', 'cooling', 'एसी', 'ठंडा', 'thanda'],
  'Handyman': ['handyman', 'repair', 'fix', 'मरम्मत', 'marammat', 'ठीक', 'theek'],
};

// Area keywords
const areaKeywords: Record<string, string[]> = {
  'kitchen': ['kitchen', 'रसोई', 'rasoi'],
  'bathroom': ['bathroom', 'bath', 'toilet', 'बाथरूम', 'शौचालय'],
  'bedroom': ['bedroom', 'bed room', 'कमरा', 'kamra'],
  'living room': ['living', 'hall', 'drawing', 'बैठक'],
  'entire house': ['house', 'home', 'full', 'entire', 'पूरा', 'घर', 'ghar'],
};

// Priority/urgency keywords
const priorityKeywords = {
  urgent: ['urgent', 'emergency', 'asap', 'immediately', 'now', 'urgent', 'turant', 'तुरंत', 'jaldi', 'जल्दी', 'abhi', 'अभी'],
  high: ['soon', 'quickly', 'fast', 'जल्द', 'jald'],
  normal: ['normal', 'regular', 'standard'],
};

// Time preference keywords
const timeKeywords = {
  asap: ['asap', 'now', 'immediately', 'urgent', 'abhi', 'अभी', 'turant', 'तुरंत'],
  morning: ['morning', 'सुबह', 'subah', 'am'],
  afternoon: ['afternoon', 'दोपहर', 'dopahar', 'noon', 'pm'],
  evening: ['evening', 'शाम', 'shaam', 'night', 'रात'],
};

function extractServiceCategory(text: string, availableCategories: string[]): { category?: string; confidence: 'high' | 'medium' | 'low' } {
  const lowerText = text.toLowerCase();
  
  const scores: Record<string, number> = {};
  
  for (const category of availableCategories) {
    scores[category] = 0;
    const keywords = serviceCategoryKeywords[category] || [];
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        scores[category] += 1;
      }
    }
  }
  
  let maxScore = 0;
  let detectedCategory: string | undefined;
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }
  
  if (maxScore >= 2) {
    return { category: detectedCategory, confidence: 'high' };
  } else if (maxScore === 1) {
    return { category: detectedCategory, confidence: 'medium' };
  }
  
  return { confidence: 'low' };
}

function extractArea(text: string): string | undefined {
  const lowerText = text.toLowerCase();
  
  for (const [area, keywords] of Object.entries(areaKeywords)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return area;
      }
    }
  }
  
  return undefined;
}

function extractPriority(text: string): 'urgent' | 'high' | 'normal' | undefined {
  const lowerText = text.toLowerCase();
  
  for (const keyword of priorityKeywords.urgent) {
    if (lowerText.includes(keyword)) {
      return 'urgent';
    }
  }
  
  for (const keyword of priorityKeywords.high) {
    if (lowerText.includes(keyword)) {
      return 'high';
    }
  }
  
  return undefined;
}

function extractTimePreference(text: string): 'asap' | 'morning' | 'afternoon' | 'evening' | undefined {
  const lowerText = text.toLowerCase();
  
  for (const keyword of timeKeywords.asap) {
    if (lowerText.includes(keyword)) {
      return 'asap';
    }
  }
  
  for (const keyword of timeKeywords.morning) {
    if (lowerText.includes(keyword)) {
      return 'morning';
    }
  }
  
  for (const keyword of timeKeywords.afternoon) {
    if (lowerText.includes(keyword)) {
      return 'afternoon';
    }
  }
  
  for (const keyword of timeKeywords.evening) {
    if (lowerText.includes(keyword)) {
      return 'evening';
    }
  }
  
  return undefined;
}

function extractLocation(text: string): string | undefined {
  // Simple heuristic: look for location indicators
  const lowerText = text.toLowerCase();
  const locationIndicators = ['at', 'in', 'near', 'address', 'location', 'पता', 'pata'];
  
  for (const indicator of locationIndicators) {
    const index = lowerText.indexOf(indicator);
    if (index !== -1) {
      // Extract text after the indicator (up to 50 chars)
      const afterIndicator = text.substring(index + indicator.length).trim();
      if (afterIndicator.length > 5 && afterIndicator.length < 100) {
        return afterIndicator.split(/[,.\n]/)[0].trim();
      }
    }
  }
  
  return undefined;
}

export function extractEntities(text: string, availableCategories: string[]): EntityExtractionResult {
  const entities: ExtractedEntities = {};
  let totalConfidence = 0;
  let extractionCount = 0;
  
  // Extract service category
  const categoryResult = extractServiceCategory(text, availableCategories);
  if (categoryResult.category) {
    entities.serviceCategory = categoryResult.category;
    totalConfidence += categoryResult.confidence === 'high' ? 3 : categoryResult.confidence === 'medium' ? 2 : 1;
    extractionCount++;
  }
  
  // Extract area
  const area = extractArea(text);
  if (area) {
    entities.area = area;
    totalConfidence += 2;
    extractionCount++;
  }
  
  // Extract priority
  const priority = extractPriority(text);
  if (priority) {
    entities.priority = priority;
    totalConfidence += 3;
    extractionCount++;
  }
  
  // Extract time preference
  const timePreference = extractTimePreference(text);
  if (timePreference) {
    entities.timePreference = timePreference;
    totalConfidence += 2;
    extractionCount++;
  }
  
  // Extract location (lower confidence)
  const location = extractLocation(text);
  if (location) {
    entities.location = location;
    totalConfidence += 1;
    extractionCount++;
  }
  
  // Calculate overall confidence
  const avgConfidence = extractionCount > 0 ? totalConfidence / extractionCount : 0;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  if (avgConfidence >= 2.5) {
    confidence = 'high';
  } else if (avgConfidence >= 1.5) {
    confidence = 'medium';
  }
  
  // Check if ambiguous (multiple possible interpretations)
  const ambiguous = extractionCount > 0 && confidence === 'low';
  
  return {
    entities,
    confidence,
    ambiguous,
  };
}
