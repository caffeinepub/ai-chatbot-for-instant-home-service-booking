import { useState, useEffect } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useServiceCategories } from '../hooks/useServiceCategories';
import { useCreateBooking } from '../hooks/useCreateBooking';
import { useCancelBooking } from '../hooks/useCancelBooking';
import { useBookingDetails } from '../hooks/useBookingDetails';
import { useRescheduleBooking } from '../hooks/useRescheduleBooking';
import { createInitialState, processUserInput, addSystemMessage } from '../chat/bookingStateMachine';
import { saveConversation, loadConversation, clearConversation } from '../utils/chatPersistence';
import type { ConversationState } from '../chat/types';
import ChatTranscript from '../components/chat/ChatTranscript';
import QuickReplies from '../components/chat/QuickReplies';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Send, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ChatBookingScreen() {
  const { identity } = useInternetIdentity();
  const { data: serviceCategories = [], isLoading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useServiceCategories();
  const { mutate: createBooking, isPending: isCreatingBooking } = useCreateBooking();
  const { mutate: cancelBooking, isPending: isCancellingBooking } = useCancelBooking();
  const { mutate: rescheduleBooking, isPending: isReschedulingBooking } = useRescheduleBooking();

  const [conversationState, setConversationState] = useState<ConversationState>(() => {
    const loaded = loadConversation();
    return loaded || createInitialState();
  });

  const [inputValue, setInputValue] = useState('');
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const isAuthenticated = !!identity;

  // Fetch booking details when in execute-action step for inquiry
  const shouldFetchBooking = conversationState.step === 'execute-action' && 
                             conversationState.activeIntent === 'inquiry' && 
                             conversationState.targetBookingId !== undefined;
  
  const { data: bookingDetails, isLoading: isLoadingBooking, error: bookingError } = useBookingDetails(
    shouldFetchBooking ? conversationState.targetBookingId! : null
  );

  const isSubmitting = isCreatingBooking || isCancellingBooking || isReschedulingBooking;

  // Save conversation state to localStorage
  useEffect(() => {
    saveConversation(conversationState);
  }, [conversationState]);

  // Auto-transition to service selection when categories load
  useEffect(() => {
    if (serviceCategories.length > 0 && conversationState.step === 'welcome' && conversationState.messages.length === 1) {
      const newState = processUserInput(conversationState, 'start', serviceCategories);
      setConversationState(newState);
    }
  }, [serviceCategories, conversationState.step, conversationState.messages.length]);

  // Execute non-booking actions when in execute-action step
  useEffect(() => {
    if (conversationState.step === 'execute-action' && !isExecutingAction) {
      executeNonBookingAction();
    }
  }, [conversationState.step, conversationState.activeIntent, conversationState.targetBookingId]);

  // Handle booking details fetch result for inquiry
  useEffect(() => {
    if (shouldFetchBooking && !isLoadingBooking && bookingDetails && !isExecutingAction) {
      const statusBadge = bookingDetails.status === 'cancelled' ? '❌' : 
                         bookingDetails.status === 'pending' ? '⏳' : '✅';
      
      const timeWindow = new Date(Number(bookingDetails.timeWindow.start) / 1_000_000);
      const timeLabel = timeWindow.toLocaleDateString() + ' ' + timeWindow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const resultMessage = `${statusBadge} Booking Details:\n\n` +
        `ID: BK${bookingDetails.id}\n` +
        `Service: ${bookingDetails.serviceCategory}\n` +
        `Address: ${bookingDetails.address}\n` +
        `Time: ${timeLabel}\n` +
        `Status: ${bookingDetails.status}\n` +
        `Contact: ${bookingDetails.contactInfo}` +
        (bookingDetails.notes ? `\nNotes: ${bookingDetails.notes}` : '');
      
      const newState: ConversationState = {
        ...conversationState,
        step: 'show-result',
        messages: [
          ...conversationState.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: resultMessage,
            timestamp: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: 'Is there anything else I can help you with? Type "restart" to start a new conversation.',
            timestamp: Date.now(),
          },
        ],
      };
      
      setConversationState(newState);
      setIsExecutingAction(true);
    }
  }, [shouldFetchBooking, isLoadingBooking, bookingDetails]);

  // Handle booking fetch error
  useEffect(() => {
    if (shouldFetchBooking && bookingError && !isExecutingAction) {
      const errorMessage = `❌ Sorry, I couldn't find that booking. ${bookingError.message}\n\nPlease check the booking ID and try again, or type "restart" to start over.`;
      
      const newState: ConversationState = {
        ...conversationState,
        step: 'show-result',
        messages: [
          ...conversationState.messages,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            content: errorMessage,
            timestamp: Date.now(),
          },
        ],
      };
      
      setConversationState(newState);
      setIsExecutingAction(true);
    }
  }, [shouldFetchBooking, bookingError]);

  const executeNonBookingAction = () => {
    if (!isAuthenticated) {
      const newState = addSystemMessage(conversationState, 'Please log in to continue with this action.');
      setConversationState(newState);
      setIsExecutingAction(true);
      return;
    }

    if (!conversationState.targetBookingId) {
      return;
    }

    setIsExecutingAction(true);

    if (conversationState.activeIntent === 'cancellation') {
      cancelBooking(conversationState.targetBookingId, {
        onSuccess: () => {
          const newState: ConversationState = {
            ...conversationState,
            step: 'show-result',
            messages: [
              ...conversationState.messages,
              {
                id: crypto.randomUUID(),
                role: 'bot',
                content: `✅ Your booking (BK${conversationState.targetBookingId}) has been cancelled successfully.\n\nIs there anything else I can help you with? Type "restart" to start a new conversation.`,
                timestamp: Date.now(),
              },
            ],
          };
          setConversationState(newState);
        },
        onError: (error: Error) => {
          const newState: ConversationState = {
            ...conversationState,
            step: 'show-result',
            messages: [
              ...conversationState.messages,
              {
                id: crypto.randomUUID(),
                role: 'bot',
                content: `❌ Failed to cancel booking: ${error.message}\n\nPlease try again or type "restart" to start over.`,
                timestamp: Date.now(),
              },
            ],
          };
          setConversationState(newState);
        },
      });
    } else if (conversationState.activeIntent === 'reschedule') {
      if (!conversationState.draft.timeWindow) {
        setIsExecutingAction(false);
        return;
      }

      rescheduleBooking(
        {
          bookingId: conversationState.targetBookingId,
          newTimeWindow: conversationState.draft.timeWindow,
        },
        {
          onSuccess: () => {
            const newState: ConversationState = {
              ...conversationState,
              step: 'show-result',
              messages: [
                ...conversationState.messages,
                {
                  id: crypto.randomUUID(),
                  role: 'bot',
                  content: `✅ Your booking (BK${conversationState.targetBookingId}) has been rescheduled to ${conversationState.rescheduleTime} successfully!\n\nIs there anything else I can help you with? Type "restart" to start a new conversation.`,
                  timestamp: Date.now(),
                },
              ],
            };
            setConversationState(newState);
          },
          onError: (error: Error) => {
            const newState: ConversationState = {
              ...conversationState,
              step: 'show-result',
              messages: [
                ...conversationState.messages,
                {
                  id: crypto.randomUUID(),
                  role: 'bot',
                  content: `❌ Failed to reschedule booking: ${error.message}\n\nPlease try again or type "restart" to start over.`,
                  timestamp: Date.now(),
                },
              ],
            };
            setConversationState(newState);
          },
        }
      );
    }
    // inquiry is handled by the useEffect watching bookingDetails
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isSubmitting) return;

    // Reset execution flag when user sends new message
    if (isExecutingAction) {
      setIsExecutingAction(false);
    }

    const newState = processUserInput(conversationState, inputValue, serviceCategories);
    setConversationState(newState);
    setInputValue('');
  };

  const handleQuickReply = (option: string) => {
    if (isSubmitting) return;
    
    if (isExecutingAction) {
      setIsExecutingAction(false);
    }
    
    const newState = processUserInput(conversationState, option, serviceCategories);
    setConversationState(newState);
  };

  const handleRestart = () => {
    clearConversation();
    setConversationState(createInitialState());
    setInputValue('');
    setIsExecutingAction(false);
  };

  const handleConfirmBooking = () => {
    if (!isAuthenticated) {
      const newState = addSystemMessage(conversationState, 'Please log in to confirm your booking.');
      setConversationState(newState);
      return;
    }

    const { draft } = conversationState;
    if (!draft.serviceCategory || !draft.address || !draft.timeWindow || !draft.contactInfo) {
      return;
    }

    createBooking(
      {
        serviceCategory: draft.serviceCategory,
        address: draft.address,
        timeWindow: draft.timeWindow,
        contactInfo: draft.contactInfo,
        notes: draft.notes || '',
      },
      {
        onSuccess: () => {
          const newState: ConversationState = {
            ...conversationState,
            step: 'complete',
            messages: [
              ...conversationState.messages,
              {
                id: crypto.randomUUID(),
                role: 'bot',
                content: '🎉 Your booking has been confirmed! You can view it in "My Bookings". Thank you for using ServiceBot!',
                timestamp: Date.now(),
              },
            ],
          };
          setConversationState(newState);
          setTimeout(() => {
            handleRestart();
          }, 3000);
        },
      }
    );
  };

  const lastMessage = conversationState.messages[conversationState.messages.length - 1];
  const showQuickReplies = lastMessage?.quickReplies && 
                          conversationState.step !== 'confirmation' && 
                          conversationState.step !== 'complete' &&
                          conversationState.step !== 'execute-action' &&
                          conversationState.step !== 'show-result';

  const showInput = conversationState.step !== 'confirmation' && 
                   conversationState.step !== 'complete' &&
                   conversationState.step !== 'execute-action';

  return (
    <div 
      className="flex-1 flex flex-col relative"
      style={{
        backgroundImage: 'url(/assets/generated/chat-bg-pattern.dim_1600x900.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      <div className="relative flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Error state for categories */}
        {categoriesError && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Failed to load service categories</span>
                <Button variant="outline" size="sm" onClick={() => refetchCategories()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading state */}
        {categoriesLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Chat transcript */}
        {!categoriesLoading && (
          <ChatTranscript messages={conversationState.messages} />
        )}

        {/* Confirmation summary for new bookings */}
        {conversationState.step === 'confirmation' && conversationState.activeIntent === 'new-booking' && (
          <div className="px-4 pb-4">
            <Card className="p-6 max-w-2xl mx-auto shadow-warm">
              <h3 className="font-bold text-lg mb-4">Booking Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <Badge variant="secondary">{conversationState.draft.serviceCategory}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium text-right max-w-xs">{conversationState.draft.address}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">
                    {conversationState.draft.timePreference === 'asap' ? 'ASAP' : `${conversationState.draft.timePreference || 'Tomorrow'}`}
                  </span>
                </div>
                {conversationState.draft.priority && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant={conversationState.draft.priority === 'urgent' ? 'destructive' : 'default'}>
                      {conversationState.draft.priority.toUpperCase()}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">{conversationState.draft.contactInfo}</span>
                </div>
                {conversationState.draft.notes && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notes:</span>
                    <span className="font-medium text-right max-w-xs">{conversationState.draft.notes}</span>
                  </div>
                )}
              </div>
              
              {!isAuthenticated && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please log in to confirm your booking
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={handleRestart} className="flex-1">
                  Start Over
                </Button>
                <Button 
                  onClick={handleConfirmBooking} 
                  disabled={!isAuthenticated || isSubmitting}
                  className="flex-1"
                >
                  {isCreatingBooking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm Booking'
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Quick replies */}
        {showQuickReplies && (
          <QuickReplies
            options={lastMessage.quickReplies!}
            onSelect={handleQuickReply}
            disabled={isSubmitting || categoriesLoading}
          />
        )}

        {/* Input area */}
        {showInput && (
          <div className="p-4 border-t border-border bg-card/95 backdrop-blur">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRestart}
                disabled={isSubmitting}
                title="Restart conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message in English, Hindi, or Hinglish..."
                disabled={isSubmitting || categoriesLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isSubmitting || categoriesLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
