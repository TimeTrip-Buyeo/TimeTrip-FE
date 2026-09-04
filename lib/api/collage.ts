import { File, Paths } from "expo-file-system";

import { apiGet, apiPost, getAuthHeaders, toApiUrl } from "@/lib/api/client";

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

// /download and /file both respond with a raw binary image (no {isSuccess,...}
// envelope, per Swagger — format: binary), so apiGet can't parse them. They're
// downloaded straight to a local cache file instead, which is what
// expo-sharing/expo-media-library need anyway (neither accepts a remote URL).
// Swagger doesn't declare the image format; named .jpg to match this app's
// other selfie/collage image handling (photo-save.tsx, selfies.ts), which is
// JPEG throughout.
async function downloadCollageBinary(collageId: number, endpoint: "download" | "file", filename: string): Promise<string> {
  const headers = await getAuthHeaders();
  const destination = new File(Paths.cache, filename);
  const file = await File.downloadFileAsync(toApiUrl(`/api/collages/${collageId}/${endpoint}`), destination, {
    headers,
    idempotent: true,
  });
  return file.uri;
}

export function downloadCollageFile(collageId: number): Promise<string> {
  return downloadCollageBinary(collageId, "download", `collage-${collageId}.jpg`);
}

export function getCollageFile(collageId: number): Promise<string> {
  return downloadCollageBinary(collageId, "file", `collage-${collageId}-share.jpg`);
}
