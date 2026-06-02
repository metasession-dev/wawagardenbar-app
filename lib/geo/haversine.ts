/**
 * @requirement REQ-061 — Checkout operational gates (P2 #13)
 *
 * Great-circle distance in kilometres between two `(lat, lng)` points.
 * Pure function, no I/O, no external dependencies. Used by
 * `SettingsService.checkDeliveryDistance` to validate customer delivery
 * addresses against the bar's configured `deliveryRadius`.
 *
 * Mean Earth radius = 6371 km (the WGS84 mean — accurate to ~0.5% for
 * the short distances this app cares about).
 */
const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
