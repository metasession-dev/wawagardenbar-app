/**
 * @requirement REQ-061 — Checkout operational gates (P2 #13)
 *
 * Google Maps Geocoding API wrapper. Used at server-side `SettingsService.
 * getBarCoordinates()` to lazy-resolve the bar's address string into
 * `(lat, lng)` coordinates, cached on the settings doc afterwards.
 *
 * Fail-open posture: every failure mode (missing key, network failure,
 * no results, rate limit, non-OK status) returns `null` so callers can
 * fall back to "skip distance check" instead of crashing the customer
 * flow. The customer page must never crash because Google had a hiccup.
 *
 * Cost: each successful call counts against the Google Maps Geocoding
 * quota (40k/month free tier). Caller (`getBarCoordinates`) caches the
 * result on the settings doc so we hit Google at most once per address
 * change.
 */
const GEOCODE_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return null;
  }

  const url = `${GEOCODE_ENDPOINT}?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        `[geocode] Google Maps responded HTTP ${res.status} for address="${address}"`
      );
      return null;
    }
    const data = (await res.json()) as {
      status?: string;
      results?: Array<{
        geometry?: { location?: { lat: number; lng: number } };
      }>;
    };
    if (data.status !== 'OK' || !data.results?.length) {
      console.warn(
        `[geocode] Google Maps status=${data.status} for address="${address}"`
      );
      return null;
    }
    const loc = data.results[0]?.geometry?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  } catch (error) {
    console.error('[geocode] geocodeAddress failed:', error);
    return null;
  }
}
