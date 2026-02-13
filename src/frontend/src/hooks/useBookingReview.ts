import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';

export interface Review {
  bookingId: bigint;
  rating: number;
  comments: string;
  createdAt: bigint;
}

export function useBookingReview(bookingId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Review | null>({
    queryKey: ['bookingReview', bookingId?.toString()],
    queryFn: async () => {
      if (!actor || !bookingId) return null;
      
      try {
        // TODO: Replace with actor.getReviewForBooking(bookingId) once backend is updated
        console.warn('getReviewForBooking() not yet implemented in backend');
        return null;
        
        // Future implementation:
        // return await actor.getReviewForBooking(bookingId);
      } catch (error) {
        console.error('Error fetching review:', error);
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!bookingId,
  });
}

export function useSubmitReview() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, rating, comments }: { bookingId: bigint; rating: number; comments: string }) => {
      if (!actor) throw new Error('Actor not available');
      
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }
      
      try {
        // TODO: Replace with actor.submitReview(bookingId, rating, comments) once backend is updated
        console.warn('submitReview() not yet implemented in backend');
        throw new Error('Review submission not yet available');
        
        // Future implementation:
        // await actor.submitReview(bookingId, BigInt(rating), comments);
      } catch (error: any) {
        if (error.message?.includes('Unauthorized') || error.message?.includes('trap')) {
          throw new Error('You can only review your own completed bookings');
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bookingReview', variables.bookingId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['bookingDetails', variables.bookingId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['adminBookings'] });
      toast.success('Review submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit review');
    },
  });
}
