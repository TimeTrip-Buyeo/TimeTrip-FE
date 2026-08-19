import type { Locale } from "@/constants/translations";
import { apiGet, apiMultipartPost } from "@/lib/api/client";

export type TimeslipOverlay = {
  spotId: number;
  spotName: string;
  overlayImageUrl: string | null;
  guideText: string | null;
  storyId: number;
  storyTitle: string;
  collectionItem: {
    collectionItemId: number;
    name: string;
    cardImageUrl: string | null;
    beforeImageUrl: string | null;
    isAcquired: boolean;
  };
  audioGuide: {
    audioGuideId: number;
    title: string;
    language: string;
    filePath: string;
    durationSec: number;
  } | null;
};

export type TimeslipPhotoSaveResponse = {
  timeslipPhotoId: number;
  resultPhotoUrl: string;
  overlayImageUrl: string | null;
  storyTitle: string;
  takenAt: string;
};

export function getTimeslipOverlay(
  spotId: number,
  options: { locale: Locale; month?: number },
): Promise<TimeslipOverlay> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.month !== undefined) params.set("month", String(options.month));
  return apiGet<TimeslipOverlay>(`/api/spots/${spotId}/timeslip?${params.toString()}`);
}

export function saveTimeslipPhoto(request: {
  spotId: number;
  storyId: number;
  photoUri: string;
}): Promise<TimeslipPhotoSaveResponse> {
  const formData = new FormData();
  formData.append("spotId", String(request.spotId));
  formData.append("storyId", String(request.storyId));
  formData.append("photo", {
    uri: request.photoUri,
    name: `timeslip-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);

  return apiMultipartPost<TimeslipPhotoSaveResponse>("/api/timeslip-photos", formData);
}
