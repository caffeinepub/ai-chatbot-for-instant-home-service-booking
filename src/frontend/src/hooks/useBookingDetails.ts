import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Booking } from '../backend';

export function useBookingDetails(bookingId: bigint | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Booking>({
    queryKey: ['bookingDetails', bookingId?.toString()],
    queryFn: async () => {
      if (!actor || !bookingId) throw new Error('Actor or booking ID not available');
      return actor.getBookingDetails(bookingId);
    },
    enabled: !!actor && !actorFetching && !!bookingId,
  });
}
