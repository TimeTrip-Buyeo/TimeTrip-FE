/**
 * "궁서체" (traditional Korean brush/calligraphy lettering) — the real MS
 * Gungsuh font isn't freely redistributable in an app bundle, so this stands
 * in with the most readable typeface that still reads as old-fashioned.
 * Song Myung (a literal brush-calligraphy face) was tried first but its
 * strokes were too thin/stylized to read well at UI sizes; Nanum Myeongjo —
 * a traditional Myeongjo/serif book typeface — keeps the historical feel
 * without sacrificing legibility.
 */
export const GUNGSEO_FONT = "NanumMyeongjo_400Regular";

/**
 * Android ignores a custom `fontFamily` whenever a `fontWeight` is set
 * alongside it — it tries to resolve a same-family "<name>_bold" asset,
 * fails silently, and falls back to the system default font instead. So any
 * text that wants a bold Gungseo look must use this family (loaded as its
 * own weight) with no `fontWeight` set, rather than GUNGSEO_FONT + fontWeight.
 */
export const GUNGSEO_FONT_BOLD = "NanumMyeongjo_700Bold";

export const INTER_FONT_REGULAR = "Inter_400Regular";
