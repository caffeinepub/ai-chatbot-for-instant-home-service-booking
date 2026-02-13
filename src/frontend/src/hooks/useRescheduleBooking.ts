import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { TimeWindow } from '../backend';
import { toast } from 'sonner';

interface RescheduleBookingParams {
  bookingId: bigint;
  newTimeWindow: TimeWindow;
}

export function useRescheduleBooking() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RescheduleBookingParams) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rescheduleBooking(params.bookingId, params.newTimeWindow);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookingDetails', variables.bookingId.toString()] });
      toast.success('Booking rescheduled successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reschedule booking: ${error.message}`);
    },
  });
}
