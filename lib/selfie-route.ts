import { LOCATION_ID_TO_SPOT_ID, MAP_LOCATIONS, SPOT_ID_TO_LOCATION_ID, type LocationId } from "@/constants/locations";
import type { Locale } from "@/constants/translations";
import { getCollectionItems, getStoryTopics } from "@/lib/api/collections";

const KNOWN_LOCATION_IDS = new Set<string>(MAP_LOCATIONS.map((location) => location.id));

// Figure height as a fraction of the camera screen height.
export const PERSON_OVERLAY_HEIGHT_RATIO = 0.48;
// Figure box's `right` offset (px) — negative so it bleeds off the screen edge
// and reads as a companion standing beside the shot, not the subject.
export const PERSON_OVERLAY_SIDE_OFFSET = -44;

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

export type SelfieRouteParams = {
  spotId?: string;
  storyId?: string;
  collectionItemId?: string;
};

export async function getSelfieRouteParams(
  locationId: LocationId,
  locale: Locale,
  options: { collectionItemId?: number; requireAcquired?: boolean } = {},
): Promise<SelfieRouteParams> {
  const spotId = LOCATION_ID_TO_SPOT_ID[locationId];
  if (spotId == null) return {};

  const stories = await getStoryTopics({ locale, spotId, storyType: "special" });
  const storyIds = [...new Set(stories.flatMap((story) => story.storyIds))];
  const storiesWithItems = await Promise.all(
    storyIds.map(async (storyId) => ({
      storyId,
      ...(await getCollectionItems(storyId, { locale, spotId, type: "CHARACTER" })),
    })),
  );

  for (const { storyId, items } of storiesWithItems) {
    const item = options.collectionItemId
      ? items.find((candidate) => candidate.collectionItemId === options.collectionItemId)
      : items.find((candidate) => !options.requireAcquired || candidate.isAcquired);

    if (!item || (options.requireAcquired && !item.isAcquired)) continue;

    return {
      spotId: String(spotId),
      storyId: String(storyId),
      collectionItemId: String(item.collectionItemId),
    };
  }

  return {};
}
