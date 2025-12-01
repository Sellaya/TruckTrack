/**
 * Address autocomplete utilities using preloaded trucking hubs and RapidAPI GeoDB
 */

import { truckingHubs } from './trucking-hubs';

export interface CityLocation {
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export interface GeoDBCity {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  region: string;
  regionCode: string;
  latitude: number;
  longitude: number;
}

// Search preloaded trucking hubs first (instant results)
export function searchTruckingHubs(query: string): CityLocation[] {
  if (!query || query.length < 2) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  return truckingHubs.filter((hub: CityLocation) => {
    const nameMatch = hub.name.toLowerCase().includes(lowerQuery);
    const stateMatch = hub.state.toLowerCase().includes(lowerQuery);
    const countryMatch = hub.country.toLowerCase().includes(lowerQuery);
    return nameMatch || stateMatch || countryMatch;
  }).slice(0, 10); // Limit to 10 results
}

// Fetch cities from RapidAPI GeoDB
export async function fetchCitiesFromAPI(
  query: string,
  apiKey?: string
): Promise<CityLocation[]> {
  if (!query || query.length < 2) {
    return [];
  }

  // If no API key, return empty array (user can still use preloaded hubs)
  if (!apiKey) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    // Use namePrefix for better matching - finds cities that start with or contain the query
    // Increase limit to get more results, then filter for best matches
    const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodedQuery}&countryIds=CA,US&limit=20&types=CITY`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      console.error('GeoDB API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    // Convert API response to CityLocation format
    const results = data.data.map((city: GeoDBCity) => ({
      name: city.name,
      state: city.region || city.regionCode || '',
      country: city.countryCode === 'CA' ? 'CA' : 'US',
      latitude: city.latitude,
      longitude: city.longitude,
      type: 'API Result',
    }));

    // Filter to ensure the query matches (case-insensitive)
    // This helps catch cities like Brampton when typing "bram"
    const lowerQuery = query.toLowerCase();
    const filtered = results.filter(city => 
      city.name.toLowerCase().includes(lowerQuery) ||
      city.name.toLowerCase().startsWith(lowerQuery)
    );

    return filtered;
  } catch (error) {
    console.error('Error fetching cities from API:', error);
    return [];
  }
}

// Combined search: preloaded hubs first, then API always (to ensure all cities are found)
export async function searchCities(
  query: string,
  apiKey?: string
): Promise<CityLocation[]> {
  // First, search preloaded hubs (instant)
  const hubResults = searchTruckingHubs(query);

  // Always try to fetch from API (if API key exists) to ensure we find all cities
  // This ensures cities like Brampton show up even if not in preloaded hubs
  const apiResults = apiKey ? await fetchCitiesFromAPI(query, apiKey) : [];

  // Combine and deduplicate (prefer hubs over API for same city)
  const combined: CityLocation[] = [...hubResults];
  const hubNames = new Set(hubResults.map(h => `${h.name}, ${h.state}`.toLowerCase()));

  for (const apiCity of apiResults) {
    const key = `${apiCity.name}, ${apiCity.state}`.toLowerCase();
    if (!hubNames.has(key)) {
      combined.push(apiCity);
    }
  }

  // Sort: exact matches first, then partial matches, prioritizing hub cities
  const lowerQuery = query.toLowerCase();
  combined.sort((a, b) => {
    // Prioritize hub cities
    const aIsHub = a.type !== 'API Result';
    const bIsHub = b.type !== 'API Result';
    if (aIsHub && !bIsHub) return -1;
    if (!aIsHub && bIsHub) return 1;
    
    // Then prioritize exact prefix matches
    const aStartsWith = a.name.toLowerCase().startsWith(lowerQuery);
    const bStartsWith = b.name.toLowerCase().startsWith(lowerQuery);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;
    
    // Finally, alphabetical order
    return a.name.localeCompare(b.name);
  });

  return combined.slice(0, 15); // Limit total results
}

// Format city for display
export function formatCityLocation(city: CityLocation): string {
  if (city.state) {
    return `${city.name}, ${city.state}, ${city.country}`;
  }
  return `${city.name}, ${city.country}`;
}

// Get API key from environment variables only (backend configuration)
export function getGeoDBAPIKey(): string | undefined {
  // Only use environment variable - configured at backend/server level
  const key = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
  
  // Debug logging (can be removed in production)
  if (!key) {
    console.warn('RapidAPI key not found. City autocomplete will only show preloaded hubs.');
  }
  
  return key;
}

