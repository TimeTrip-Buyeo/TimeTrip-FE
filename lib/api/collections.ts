import type { Locale } from "@/constants/translations";
import { apiGet, apiPost } from "@/lib/api/client";

export type CollectionItemType = "CHARACTER" | "ARTIFACT";

export type CollectionItem = {
  collectionItemId: number;
  storyId: number;
  spotId: number;
  name: string;
  type: CollectionItemType;
  isCharacter: boolean;
  cardImageUrl: string | null;
  beforeImageUrl: string | null;
  isAcquired: boolean;
  acquiredAt: string | null;
};

export type CollectionItemDetail = {
  collectionItemId: number;
  storyId: number;
  spotId: number;
  spotName: string;
  name: string;
  type: CollectionItemType;
  isCharacter: boolean;
  cardImageUrl: string | null;
  detailImageUrl: string | null;
  description: string;
  sourceCredit: string | null;
  audioFiles: {
    language: string;
    filePath: string;
    durationSec: number;
  }[];
  isAcquired: boolean;
  acquiredAt: string | null;
};

export type CollectionItemAcquireResponse = {
  userCollectionId: number;
  collectionItemId: number;
  name: string;
  type: CollectionItemType | string;
  isCharacter: boolean;
  cardImageUrl: string | null;
  acquiredAt: string;
  popupTitle: string;
  popupMessage: string;
};

export type CollectionItemPose = {
  id: number;
  name: string;
  poseImageUrl: string | null;
  thumbnailUrl: string | null;
  sortOrder: number | null;
};

export type StoryTopic = {
  storyId: number;
  spotId: number;
  title: string;
  thumbnailUrl: string | null;
  totalCollectionCount: number;
  acquiredCollectionCount: number;
  progressRate: number;
};

type StoryTopicListResponse = {
  stories?: StoryTopic[];
  topics?: StoryTopic[];
};

type CollectionItemListResponse = {
  items: CollectionItem[];
};

type CollectionItemPoseListResponse = {
  collectionItemId: number;
  poses: CollectionItemPose[];
};

export function getStoryTopics(options: {
  locale: Locale;
  spotId?: number;
  storyType?: "special" | "normal";
}): Promise<StoryTopic[]> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.spotId !== undefined) params.set("spotId", String(options.spotId));
  if (options.storyType) params.set("storyType", options.storyType);

  return apiGet<StoryTopicListResponse | StoryTopic[]>(`/api/collections?${params.toString()}`).then((result) => {
    if (Array.isArray(result)) return result;
    return result.stories ?? result.topics ?? [];
  });
}

export function getCollectionItems(
  storyId: number,
  options: { locale: Locale; spotId?: number; type?: CollectionItemType },
): Promise<CollectionItemListResponse> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.spotId !== undefined) params.set("spotId", String(options.spotId));
  if (options.type) params.set("type", options.type);

  return apiGet<CollectionItemListResponse>(`/api/collections/${storyId}?${params.toString()}`);
}

export function getCollectionItemDetail(
  collectionItemId: number,
  options: { locale: Locale },
): Promise<CollectionItemDetail> {
  const params = new URLSearchParams({ language: options.locale });
  return apiGet<CollectionItemDetail>(`/api/collections/items/${collectionItemId}?${params.toString()}`);
}

export function acquireCollectionItem(collectionItemId: number): Promise<CollectionItemAcquireResponse> {
  return apiPost<CollectionItemAcquireResponse>(`/api/collections/items/${collectionItemId}/acquire`);
}

export function getCollectionItemPoses(
  collectionItemId: number,
  options: { locale: Locale },
): Promise<CollectionItemPoseListResponse> {
  const params = new URLSearchParams({ language: options.locale });
  return apiGet<CollectionItemPoseListResponse>(`/api/collection-items/${collectionItemId}/poses?${params.toString()}`);
}
