import { useQuery } from '@tanstack/react-query';
import { useActor } from './useActor';

export function useServiceCategories() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['serviceCategories'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getServiceCategories();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
