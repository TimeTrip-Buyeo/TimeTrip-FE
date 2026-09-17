import type { ImageSourcePropType } from "react-native";

import type { LocationId } from "./locations";
import type { Locale } from "./translations";

export type CollectibleType = "person" | "artifact";

export type CollectibleData = {
  type: CollectibleType;
  image: ImageSourcePropType;
  name: Record<Locale, string>;
  /** Person: reign/rank shown directly under the name. Artifact: excavation site (labeled "발굴 위치"). */
  primaryLine: Record<Locale, string>;
  /** Person: labeled "생애". Artifact: labeled "제작 시기". */
  secondaryLabelKey: "lifespan" | "productionPeriod";
  secondaryLine: Record<Locale, string>;
  description: Record<Locale, string>;
  /**
   * Whether this location's collectible has been obtained yet (mocked to
   * match Figma's "도감" list, node 0:1148, which shows 법왕/성왕 unlocked but
   * a 능산리 고분군-labeled slot still locked). Locked entries just show the
   * "?" placeholder card — no image.
   */
  obtained: boolean;
};

// Content matches the Figma "Screen 3: 컬렉션(인물)" / "컬렉션(유물)" frames
// (node 0:851 / 0:788) as closely as the source file specifies. 법왕's
// description is literally "설명...." in Figma — kept as-is rather than
// invented. 성왕's role/lifespan aren't authored in Figma at all; filled in
// from well-documented Baekje history pending real copy from the design team.
export const COLLECTIBLES: Partial<Record<LocationId, CollectibleData>> = {
  pagoda: {
    type: "person",
    image: require("@/assets/images/collection/pagoda-beopwang.png"),
    name: { ko: "법왕", en: "King Beopwang", zh: "法王", ja: "法王" },
    primaryLine: {
      ko: "백제 제29대 국왕",
      en: "29th King of Baekje",
      zh: "百济第29代国王",
      ja: "百済第29代国王",
    },
    secondaryLabelKey: "lifespan",
    secondaryLine: { ko: "미상 ~6세기", en: "Unknown – 6th century", zh: "不详 ~6世纪", ja: "不詳 ~6世紀" },
    // Kept as the literal Figma placeholder ("설명....") rather than invented
    // copy, per this project's own precedent — see the comment on
    // COLLECTIBLES below.
    description: { ko: "설명....", en: "Description....", zh: "说明....", ja: "説明...." },
    obtained: true,
  },
  royalTombs: {
    type: "artifact",
    image: require("@/assets/images/collection/royaltombs-incense-burner.png"),
    name: {
      ko: "백제금동대향로",
      en: "Baekje Gilt-bronze Incense Burner",
      zh: "百济金铜大香炉",
      ja: "百済金銅大香炉",
    },
    primaryLine: {
      ko: "부여 능산리 사지",
      en: "Neungsan-ri Temple Site, Buyeo",
      zh: "扶余陵山里寺址",
      ja: "扶余陵山里寺址",
    },
    secondaryLabelKey: "productionPeriod",
    secondaryLine: {
      ko: "6세기 말 - 7세기 초",
      en: "Late 6th – early 7th century",
      zh: "6世纪末－7世纪初",
      ja: "6世紀末～7世紀初",
    },
    description: {
      ko: "국보 제287호. 백제의 우수한 금속 공예 기술과 도교, 불교 사상이 융합된 걸작입니다.",
      en: "National Treasure No. 287. A masterpiece blending Baekje's outstanding metalcraft with Taoist and Buddhist thought.",
      zh: "国宝第287号。融合了百济卓越金属工艺与道教、佛教思想的杰作。",
      ja: "国宝第287号。百済の優れた金属工芸技術と道教・仏教思想が融合した傑作です。",
    },
    obtained: true,
  },
  busosanseong: {
    type: "person",
    image: require("@/assets/images/collection/busosanseong-seongwang.png"),
    name: { ko: "성왕", en: "King Seongwang", zh: "圣王", ja: "聖王" },
    primaryLine: {
      ko: "백제 제26대 국왕",
      en: "26th King of Baekje",
      zh: "百济第26代国王",
      ja: "百済第26代国王",
    },
    secondaryLabelKey: "lifespan",
    secondaryLine: { ko: "재위 523 ~ 554", en: "Reigned 523–554", zh: "在位523～554年", ja: "在位523～554年" },
    description: {
      ko: "사비(부여)로 도읍을 옮기고 국호를 남부여로 바꾸며 백제 중흥을 이끈 왕입니다.",
      en: "The king who moved the capital to Sabi (Buyeo), renamed the kingdom Nambuyeo, and led Baekje's revival.",
      zh: "将都城迁至泗沘（扶余），改国号为南扶余，带领百济中兴的君王。",
      ja: "都を泗沘（扶余）に移し、国号を南扶余と改め、百済の中興を導いた王です。",
    },
    obtained: true,
  },
  // Figma's "도감" list (0:1148) still shows this location locked, even
  // though the design already names its item elsewhere ("유물 카드 획득"
  // toast, node 0:2821) — mirrored here via `obtained: false` rather than
  // guessed away. `image` is used once this location is unlocked (e.g. from
  // the AR camera flow), matching the other three.
  gungnamji: {
    type: "artifact",
    image: require("@/assets/images/collection/gungnamji-wadang.png"),
    name: { ko: "연화문 와당", en: "Lotus-pattern Roof-end Tile", zh: "莲花纹瓦当", ja: "蓮華文瓦当" },
    primaryLine: { ko: "궁남지", en: "Gungnamji Pond", zh: "宫南池", ja: "宮南池" },
    secondaryLabelKey: "productionPeriod",
    secondaryLine: { ko: "백제, 7세기 중반", en: "Baekje, mid-7th century", zh: "百济，7世纪中叶", ja: "百済、7世紀中頃" },
    description: {
      ko: "연꽃무늬가 새겨진 기와로 부여에서 출토된 유물입니다.",
      en: "A roof tile engraved with a lotus pattern, excavated in Buyeo.",
      zh: "刻有莲花纹的瓦片，出土于扶余。",
      ja: "蓮の花模様が刻まれた瓦で、扶余で出土した遺物です。",
    },
    obtained: false,
  },
};
