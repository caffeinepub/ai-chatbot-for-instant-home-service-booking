import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Booking, UserProfile } from '../backend';
import { Principal } from '@dfinity/principal';

export interface BookingWithCustomer {
  booking: Booking;
  customerProfile: UserProfile | null;
}

export function useAdminBookings() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BookingWithCustomer[]>({
    queryKey: ['adminBookings'],
    queryFn: async () => {
      if (!actor) return [];
      
      try {
        // TODO: Replace with actor.getAllBookings() once backend is updated
        // For now, return empty array - this will be populated once backend adds the method
        console.warn('getAllBookings() not yet implemented in backend');
        return [];
        
        // Future implementation:
        // const bookings = await actor.getAllBookings();
        // const bookingsWithCustomers = await Promise.all(
        //   bookings.map(async (booking) => {
        //     try {
        //       const profile = await actor.getUserProfile(booking.user);
        //       return { booking, customerProfile: profile };
        //     } catch {
        //       return { booking, customerProfile: null };
        //     }
        //   })
        // );
        // return bookingsWithCustomers;
      } catch (error: any) {
        if (error.message?.includes('Unauthorized') || error.message?.includes('trap')) {
          throw new Error('Access denied. Admin privileges required.');
        }
        throw error;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useCustomerProfile(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['customerProfile', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      try {
        return await actor.getUserProfile(principal);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !actorFetching && !!principal,
  });
}
