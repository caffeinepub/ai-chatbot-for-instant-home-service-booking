import type { ConversationState, ChatMessage, ConversationStep, BookingDraft, ActiveIntent } from './types';
import { validateAddress, validateContactInfo, validateTimeWindow, validateBookingId } from './validators';
import { detectIntentAndLanguage } from './intentDetection';
import { extractEntities } from './entityExtraction';

export function createInitialState(): ConversationState {
  return {
    step: 'welcome',
    draft: {},
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: "👋 Hi! I'm ServiceBot, your home service booking assistant. I can help you book services, check booking status, cancel, or reschedule. Just tell me what you need in English, Hindi, or Hinglish!",
        timestamp: Date.now(),
      },
    ],
    activeIntent: null,
  };
}

export function processUserInput(
  state: ConversationState,
  userInput: string,
  serviceCategories: string[]
): ConversationState {
  const trimmedInput = userInput.trim().toLowerCase();

  // Handle special commands (work across all intents)
  if (trimmedInput === 'restart' || trimmedInput === 'reset' || trimmedInput === 'start over') {
    return createInitialState();
  }

  if (trimmedInput === 'help') {
    return addBotMessage(state, "I can help you:\n• Book a new service\n• Check booking status\n• Cancel a booking\n• Reschedule a booking\n\nJust tell me what you need! Type 'restart' anytime to start over.");
  }

  // Add user message
  const newState = addUserMessage(state, userInput);

  // Detect intent and language on first user message or when no active intent
  if (state.step === 'welcome' || state.activeIntent === null) {
    const detection = detectIntentAndLanguage(userInput);
    
    // Extract entities for new booking intent
    if (detection.intent === 'new-booking') {
      const extraction = extractEntities(userInput, serviceCategories);
      
      // Apply extracted entities to draft
      const updatedDraft: BookingDraft = {
        ...newState.draft,
        ...extraction.entities,
      };
      
      // If service category extracted with high confidence, use it
      if (extraction.entities.serviceCategory && extraction.confidence === 'high') {
        updatedDraft.serviceCategory = extraction.entities.serviceCategory;
      }
      
      // If location extracted, use as address
      if (extraction.entities.location) {
        updatedDraft.address = extraction.entities.location;
      }
      
      const stateWithEntities: ConversationState = {
        ...newState,
        draft: updatedDraft,
        activeIntent: 'new-booking',
        detectedLanguage: detection.language,
      };
      
      return transitionToServiceSelection(stateWithEntities, serviceCategories, extraction.entities.serviceCategory);
    } else if (detection.intent === 'cancellation') {
      return {
        ...newState,
        activeIntent: 'cancellation',
        detectedLanguage: detection.language,
        step: 'collect-booking-id',
        messages: [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'I can help you cancel your booking. Please provide your booking ID (e.g., BK10245 or 10245):',
            timestamp: Date.now(),
          },
        ],
      };
    } else if (detection.intent === 'inquiry') {
      return {
        ...newState,
        activeIntent: 'inquiry',
        detectedLanguage: detection.language,
        step: 'collect-booking-id',
        messages: [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'I can check your booking status. Please provide your booking ID (e.g., BK10245 or 10245):',
            timestamp: Date.now(),
          },
        ],
      };
    } else if (detection.intent === 'reschedule') {
      return {
        ...newState,
        activeIntent: 'reschedule',
        detectedLanguage: detection.language,
        step: 'collect-booking-id',
        messages: [
          ...newState.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'I can help you reschedule your booking. Please provide your booking ID (e.g., BK10245 or 10245):',
            timestamp: Date.now(),
          },
        ],
      };
    } else {
      // Unknown intent, default to new booking
      return transitionToServiceSelection(
        { ...newState, activeIntent: 'new-booking', detectedLanguage: detection.language },
        serviceCategories
      );
    }
  }

  // Route based on active intent and step
  if (state.activeIntent === 'new-booking') {
    return handleNewBookingFlow(newState, userInput, serviceCategories);
  } else if (state.activeIntent === 'cancellation' || state.activeIntent === 'inquiry' || state.activeIntent === 'reschedule') {
    return handleNonBookingFlow(newState, userInput);
  }

  return newState;
}

function handleNewBookingFlow(state: ConversationState, input: string, serviceCategories: string[]): ConversationState {
  switch (state.step) {
    case 'service-selection':
      return handleServiceSelection(state, input, serviceCategories);
    case 'customer-name':
      return handleCustomerName(state, input);
    case 'address':
      return handleAddress(state, input);
    case 'time-window':
      return handleTimeWindow(state, input);
    case 'contact-info':
      return handleContactInfo(state, input);
    case 'notes':
      return handleNotes(state, input);
    default:
      return state;
  }
}

function handleNonBookingFlow(state: ConversationState, input: string): ConversationState {
  if (state.step === 'collect-booking-id') {
    const validation = validateBookingId(input);
    
    if (!validation.valid) {
      return addBotMessage(state, validation.error || 'Invalid booking ID. Please try again.');
    }
    
    if (state.activeIntent === 'reschedule') {
      return {
        ...state,
        step: 'collect-reschedule-time',
        targetBookingId: validation.parsed,
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'When would you like to reschedule to?',
            timestamp: Date.now(),
            quickReplies: ['Morning', 'Afternoon', 'Evening'],
          },
        ],
      };
    } else {
      // For cancellation and inquiry, move to execute-action
      return {
        ...state,
        step: 'execute-action',
        targetBookingId: validation.parsed,
      };
    }
  } else if (state.step === 'collect-reschedule-time') {
    const validation = validateTimeWindow(input);
    
    if (!validation.valid) {
      return addBotMessage(state, validation.error || 'Invalid time window. Please choose morning, afternoon, or evening.', ['Morning', 'Afternoon', 'Evening']);
    }
    
    return {
      ...state,
      step: 'execute-action',
      rescheduleTime: input.trim().toLowerCase(),
      draft: {
        ...state.draft,
        timeWindow: validation.parsed,
      },
    };
  }
  
  return state;
}

