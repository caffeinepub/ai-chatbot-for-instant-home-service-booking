import type { ConversationState } from '../chat/types';

const STORAGE_KEY = 'servicebot_conversation';
const VERSION = '2.0'; // Bumped version for new fields

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
    
    // Check version compatibility - allow migration from 1.0 to 2.0
    if (parsed.version !== VERSION) {
      if (parsed.version === '1.0') {
        // Migrate from 1.0 to 2.0 by adding new fields
        const migratedState: ConversationState = {
          ...parsed.state,
          activeIntent: null,
          detectedLanguage: undefined,
          targetBookingId: undefined,
          rescheduleTime: undefined,
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
