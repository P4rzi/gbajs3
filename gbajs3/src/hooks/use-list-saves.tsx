import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { z } from 'zod';

import { useAuthContext } from './context.tsx';

const SaveItemSchema = z.object({
  filename: z.string(),
  updatedAt: z.string()
});

const SaveListSchema = z.array(SaveItemSchema);
export type SaveItem = z.infer<typeof SaveItemSchema>;
export type SaveListResponse = z.infer<typeof SaveListSchema>;

export const useListSaves = (options?: UseQueryOptions<SaveListResponse>) => {
  const apiLocation = import.meta.env.VITE_GBA_SERVER_LOCATION;
  const { accessToken } = useAuthContext();

  return useQuery<SaveListResponse>({
    queryKey: ['gbaSaves', accessToken, apiLocation],
    queryFn: async () => {
      const url = `${apiLocation}/api/save/list`;
      const options: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      };

      const res = await fetch(url, options);
      return SaveListSchema.parse(await res.json());
    },
    ...options
  });
};
