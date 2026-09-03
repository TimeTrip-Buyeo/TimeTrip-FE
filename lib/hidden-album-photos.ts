import * as SecureStore from "expo-secure-store";

// Frontend-only "delete": the selfie photo stays on the server (there's no
// delete endpoint yet), but its id is remembered here so the album grid, the
// photo viewer, and the 부여세컷 picker all filter it out — permanently, since
// this is persisted to the device. Cleared on app uninstall.
const STORAGE_KEY = "album.hiddenSelfiePhotoIds";

const hiddenIds = new Set<number>();
const listeners = new Set<() => void>();
// A referentially-stable snapshot for useSyncExternalStore — new identity only
// when the contents change.
let snapshot: ReadonlySet<number> = new Set();
let hydrated = false;
let hydrating: Promise<void> | null = null;

function refreshSnapshotAndNotify() {
  snapshot = new Set(hiddenIds);
  listeners.forEach((listener) => listener());
}

export function hydrateHiddenAlbumPhotos(): Promise<void> {
  if (hydrated) return Promise.resolve();
  if (hydrating) return hydrating;

  hydrating = SecureStore.getItemAsync(STORAGE_KEY)
    .then((raw) => {
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => {
            if (typeof id === "number" && Number.isFinite(id)) hiddenIds.add(id);
          });
        }
      }
    })
    .catch((error) => {
      console.error("[album] failed to load hidden photo ids", error);
    })
    .finally(() => {
      hydrated = true;
      hydrating = null;
      if (hiddenIds.size > 0) refreshSnapshotAndNotify();
    });

  return hydrating;
}

export function hideAlbumPhoto(selfiePhotoId: number) {
  if (hiddenIds.has(selfiePhotoId)) return;
  hiddenIds.add(selfiePhotoId);
  refreshSnapshotAndNotify();
  SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify([...hiddenIds])).catch((error) => {
    console.error("[album] failed to persist hidden photo ids", error);
  });
}

export function getHiddenAlbumPhotoIdsSnapshot(): ReadonlySet<number> {
  return snapshot;
}

export function subscribeHiddenAlbumPhotos(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
