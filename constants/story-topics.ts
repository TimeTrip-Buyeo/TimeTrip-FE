import type { Locale } from "./translations";

// /api/collections returns story-topic titles in Korean regardless of the
// language param, so translate the known ones here. Add an entry when a new
// untranslated title shows up — matching ignores whitespace differences.
const STORY_TOPIC_TITLES: Record<string, Record<Locale, string>> = {
  "사비함락과 백제 멸망": {
    ko: "사비함락과 백제 멸망",
    en: "The Fall of Sabi and the End of Baekje",
    zh: "泗沘陷落与百济灭亡",
    ja: "泗沘陥落と百済滅亡",
  },
  "사비천도와 백제 중흥": {
    ko: "사비천도와 백제 중흥",
    en: "The Sabi Relocation and Baekje's Revival",
    zh: "泗沘迁都与百济中兴",
    ja: "泗沘遷都と百済の中興",
  },
  "왕실의례 사찰창건": {
    ko: "왕실의례 사찰창건",
    en: "Royal Rites & Temple Founding",
    zh: "王室礼仪与寺庙创建",
    ja: "王室儀礼と寺院創建",
  },
  "사비천도와 왕도의 시작": {
    ko: "사비천도와 왕도의 시작",
    en: "Sabi Relocation & the New Capital",
    zh: "泗沘迁都与王都的开始",
    ja: "泗沘遷都と王都の始まり",
  },
};

const stripSpaces = (value: string) => value.replace(/\s+/g, "");

const NORMALIZED_TITLES: Record<string, Record<Locale, string>> = Object.fromEntries(
  Object.entries(STORY_TOPIC_TITLES).map(([key, value]) => [stripSpaces(key), value]),
);

export function localizeStoryTopicTitle(title: string | null | undefined, locale: Locale): string {
  if (!title) return title ?? "";
  return NORMALIZED_TITLES[stripSpaces(title)]?.[locale] ?? title;
}
