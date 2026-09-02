import { useSyncExternalStore } from "react";

import {
  getHiddenAlbumPhotoIdsSnapshot,
  hydrateHiddenAlbumPhotos,
  subscribeHiddenAlbumPhotos,
} from "@/lib/hidden-album-photos";

// Re-renders the caller whenever a photo is hidden ("deleted"), returning a
// snapshot Set whose identity changes only on an actual change so downstream
// useMemo()s keyed on it recompute. The album grid, the photo viewer, and the
// 부여세컷 picker all use this so a delete shows up everywhere without a refetch.
export function useHiddenAlbumPhotoIds(): ReadonlySet<number> {
  return useSyncExternalStore((onChange) => {
    hydrateHiddenAlbumPhotos();
    return subscribeHiddenAlbumPhotos(onChange);
  }, getHiddenAlbumPhotoIdsSnapshot);
}
