import { ApiError, apiGet } from "@/lib/api/client";
import type { Locale } from "@/constants/translations";

export type SpotType = "MAIN" | "TOUR";

export type Spot = {
  id: number;
  nameKo: string;
  nameEn: string | null;
  nameJp: string | null;
  nameZh: string | null;
  latitude: number;
  longitude: number;
  thumbnailUrl: string | null;
  spotType: SpotType;
};

export type SpotDetail = Spot & {
  address: string;
  /** Canonical special/basic-guide flag for the current month — prefer this
      over deriving it from getSpotStory's storyType (that endpoint's story
      data can drift from this field). */
  currentStoryType?: SpotStoryType | Uppercase<SpotStoryType> | null;
};

export type SpotStoryType = "special" | "normal";

export type SpotStory = {
  storyId: number;
  spotId: number;
  month: number;
  title: string;
  storyType: SpotStoryType;
  locationLabel: string;
  audioGuide: {
    audioGuideId: number;
    title: string;
    language: string;
    filePath: string;
    durationSec: number;
  } | null;
};

export function getSpots(): Promise<Spot[]> {
  return apiGet<Spot[]>("/api/spots");
}

export function getSpotDetail(spotId: number): Promise<SpotDetail> {
  return apiGet<SpotDetail>(`/api/spots/${spotId}`);
}

export async function getSpotStory(spotId: number, locale: Locale, month?: number): Promise<SpotStory | null> {
  try {
    const params = new URLSearchParams({ language: locale });
    if (month !== undefined) params.set("month", String(month));

    return await apiGet<SpotStory>(`/api/spots/${spotId}/story?${params.toString()}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "STORY_404") {
      return null;
    }
    throw error;
  }
}

export function isCurrentSpecialSpot(spot: SpotDetail | null | undefined) {
  return spot?.currentStoryType?.toLowerCase() === "special";
}

export type SpotTimeslip = {
  spotId: number;
  spotName: string;
  overlayImageUrl: string | null;
  guideText: string;
  storyId: number;
  storyTitle: string;
  collectionItem: {
    collectionItemId: number;
    name: string;
    cardImageUrl: string | null;
    beforeImageUrl: string | null;
    isAcquired: boolean;
  };
  audioGuide: StoryAudioGuide | null;
};

export async function getSpotTimeslip(
  spotId: number,
  options: { month?: number; language?: string } = {},
): Promise<SpotTimeslip | null> {
  try {
    const params = new URLSearchParams();
    if (options.month !== undefined) params.set("month", String(options.month));
    if (options.language) params.set("language", options.language);
    const query = params.toString();

    return await apiGet<SpotTimeslip>(`/api/spots/${spotId}/timeslip${query ? `?${query}` : ""}`);
  } catch (error) {
    if (error instanceof ApiError && error.code === "TIMESLIP4041") return null;
    throw error;
  }
}

export type StoryAudioGuide = {
  audioGuideId: number | null;
  storyId?: number | null;
  externalAudioGuideId?: string | null;
  source?: "odii" | "db";
  title: string;
  language: string;
  filePath: string;
  durationSec: number;
  script: string;
  availableLanguages?: string[];
};

export async function getStoryAudioGuide(
  storyId: number,
  options: { language?: string } = {},
): Promise<StoryAudioGuide | null> {
  try {
    const params = new URLSearchParams();
    if (options.language) params.set("language", options.language);
    const query = params.toString();

    return await apiGet<StoryAudioGuide>(`/api/stories/${storyId}/audio-guide${query ? `?${query}` : ""}`);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "AUDIO4041" || error.code === "STORY_404")) return null;
    throw error;
  }
}

export async function getSpotAudioGuide(
  spotId: number,
  options: { language?: string } = {},
): Promise<StoryAudioGuide | null> {
  try {
    const params = new URLSearchParams();
    if (options.language) params.set("language", options.language);
    const query = params.toString();

    return await apiGet<StoryAudioGuide>(`/api/spots/${spotId}/audio-guide${query ? `?${query}` : ""}`);
  } catch (error) {
    if (error instanceof ApiError && (error.code === "AUDIO4041" || error.code === "SPOT4041")) return null;
    throw error;
  }
}

export function getLocalizedSpotName(spot: Spot | SpotDetail, locale: Locale) {
  if (locale === "en") return spot.nameEn || spot.nameKo;
  if (locale === "ja") return spot.nameJp || spot.nameKo;
  if (locale === "zh") return spot.nameZh || spot.nameKo;
  return spot.nameKo;
}
