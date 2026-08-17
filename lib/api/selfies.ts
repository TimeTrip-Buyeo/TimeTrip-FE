import { apiGet, apiMultipartPost } from "@/lib/api/client";
import type { Locale } from "@/constants/translations";

export type SelfiePhotoSaveResponse = {
  selfiePhotoId: number;
  photoUrl: string;
  spotName: string;
  storyTitle: string;
  locationLabel: string;
  takenAt: string;
  collectionAcquired: boolean;
  acquiredItem: {
    id: number;
    name: string;
    cardImageUrl: string | null;
  } | null;
  selectedPose: {
    id: number;
    name: string;
    poseImageUrl: string | null;
    thumbnailUrl: string | null;
    sortOrder: number | null;
  } | null;
};

export type SelfiePhotoOption = {
  selfiePhotoId: number;
  photoUrl: string;
  collectionItemId: number;
  collectionItemName: string;
  spotId: number;
  spotName: string;
  takenAt: string;
};

type SelfiePhotoOptionListResponse = {
  selfiePhotos: SelfiePhotoOption[];
};

export type SaveSelfiePhotoRequest = {
  spotId: number;
  collectionItemId: number;
  storyId: number;
  poseId?: number;
  photoUri: string;
};

export function saveSelfiePhoto(request: SaveSelfiePhotoRequest): Promise<SelfiePhotoSaveResponse> {
  const formData = new FormData();
  formData.append("spotId", String(request.spotId));
  formData.append("collectionItemId", String(request.collectionItemId));
  formData.append("storyId", String(request.storyId));
  if (request.poseId !== undefined) formData.append("poseId", String(request.poseId));
  formData.append("photo", {
    uri: request.photoUri,
    name: `selfie-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);

  return apiMultipartPost<SelfiePhotoSaveResponse>("/api/selfie-photos", formData);
}

export function getSelfiePhotoOptions(options: {
  locale: Locale;
  collectionItemId?: number;
  spotId?: number;
}): Promise<SelfiePhotoOptionListResponse> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.collectionItemId !== undefined) params.set("collectionItemId", String(options.collectionItemId));
  if (options.spotId !== undefined) params.set("spotId", String(options.spotId));

  return apiGet<SelfiePhotoOptionListResponse>(`/api/collages/selfie-photos?${params.toString()}`);
}
