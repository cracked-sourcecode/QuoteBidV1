import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

export function useCurrentUser() {
  const { data, isLoading, error, refetch } = useQuery<User>({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('You must be logged in to access this resource');
        }
        throw new Error('Failed to fetch user data');
      }
      return response.json();
    },
    retry: false,
    staleTime: 60 * 1000, // 1 minute
  });

  return { data, isLoading, error, refetch };
}
