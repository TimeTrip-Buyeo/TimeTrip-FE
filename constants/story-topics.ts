import type { Locale } from "./translations";

// /api/collections returns story-topic titles in Korean regardless of the
// language param, so translate the known ones here. Keyed by the exact Korean
// string the backend sends; add an entry when a new untranslated title shows up.
const STORY_TOPIC_TITLES: Record<string, Record<Locale, string>> = {
  "사비함락과 백제 멸망": {
    ko: "사비함락과 백제 멸망",
    en: "The Fall of Sabi and the End of Baekje",
    zh: "泗沘陷落与百济灭亡",
    ja: "泗沘陥落と百済滅亡",
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

export function localizeStoryTopicTitle(title: string, locale: Locale): string {
  return STORY_TOPIC_TITLES[title.trim()]?.[locale] ?? title;
}
