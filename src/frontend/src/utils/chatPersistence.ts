import type { ConversationState } from '../chat/types';

const STORAGE_KEY = 'servicebot_conversation';
const VERSION = '3.0'; // Bumped version for customerName field

interface StoredConversation {
  version: string;
  state: ConversationState;
  timestamp: number;
}

export function saveConversation(state: ConversationState): void {
  try {
    const stored: StoredConversation = {
      version: VERSION,
      state,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.warn('Failed to save conversation:', error);
  }
}

export function loadConversation(): ConversationState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: StoredConversation = JSON.parse(stored);
    
    // Check version compatibility - allow migration from older versions
    if (parsed.version !== VERSION) {
      if (parsed.version === '1.0' || parsed.version === '2.0') {
        // Migrate from older versions by adding new fields
        const migratedState: ConversationState = {
          ...parsed.state,
          activeIntent: parsed.state.activeIntent || null,
          detectedLanguage: parsed.state.detectedLanguage || undefined,
          targetBookingId: parsed.state.targetBookingId || undefined,
          rescheduleTime: parsed.state.rescheduleTime || undefined,
          draft: {
            ...parsed.state.draft,
            customerName: parsed.state.draft?.customerName || undefined,
          },
        };
        return migratedState;
      }
      clearConversation();
      return null;
    }

    // Check if conversation is too old (24 hours)
    const age = Date.now() - parsed.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      clearConversation();
      return null;
    }

    return parsed.state;
  } catch (error) {
    console.warn('Failed to load conversation:', error);
    return null;
  }
}

export function clearConversation(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear conversation:', error);
  }
}
