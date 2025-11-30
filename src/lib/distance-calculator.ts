/**
 * Distance calculation utilities using Haversine formula
 * Calculates great-circle distance between two points on Earth
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate (origin)
 * @param coord2 Second coordinate (destination)
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
      Math.cos(toRadians(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate distance in miles
 */
export function calculateDistanceMiles(coord1: Coordinates, coord2: Coordinates): number {
  const km = calculateDistanceKm(coord1, coord2);
  return Math.round((km * 0.621371) * 100) / 100; // Convert km to miles, round to 2 decimals
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): { miles: string; kilometers: string } {
  const km = miles * 1.60934;
  return {
    miles: `${miles.toLocaleString('en-US', { maximumFractionDigits: 2 })} mi`,
    kilometers: `${km.toLocaleString('en-US', { maximumFractionDigits: 2 })} km`,
  };
}







