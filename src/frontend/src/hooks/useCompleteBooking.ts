import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';

export function useCompleteBooking() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      
      try {
        // TODO: Replace with actor.completeBooking(bookingId) once backend is updated
        console.warn('completeBooking() not yet implemented in backend');
        throw new Error('Complete booking functionality not yet available');
        
        // Future implementation:
        // await actor.completeBooking(bookingId);
      } catch (error: any) {
        if (error.message?.includes('Unauthorized') || error.message?.includes('trap')) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookingDetails'] });
      toast.success('Booking marked as completed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to complete booking');
    },
  });
}
