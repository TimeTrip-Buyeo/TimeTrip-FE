import type { Locale } from "@/constants/translations";
import { ApiError, apiGet, apiPost } from "@/lib/api/client";

export type CollectionItemType = "CHARACTER" | "ARTIFACT";

export type CollectionItem = {
  collectionItemId: number;
  storyId: number;
  spotId: number;
  spotName?: string | null;
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
  shortDescription: string | null;
  summary?: string | null;
  location: string | null;
  period: string | null;
  mainFeature: string | null;
  description: string;
  sourceCredit: string | null;
  sourceInstitution?: string | null;
  sourceAgency?: string | null;
  institutionName?: string | null;
  museumName?: string | null;
  sourceSite?: string | null;
  sourceSiteName?: string | null;
  siteName?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  audioFiles: {
    language: string;
    filePath: string;
    durationSec: number;
    script?: string | null;
  }[];
  isAcquired: boolean;
  acquiredAt: string | null;
};

export type StoryTopic = {
  storyIds: number[];
  storyId?: number;
  spotId?: number;
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
  // /api/collections/{storyId} localizes these even though the list endpoint
  // (/api/collections) doesn't localize StoryTopic.title.
  title?: string | null;
  storyTitle?: string | null;
  name?: string | null;
};

export async function getStoryTopics(options: {
  locale: Locale;
  spotId?: number;
  storyType?: "special" | "normal";
}): Promise<StoryTopic[]> {
  const params = new URLSearchParams({ language: options.locale });
  if (options.spotId !== undefined) params.set("spotId", String(options.spotId));
  if (options.storyType) params.set("storyType", options.storyType);

  const result = await apiGet<StoryTopicListResponse | StoryTopic[]>(`/api/collections?${params.toString()}`);
  const raw = Array.isArray(result) ? result : result.stories ?? result.topics ?? [];
  const topics = raw.map(normalizeStoryTopic).filter((topic) => topic.storyIds.length > 0);

  // The list endpoint returns titles in Korean whatever the language. Pull the
  // localized title from each story's own /api/collections/{storyId} response
  // (same trick the album screen uses via getCollectionItemDetail).
  //
  // Guarded so it's a no-op — no extra requests — when it isn't needed: for
  // Korean, and for titles that already came back non-Korean (i.e. the list
  // endpoint DID localize, or there's just nothing to translate). So the day
  // /api/collections localizes titles itself, this whole fan-out disappears
  // on its own and the N+1 can then be deleted.
  if (options.locale === "ko") return topics;
  return Promise.all(
    topics.map(async (topic) => {
      if (!HANGUL_RE.test(topic.title)) return topic;
      try {
        const detail = await apiGet<CollectionItemListResponse>(
          `/api/collections/${topic.storyIds[0]}?language=${encodeURIComponent(options.locale)}`,
        );
        const localized = detail.title ?? detail.storyTitle ?? detail.name;
        return localized && !HANGUL_RE.test(localized) ? { ...topic, title: localized } : topic;
      } catch {
        return topic;
      }
    }),
  );
}

const HANGUL_RE = /[가-힣]/;

function normalizeStoryTopic(topic: StoryTopic): StoryTopic {
  if (Array.isArray(topic.storyIds)) {
    return {
      ...topic,
      storyIds: normalizeStoryIds(topic.storyIds),
    };
  }

  return {
    ...topic,
    storyIds: normalizeStoryIds(topic.storyId !== undefined ? [topic.storyId] : []),
  };
}

function normalizeStoryIds(storyIds: number[]) {
  return [...new Set(storyIds.filter((storyId) => Number.isInteger(storyId) && storyId > 0))];
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

export type AcquireCollectionItemResult = {
  userCollectionId: number;
  collectionItemId: number;
  name: string;
  type: CollectionItemType;
  isCharacter: boolean;
  cardImageUrl: string | null;
  acquiredAt: string;
  popupTitle: string;
  popupMessage: string;
};

// 409 COLLECTION4091 means "already acquired" — per spec this is silently
// ignored (no error toast), so callers get null instead of a thrown error.
export async function acquireCollectionItem(collectionItemId: number): Promise<AcquireCollectionItemResult | null> {
  try {
    return await apiPost<AcquireCollectionItemResult>(`/api/collections/items/${collectionItemId}/acquire`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "COLLECTION4091") return null;
    throw error;
  }
}

export function getCollectionItemDetail(
  collectionItemId: number,
  options: { locale: Locale },
): Promise<CollectionItemDetail> {
  const params = new URLSearchParams({ language: options.locale });
  return apiGet<CollectionItemDetail>(`/api/collections/items/${collectionItemId}?${params.toString()}`);
}
