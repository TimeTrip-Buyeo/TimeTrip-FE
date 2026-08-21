import { apiGet, apiPost } from "@/lib/api/client";

export type CollageSummaryResponse = {
  collageId: number;
  thumbnailUrl: string;
  createdAt: string;
};

export type CollageListResponse = {
  collages: CollageSummaryResponse[];
};

export type CollagePhotoResponse = {
  selfiePhotoId: number;
  photoUrl: string;
  slotNumber: number;
};

export type CollageDetailResponse = {
  collageId: number;
  imageUrl: string;
  frameId: number;
  frameImageUrl: string;
  photos: CollagePhotoResponse[];
  createdAt: string;
  shareable: boolean;
};

export type SelfiePhotoOptionResponse = {
  selfiePhotoId: number;
  photoUrl: string;
  collectionItemId: number;
  collectionItemName: string;
  spotId: number;
  spotName: string;
  takenAt: string;
};

export type SelfiePhotoOptionListResponse = {
  selfiePhotos: SelfiePhotoOptionResponse[];
};

export type FrameResponse = {
  frameId: number;
  name: string;
  frameImageUrl: string;
};

export type FrameListResponse = {
  frames: FrameResponse[];
};

export function getCollages(): Promise<CollageListResponse> {
  return apiGet<CollageListResponse>("/api/collages");
}

export function getCollageDetail(collageId: number): Promise<CollageDetailResponse> {
  return apiGet<CollageDetailResponse>(`/api/collages/${collageId}`);
}

export function getSelfiePhotoOptions(
  collectionItemId?: number,
  spotId?: number,
  language?: string,
): Promise<SelfiePhotoOptionListResponse> {
  const params = new URLSearchParams();
  if (collectionItemId !== undefined) params.set("collectionItemId", String(collectionItemId));
  if (spotId !== undefined) params.set("spotId", String(spotId));
  if (language) params.set("language", language);
  const query = params.toString();
  return apiGet<SelfiePhotoOptionListResponse>(`/api/collages/selfie-photos${query ? `?${query}` : ""}`);
}

export function getFrames(): Promise<FrameListResponse> {
  return apiGet<FrameListResponse>("/api/collages/frames");
}

export type CollageCreateResponse = {
  collageId: number;
  imageUrl: string;
  frameId: number;
  frameImageUrl: string;
  createdAt: string;
  shareable: boolean;
};

export function createCollage(selfiePhotoIds: number[], frameId?: number): Promise<CollageCreateResponse> {
  return apiPost<CollageCreateResponse>("/api/collages", { selfiePhotoIds, frameId });
}
