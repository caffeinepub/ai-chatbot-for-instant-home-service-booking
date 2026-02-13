export type MessageRole = 'user' | 'bot' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  quickReplies?: string[];
}

export type ConversationStep =
  | 'welcome'
  | 'service-selection'
  | 'address'
  | 'time-window'
  | 'contact-info'
  | 'notes'
  | 'confirmation'
  | 'complete'
  // Non-booking intent steps
  | 'collect-booking-id'
  | 'collect-reschedule-time'
  | 'execute-action'
  | 'show-result';

export type ActiveIntent = 'new-booking' | 'cancellation' | 'inquiry' | 'reschedule' | null;

export interface BookingDraft {
  serviceCategory?: string;
  address?: string;
  timeWindow?: {
    start: bigint;
    end: bigint;
  };
  contactInfo?: string;
  notes?: string;
  // Extracted entities
  area?: string;
  priority?: 'urgent' | 'high' | 'normal';
  timePreference?: 'asap' | 'morning' | 'afternoon' | 'evening';
  location?: string;
}

export interface ConversationState {
  step: ConversationStep;
  draft: BookingDraft;
  messages: ChatMessage[];
  // Intent tracking
  activeIntent: ActiveIntent;
  detectedLanguage?: 'english' | 'hindi' | 'hinglish' | 'mixed';
  // Non-booking flow state
  targetBookingId?: bigint;
  rescheduleTime?: string;
}