function transitionToServiceSelection(state: ConversationState, serviceCategories: string[], preselectedCategory?: string): ConversationState {
  if (preselectedCategory) {
    // Service category already extracted, confirm and move to customer name
    return {
      ...state,
      step: 'customer-name',
      draft: { ...state.draft, serviceCategory: preselectedCategory },
      messages: [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          content: `Great! I detected you need ${preselectedCategory} service. May I have your name? (You can type "Skip" if you prefer not to share)`,
          timestamp: Date.now(),
          quickReplies: ['Skip'],
        },
      ],
    };
  }
  
  return {
    ...state,
    step: 'service-selection',
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: 'What type of service do you need?',
        timestamp: Date.now(),
        quickReplies: serviceCategories,
      },
    ],
  };
}

function handleServiceSelection(state: ConversationState, input: string, serviceCategories: string[]): ConversationState {
  const selectedService = serviceCategories.find(
    (cat) => cat.toLowerCase() === input.trim().toLowerCase()
  );

  if (!selectedService) {
    return addBotMessage(
      state,
      `I don't recognize that service. Please choose from: ${serviceCategories.join(', ')}.`,
      serviceCategories
    );
  }

  return {
    ...state,
    step: 'customer-name',
    draft: { ...state.draft, serviceCategory: selectedService },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: `Great! You've selected ${selectedService}. May I have your name? (You can type "Skip" if you prefer not to share)`,
        timestamp: Date.now(),
        quickReplies: ['Skip'],
      },
    ],
  };
}

function handleCustomerName(state: ConversationState, input: string): ConversationState {
  const trimmedInput = input.trim();
  const isSkip = trimmedInput.toLowerCase() === 'skip';
  
  // Store name if provided, otherwise leave undefined
  const customerName = isSkip ? undefined : trimmedInput;
  
  // Check if address already extracted
  const nextMessage = state.draft.address
    ? `${isSkip ? 'No problem!' : `Nice to meet you, ${customerName}!`} I have your address as: ${state.draft.address}. Is this correct? (yes/no)`
    : `${isSkip ? 'No problem!' : `Nice to meet you, ${customerName}!`} What's the service address?`;

  return {
    ...state,
    step: 'address',
    draft: { ...state.draft, customerName },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: nextMessage,
        timestamp: Date.now(),
      },
    ],
  };
}

function handleAddress(state: ConversationState, input: string): ConversationState {
  const validation = validateAddress(input);

  if (!validation.valid) {
    return addBotMessage(state, validation.error || 'Invalid address. Please try again.');
  }

  // Build time window quick replies based on priority
  const quickReplies = state.draft.priority === 'urgent' 
    ? ['ASAP', 'Morning', 'Afternoon', 'Evening']
    : ['Morning', 'Afternoon', 'Evening'];

  return {
    ...state,
    step: 'time-window',
    draft: { ...state.draft, address: input.trim() },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: state.draft.priority === 'urgent' 
          ? 'I see this is urgent! When would you like the service?'
          : 'When would you like the service? Choose a time window:',
        timestamp: Date.now(),
        quickReplies,
      },
    ],
  };
}

function handleTimeWindow(state: ConversationState, input: string): ConversationState {
  const validation = validateTimeWindow(input);

  if (!validation.valid) {
    const quickReplies = state.draft.priority === 'urgent' 
      ? ['ASAP', 'Morning', 'Afternoon', 'Evening']
      : ['Morning', 'Afternoon', 'Evening'];
    return addBotMessage(state, validation.error || 'Invalid time window. Please choose a valid option.', quickReplies);
  }

  const timeLabel = input.trim().toLowerCase() === 'asap' ? 'as soon as possible' : `${input.toLowerCase()} tomorrow`;

  return {
    ...state,
    step: 'contact-info',
    draft: { ...state.draft, timeWindow: validation.parsed, timePreference: input.trim().toLowerCase() as any },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: `Perfect! I've scheduled it for ${timeLabel}. What's the best way to contact you? (email or phone)`,
        timestamp: Date.now(),
      },
    ],
  };
}

function handleContactInfo(state: ConversationState, input: string): ConversationState {
  const validation = validateContactInfo(input);

  if (!validation.valid) {
    return addBotMessage(state, validation.error || 'Please provide a valid email or phone number.');
  }

  return {
    ...state,
    step: 'notes',
    draft: { ...state.draft, contactInfo: input.trim() },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: 'Got it! Any special instructions or notes for the service provider? (or type "none" to skip)',
        timestamp: Date.now(),
      },
    ],
  };
}

function handleNotes(state: ConversationState, input: string): ConversationState {
  const notes = input.trim().toLowerCase() === 'none' ? '' : input.trim();

  return {
    ...state,
    step: 'confirmation',
    draft: { ...state.draft, notes },
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content: 'Perfect! Let me summarize your booking:',
        timestamp: Date.now(),
      },
    ],
  };
}

function addUserMessage(state: ConversationState, content: string): ConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      },
    ],
  };
}

function addBotMessage(state: ConversationState, content: string, quickReplies?: string[]): ConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'bot',
        content,
        timestamp: Date.now(),
        quickReplies,
      },
    ],
  };
}

export function addSystemMessage(state: ConversationState, content: string): ConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        id: crypto.randomUUID(),
        role: 'system',
        content,
        timestamp: Date.now(),
      },
    ],
  };
}
