import type { LocationId } from "@/constants/locations";
import type { Locale } from "@/constants/translations";
import type { SelfiePhotoOption } from "@/lib/api/selfies";

export type RemoteAlbumPhoto = SelfiePhotoOption & {
  id: string;
  uri: string;
};

type RemoteAlbumPhotoCacheEntry = {
  photos: RemoteAlbumPhoto[];
};

const cache = new Map<string, RemoteAlbumPhotoCacheEntry>();

function cacheKey(locationId: LocationId, locale: Locale) {
  return `${locationId}:${locale}`;
}

export function getCachedRemoteAlbumPhotos(locationId: LocationId, locale: Locale) {
  return cache.get(cacheKey(locationId, locale));
}

export function setCachedRemoteAlbumPhotos(locationId: LocationId, locale: Locale, photos: RemoteAlbumPhoto[]) {
  cache.set(cacheKey(locationId, locale), { photos });
}

// Called on logout so a different account signing in during the same app
// session never sees the previous account's cached selfie thumbnails.
export function clearRemoteAlbumPhotoCache() {
  cache.clear();
}
