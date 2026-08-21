import type { LocationId } from "@/constants/locations";
import type { Locale } from "@/constants/translations";
import type { SelfiePhotoOption } from "@/lib/api/selfies";

export type RemoteAlbumPhoto = SelfiePhotoOption & {
  id: string;
  uri: string;
};

type RemoteAlbumPhotoCacheEntry = {
  photos: RemoteAlbumPhoto[];
  cachedAt: number;
};

const cache = new Map<string, RemoteAlbumPhotoCacheEntry>();
const REMOTE_ALBUM_CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(locationId: LocationId, locale: Locale) {
  return `${locationId}:${locale}`;
}

export function getCachedRemoteAlbumPhotos(locationId: LocationId, locale: Locale) {
  const key = cacheKey(locationId, locale);
  const entry = cache.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.cachedAt > REMOTE_ALBUM_CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }

  return entry;
}

export function setCachedRemoteAlbumPhotos(locationId: LocationId, locale: Locale, photos: RemoteAlbumPhoto[]) {
  cache.set(cacheKey(locationId, locale), { photos, cachedAt: Date.now() });
}

// Called on logout so a different account signing in during the same app
// session never sees the previous account's cached selfie thumbnails.
export function clearRemoteAlbumPhotoCache() {
  cache.clear();
}
