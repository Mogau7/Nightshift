import type { Beacon } from './types';

function hasPin(beacon: Beacon): beacon is Beacon & { lat: number; lng: number } {
  return beacon.lat !== null && beacon.lng !== null;
}

export function googleMapsUrl(beacon: Beacon): string {
  const query = hasPin(beacon)
    ? `${beacon.lat},${beacon.lng}`
    : `${beacon.secret_name}, ${beacon.secret_address}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function appleMapsUrl(beacon: Beacon): string {
  const params = new URLSearchParams({
    q: beacon.secret_name,
    address: beacon.secret_address,
  });
  if (hasPin(beacon)) {
    params.set('ll', `${beacon.lat},${beacon.lng}`);
  }
  return `https://maps.apple.com/?${params.toString()}`;
}
