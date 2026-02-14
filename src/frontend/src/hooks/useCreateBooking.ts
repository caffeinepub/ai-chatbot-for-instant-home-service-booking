import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { TimeWindow } from '../backend';
import { toast } from 'sonner';

interface CreateBookingParams {
  name?: string;
  serviceCategory: string;
  address: string;
  timeWindow: TimeWindow;
  contactInfo: string;
  notes: string;
}

export function useCreateBooking() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateBookingParams) => {
      if (!actor) throw new Error('Actor not available');
      // Backend expects: name (optional), serviceCategory, address, timeWindow, contactInfo, notes
      const bookingId = await actor.createBooking(
        params.name || null,
        params.serviceCategory,
        params.address,
        params.timeWindow,
        params.contactInfo,
        params.notes
      );
      return bookingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      toast.success('Booking created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create booking: ${error.message}`);
    },
  });
}
