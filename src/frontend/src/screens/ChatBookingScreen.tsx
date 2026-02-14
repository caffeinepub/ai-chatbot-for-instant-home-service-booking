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
      const statusLabel = bookingDetails.status === 'pending' ? 'Pending' : 'Cancelled';
      const message = `Your booking (ID: BK-${bookingDetails.id}) for ${bookingDetails.serviceCategory} at ${bookingDetails.address} is currently ${statusLabel}.`;
      
      const newState = addSystemMessage(conversationState, message);
      const finalState = {
        ...newState,
        step: 'show-result' as const,
      };
      setConversationState(finalState);
      setIsExecutingAction(true);
    }
  }, [shouldFetchBooking, isLoadingBooking, bookingDetails]);

  // Handle booking fetch error for inquiry
  useEffect(() => {
    if (shouldFetchBooking && !isLoadingBooking && bookingError && !isExecutingAction) {
      const errorMessage = `Sorry, I couldn't find that booking. Please check the booking ID and try again.`;
      const newState = addSystemMessage(conversationState, errorMessage);
      const finalState = {
        ...newState,
        step: 'show-result' as const,
      };
      setConversationState(finalState);
      setIsExecutingAction(true);
    }
  }, [shouldFetchBooking, isLoadingBooking, bookingError]);

  const executeNonBookingAction = () => {
    if (!isAuthenticated) {
      const newState = addSystemMessage(conversationState, 'Please log in to perform this action.');
      setConversationState({ ...newState, step: 'show-result' });
      setIsExecutingAction(true);
      return;
    }

    if (conversationState.activeIntent === 'cancellation' && conversationState.targetBookingId) {
      setIsExecutingAction(true);
      cancelBooking(conversationState.targetBookingId, {
        onSuccess: () => {
          const newState = addSystemMessage(conversationState, `Your booking (ID: BK-${conversationState.targetBookingId}) has been cancelled successfully.`);
          setConversationState({ ...newState, step: 'show-result' });
        },
        onError: (error: Error) => {
          const newState = addSystemMessage(conversationState, `Failed to cancel booking: ${error.message}`);
          setConversationState({ ...newState, step: 'show-result' });
        },
      });
    } else if (conversationState.activeIntent === 'reschedule' && conversationState.targetBookingId && conversationState.draft.timeWindow) {
      setIsExecutingAction(true);
      rescheduleBooking(
        { bookingId: conversationState.targetBookingId, newTimeWindow: conversationState.draft.timeWindow },
        {
          onSuccess: () => {
            const newState = addSystemMessage(conversationState, `Your booking (ID: BK-${conversationState.targetBookingId}) has been rescheduled successfully to ${conversationState.rescheduleTime}.`);
            setConversationState({ ...newState, step: 'show-result' });
          },
          onError: (error: Error) => {
            const newState = addSystemMessage(conversationState, `Failed to reschedule booking: ${error.message}`);
            setConversationState({ ...newState, step: 'show-result' });
          },
        }
      );
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isSubmitting) return;

    const newState = processUserInput(conversationState, inputValue, serviceCategories);
    setConversationState(newState);
    setInputValue('');
  };

  const handleQuickReply = (reply: string) => {
    if (isSubmitting) return;
    const newState = processUserInput(conversationState, reply, serviceCategories);
    setConversationState(newState);
  };

  const handleConfirmBooking = () => {
    if (!isAuthenticated) {
      const newState = addSystemMessage(conversationState, 'Please log in to confirm your booking.');
      setConversationState(newState);
      return;
    }

    const { draft } = conversationState;
    if (!draft.serviceCategory || !draft.address || !draft.timeWindow || !draft.contactInfo) {
      const newState = addSystemMessage(conversationState, 'Missing required booking information. Please restart.');
      setConversationState(newState);
      return;
    }

    createBooking(
      {
        name: draft.customerName,
        serviceCategory: draft.serviceCategory,
        address: draft.address,
        timeWindow: draft.timeWindow,
        contactInfo: draft.contactInfo,
        notes: draft.notes || '',
      },
      {
        onSuccess: (bookingId) => {
          const newState = addSystemMessage(
            conversationState,
            `✅ Booking confirmed! Your booking ID is BK-${bookingId}. You'll receive updates at ${draft.contactInfo}.`
          );
          setConversationState({ ...newState, step: 'complete' });
          clearConversation();
        },
        onError: (error: Error) => {
          const newState = addSystemMessage(conversationState, `Failed to create booking: ${error.message}`);
          setConversationState(newState);
        },
      }
    );
  };

  const handleRestart = () => {
    clearConversation();
    setConversationState(createInitialState());
    setIsExecutingAction(false);
  };

  const currentMessage = conversationState.messages[conversationState.messages.length - 1];
  const showQuickReplies = currentMessage?.quickReplies && conversationState.step !== 'confirmation' && conversationState.step !== 'complete' && conversationState.step !== 'show-result';

  return (
    <div 
      className="flex-1 flex flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/assets/generated/chat-bg-pattern.dim_1600x900.png)' }}
    >
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/generated/chatbot-mascot.dim_512x512.png" 
              alt="ServiceBot" 
              className="w-12 h-12 rounded-full shadow-warm"
            />
            <div>
              <h1 className="text-2xl font-bold">ServiceBot</h1>
              <p className="text-sm text-muted-foreground">Your home service assistant</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
          </Button>
        </div>

        {/* Error Alert */}
        {categoriesError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load service categories</span>
              <Button variant="outline" size="sm" onClick={() => refetchCategories()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col shadow-warm backdrop-blur-sm bg-background/95">
          <div className="flex-1 overflow-hidden">
            <ChatTranscript messages={conversationState.messages} />
          </div>

          {/* Confirmation Summary */}
          {conversationState.step === 'confirmation' && (
            <div className="p-4 border-t bg-accent/30">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Booking Summary</h3>
                {conversationState.draft.customerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{conversationState.draft.customerName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="font-medium">{conversationState.draft.serviceCategory}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{conversationState.draft.address}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{conversationState.draft.timePreference}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium">{conversationState.draft.contactInfo}</span>
                </div>
                {conversationState.draft.notes && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Notes:</span>
                    <span className="font-medium">{conversationState.draft.notes}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleConfirmBooking} 
                    disabled={isCreatingBooking || !isAuthenticated}
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
                  <Button variant="outline" onClick={handleRestart}>
                    Cancel
                  </Button>
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-destructive text-center">
                    Please log in to confirm your booking
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Replies */}
          {showQuickReplies && (
            <div className="p-4 border-t">
              <QuickReplies 
                options={currentMessage.quickReplies!} 
                onSelect={handleQuickReply}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Input Area */}
          {conversationState.step !== 'confirmation' && conversationState.step !== 'complete' && conversationState.step !== 'execute-action' && (
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  disabled={isSubmitting || categoriesLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputValue.trim() || isSubmitting || categoriesLoading}
                  size="icon"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
