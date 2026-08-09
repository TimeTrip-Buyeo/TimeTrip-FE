import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { LocationId } from "@/constants/locations";

export type CapturedPhoto = {
  id: string;
  locationId: LocationId;
  poseId: string;
  poseLabel: string;
  /** file:// URI from expo-camera's takePictureAsync — the un-composited camera frame. */
  uri: string;
  takenAt: number;
};

type CapturedPhotosContextValue = {
  photosByLocation: Partial<Record<LocationId, CapturedPhoto[]>>;
  addPhoto: (photo: Omit<CapturedPhoto, "id" | "takenAt">) => CapturedPhoto;
  removePhoto: (locationId: LocationId, photoId: string) => void;
  clearLocationPhotos: (locationId: LocationId) => void;
  reorderPhotos: (locationId: LocationId, orderedIds: string[]) => void;
};

const CapturedPhotosContext = createContext<CapturedPhotosContextValue | null>(null);

// In-memory only — this project has no persistent storage module wired up
// yet (AsyncStorage / expo-file-system would need a new dev-client build).
// Captured photos live for the current app session and populate the album
// grid immediately; they're gone on a full app restart until that lands.
export function CapturedPhotosProvider({ children }: { children: ReactNode }) {
  const [photosByLocation, setPhotosByLocation] = useState<Partial<Record<LocationId, CapturedPhoto[]>>>({});

  const addPhoto = useCallback((photo: Omit<CapturedPhoto, "id" | "takenAt">) => {
    const saved: CapturedPhoto = { ...photo, id: `${Date.now()}-${Math.random()}`, takenAt: Date.now() };
    setPhotosByLocation((prev) => ({
      ...prev,
      [photo.locationId]: [saved, ...(prev[photo.locationId] ?? [])],
    }));
    return saved;
  }, []);

  const removePhoto = useCallback((locationId: LocationId, photoId: string) => {
    setPhotosByLocation((prev) => ({
      ...prev,
      [locationId]: (prev[locationId] ?? []).filter((item) => item.id !== photoId),
    }));
  }, []);

  const clearLocationPhotos = useCallback((locationId: LocationId) => {
    setPhotosByLocation((prev) => ({ ...prev, [locationId]: [] }));
  }, []);

  const reorderPhotos = useCallback((locationId: LocationId, orderedIds: string[]) => {
    setPhotosByLocation((prev) => {
      const existing = prev[locationId] ?? [];
      const byId = new Map(existing.map((item) => [item.id, item]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((item): item is CapturedPhoto => !!item);
      return { ...prev, [locationId]: reordered };
    });
  }, []);

  const value = useMemo(
    () => ({ photosByLocation, addPhoto, removePhoto, clearLocationPhotos, reorderPhotos }),
    [photosByLocation, addPhoto, removePhoto, clearLocationPhotos, reorderPhotos],
  );

  return <CapturedPhotosContext.Provider value={value}>{children}</CapturedPhotosContext.Provider>;
}

export function useCapturedPhotos() {
  const ctx = useContext(CapturedPhotosContext);
  if (!ctx) throw new Error("useCapturedPhotos must be used within CapturedPhotosProvider");
  return ctx;
}
