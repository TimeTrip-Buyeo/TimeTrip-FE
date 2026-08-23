import { LOCATION_ID_TO_SPOT_ID, MAP_LOCATIONS, SPOT_ID_TO_LOCATION_ID, type LocationId } from "@/constants/locations";
import type { Locale } from "@/constants/translations";
import { getCollectionItems, getStoryTopics } from "@/lib/api/collections";

const KNOWN_LOCATION_IDS = new Set<string>(MAP_LOCATIONS.map((location) => location.id));

export const PERSON_OVERLAY_HEIGHT_RATIO = 0.5;

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
  const storiesWithItems = await Promise.all(
    stories.flatMap((story) =>
      story.storyIds.map(async (storyId) => ({
        storyId,
        ...(await getCollectionItems(storyId, { locale, spotId, type: "CHARACTER" })),
      })),
    ),
  );

  for (const { storyId, items } of storiesWithItems) {
    const item = options.collectionItemId
      ? items.find((candidate) => candidate.collectionItemId === options.collectionItemId)
      : items[0];

    if (!item || (options.requireAcquired && !item.isAcquired)) continue;

    return {
      spotId: String(spotId),
      storyId: String(storyId),
      collectionItemId: String(item.collectionItemId),
    };
  }

  return {};
}
