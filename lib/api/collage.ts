import { File, Paths } from "expo-file-system";

import { apiGet, apiPost, refreshAuthHeaders, toApiUrl } from "@/lib/api/client";

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
// written straight to a local cache file, which is what expo-sharing /
// expo-media-library need anyway (neither accepts a remote URL).
//
// Uses fetch (not File.downloadFileAsync) because the latter doesn't forward
// the Authorization header, so these auth-required endpoints came back 401.
// Swagger doesn't declare the image format; named .jpg to match this app's
// other selfie/collage image handling, which is JPEG throughout.
async function downloadCollageBinary(collageId: number, endpoint: "download" | "file", filename: string): Promise<string> {
  const headers = (await refreshAuthHeaders()) ?? {};
  const response = await fetch(toApiUrl(`/api/collages/${collageId}/${endpoint}`), { headers });
  if (!response.ok) {
    throw new Error(`collage ${endpoint} download failed (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  return file.uri;
}

export function downloadCollageFile(collageId: number): Promise<string> {
  return downloadCollageBinary(collageId, "download", `collage-${collageId}.jpg`);
}

export function getCollageFile(collageId: number): Promise<string> {
  return downloadCollageBinary(collageId, "file", `collage-${collageId}-share.jpg`);
}
