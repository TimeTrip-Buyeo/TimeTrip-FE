import { MAP_LOCATIONS, SPOT_ID_TO_LOCATION_ID, type LocationId } from "@/constants/locations";

const KNOWN_LOCATION_IDS = new Set<string>(MAP_LOCATIONS.map((location) => location.id));

export const PERSON_OVERLAY_SCREEN_HEIGHT_RATIO = 0.5;

export function resolveSingleParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

export function resolveNumberParam(raw: string | string[] | undefined) {
  const value = resolveSingleParam(raw);
  if (value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

export function resolveLocationId(
  rawLocationId: string | string[] | undefined,
  rawSpotId?: string | string[] | undefined,
  fallback: LocationId = "pagoda",
): LocationId {
  const locationId = resolveSingleParam(rawLocationId);
  if (locationId && KNOWN_LOCATION_IDS.has(locationId)) return locationId as LocationId;

  const spotId = resolveNumberParam(rawSpotId);
  return spotId !== null ? SPOT_ID_TO_LOCATION_ID[spotId] ?? fallback : fallback;
}
