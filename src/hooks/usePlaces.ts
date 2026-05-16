import { useCallback } from 'react';
import type { Restaurant } from './useClaude';

interface PlacesCandidate {
  place_id?: string;
  formatted_address?: string;
  editorial_summary?: string;
}

interface PlacesResponse {
  status: string;
  candidates?: PlacesCandidate[];
}

// Verifies Claude's restaurant suggestions against Google Places, backfilling each
// restaurant with a real place_id and canonical address. Falls back silently to the
// original restaurant data if the key is absent or a lookup fails.
export function usePlaces() {
  const enrichRestaurants = useCallback(
    async (restaurants: Restaurant[]): Promise<Restaurant[]> => {
      const results = await Promise.allSettled(
        restaurants.map(async (r): Promise<Restaurant> => {
          const query = [r.name, r.address].filter(Boolean).join(' ');
          const res = await fetch(
            `/api/places?query=${encodeURIComponent(query)}`,
          );
          if (!res.ok) return r;

          const data: PlacesResponse = await res.json();
          if (data.status !== 'OK' || !data.candidates?.length) return r;

          const top = data.candidates[0];
          const description = top.editorial_summary;
          return {
            ...r,
            placeId: top.place_id ?? r.placeId,
            address: top.formatted_address ?? r.address,
            ...(description && { description }),
          };
        }),
      );

      return results.map((result, i) =>
        result.status === 'fulfilled' ? result.value : restaurants[i],
      );
    },
    [],
  );

  return { enrichRestaurants };
}
