import { apiGet } from "@/lib/api/client";

export type AlbumResponse = {
  collectionItemId: number;
  name: string;
  spotName: string;
  thumbnailUrl: string;
  photoCount: number;
  isLocked: boolean;
};

export type AlbumListResponse = {
  albums: AlbumResponse[];
};

export type AlbumPhotoResponse = {
  selfiePhotoId: number;
  photoUrl: string;
  takenAt: string;
};

export type AlbumPhotoListResponse = {
  collectionItemId: number;
  name: string;
  photos: AlbumPhotoResponse[];
};

export type AlbumPhotoDetailResponse = {
  selfiePhotoId: number;
  userId: number;
  collectionItemId: number;
  personName: string;
  spotName: string;
  photoUrl: string;
  takenAt: string;
  shareable: boolean;
};

function languageQuery(language?: string): string {
  return language ? `?language=${encodeURIComponent(language)}` : "";
}

export function getAlbums(language?: string): Promise<AlbumListResponse> {
  return apiGet<AlbumListResponse>(`/api/albums${languageQuery(language)}`);
}

export function getAlbumPhotos(collectionItemId: number, language?: string): Promise<AlbumPhotoListResponse> {
  return apiGet<AlbumPhotoListResponse>(`/api/albums/${collectionItemId}/photos${languageQuery(language)}`);
}

export function getAlbumPhotoDetail(selfiePhotoId: number, language?: string): Promise<AlbumPhotoDetailResponse> {
  return apiGet<AlbumPhotoDetailResponse>(`/api/albums/photos/${selfiePhotoId}${languageQuery(language)}`);
}
