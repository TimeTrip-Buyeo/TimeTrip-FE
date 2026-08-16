import type { Locale } from "@/constants/translations";
import { apiGet } from "@/lib/api/client";

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

type CollectionItemListResponse = {
  items: CollectionItem[];
};

export function getCollectionItems(
  storyId: number,
  options: { locale: Locale; spotId?: number; type?: CollectionItemType },
): Promise<CollectionItemListResponse> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.spotId !== undefined) params.set("spotId", String(options.spotId));
  if (options.type) params.set("type", options.type);

  return apiGet<CollectionItemListResponse>(`/api/collections/${storyId}?${params.toString()}`);
}
