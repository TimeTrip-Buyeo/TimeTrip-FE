import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { Animated, Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { ALBUM_ENTRIES, type AlbumEntry } from "@/constants/album";
import { COLLECTIBLES } from "@/constants/collectibles";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import type { LocationId } from "@/constants/locations";
import { PERSON_POSES } from "@/constants/poses";
import { buyeoCutScreenText, mapScreenText, type Locale } from "@/constants/translations";
import { useCapturedPhotos } from "@/hooks/use-captured-photos";
import { useLanguage } from "@/hooks/use-language";

// "부여세컷" = "Buyeo 3-cut" (세 = three), matching Figma's own progress
// example ("2 / 3", node 0:1418) — not a 4-photo strip.
const SLOT_COUNT = 3;
const ALL_FILTER = "all" as const;
type ThemeFilter = LocationId | typeof ALL_FILTER;

// The exact frame graphic selected in Figma (node 0:580's "image 46"), with
// its 3 photo windows punched fully transparent so real selected photos
// composite in behind it — see the asset's own history for how the windows
// were cut. Native size 887x1774 (an exact 1:2 ratio), so the frame
// container below reuses that ratio verbatim rather than approximating it.
const COLLAGE_FRAME = require("@/assets/images/buyeo-cut/collage-frame.png");
const COLLAGE_FRAME_RATIO = 887 / 1774;
// The photo tiles are sized first — 150dp is a comfortable, non-cropped
// display size (similar to this app's other photo cards) — and the frame is
// then sized to wrap around THAT, not the other way around. Each photo
// window is 64.04% of the frame's own width (see COLLAGE_SLOT_RECTS below),
// so dividing back out gives the frame width that makes the window exactly
// PHOTO_TILE_WIDTH wide; the frame's fixed 1:2 ratio derives its height.
const PHOTO_TILE_WIDTH = 150;
const COLLAGE_FRAME_WIDTH = Math.round(PHOTO_TILE_WIDTH / 0.6404);
// Height is computed explicitly (not left to an `aspectRatio` style prop) so
// the frame box has one unambiguous fixed size on every platform.
const COLLAGE_FRAME_HEIGHT = Math.round(COLLAGE_FRAME_WIDTH / COLLAGE_FRAME_RATIO);
// Photo-window rectangles measured directly off the frame asset, as % of the
// frame's own width/height — keeps the windows pixel-aligned to the frame's
// artwork at any display size instead of guessing even thirds.
const COLLAGE_SLOT_RECTS = [
  { top: "1.8%", left: "18.04%", width: "64.04%", height: "31.63%" },
  { top: "33.54%", left: "18.04%", width: "64.04%", height: "31.46%" },
  { top: "65.11%", left: "18.04%", width: "64.04%", height: "31.28%" },
] as const;

type PickerItem = {
  id: string;
  locationId: LocationId;
  source: ImageSourcePropType;
  isPlaceholder: boolean;
  poseImage?: ImageSourcePropType;
  poseAspectRatio?: number;
};

// Rebuilt to match Figma's "부여세컷 선택" → "콜라주 만들기" flow (nodes 0:1418,
// 0:1670, 0:580/0:612) directly: the picker grid shows every photo the album
// already has for a location — real captures first, then that location's own
// album/collectible artwork repeated to fill out its photoCount — exactly
// what album.tsx's own detail grid does, so this screen never looks sparser
// than the Album page for the same location. Selecting 3 leads into a
// collage builder (frame choice, save, share) instead of a second Figma
// route, since the flow is linear/wizard-like rather than deep-linkable —
// same "local view state" approach collection.tsx/album.tsx already use for
// their own multi-step screens.
export default function BuyeoCutScreen() {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const t = buyeoCutScreenText[locale];
  const mapT = mapScreenText[locale];
  const { photosByLocation } = useCapturedPhotos();
  const [selected, setSelected] = useState<PickerItem[]>([]);
  const [view, setView] = useState<"pick" | "collage">("pick");
  const [frameEnabled, setFrameEnabled] = useState(true);
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>(ALL_FILTER);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const allSections = useMemo(() => {
    return (Object.keys(ALBUM_ENTRIES) as LocationId[])
      .map((id) => {
        const entry = ALBUM_ENTRIES[id]!;
        const capturedPhotos = photosByLocation[id] ?? [];
        const collectible = COLLECTIBLES[id];
        const placeholderImage = collectible?.obtained ? collectible.image : entry.thumbnail;
        const placeholderCount = Math.max(entry.photoCount - capturedPhotos.length, 0);
        const items: PickerItem[] = [
          ...capturedPhotos.map((photo) => {
            const pose = PERSON_POSES[id]?.find((candidate) => candidate.id === photo.poseId);
            return {
              id: photo.id,
              locationId: id,
              source: { uri: photo.uri },
              isPlaceholder: false,
              poseImage: pose?.image,
              poseAspectRatio: pose?.aspectRatio,
            };
          }),
          ...(placeholderImage
            ? Array.from({ length: placeholderCount }, (_, index) => ({
                id: `${id}-placeholder-${index}`,
                locationId: id,
                source: placeholderImage,
                isPlaceholder: true,
              }))
            : []),
        ];
        return { id, entry, items };
      })
      .filter((section) => section.items.length > 0);
  }, [photosByLocation]);

  const sections = useMemo(
    () => (themeFilter === ALL_FILTER ? allSections : allSections.filter((section) => section.id === themeFilter)),
    [allSections, themeFilter],
  );

  const isFull = selected.length >= SLOT_COUNT;

  const toggleSelect = (item: PickerItem) => {
    setSelected((current) => {
      const alreadySelected = current.some((candidate) => candidate.id === item.id);
      if (alreadySelected) return current.filter((candidate) => candidate.id !== item.id);
      if (current.length >= SLOT_COUNT) return current;
      return [...current, item];
    });
  };

  const handleApplyFilter = (filter: ThemeFilter) => {
    setThemeFilter(filter);
    setIsFilterSheetOpen(false);
    const label = filter === ALL_FILTER ? t.filterAllLabel : ALBUM_ENTRIES[filter]?.name[locale];
    if (label) setToastMessage(t.filterAppliedToast(label));
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!showSaveToast) return;
    const timer = setTimeout(() => setShowSaveToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showSaveToast]);

  const handleGenerate = () => {
    if (selected.length !== SLOT_COUNT) return;
    setView("collage");
  };

  const handleBack = () => {
    if (view === "collage") {
      setView("pick");
      return;
    }
    router.back();
  };

  // No persistent-storage module is wired up in this app yet (see
  // use-captured-photos.tsx) — this mirrors that same in-memory-only scope
  // and just surfaces the Figma "저장완료!" confirmation (node 0:612) rather
  // than writing to the device's photo library.
  const handleSave = () => setShowSaveToast(true);

  const handleShare = () => {
    Share.share({ message: `${t.collageCaption} · ${t.collageHeaderTitle}` });
  };

  const navigate = (key: BottomNavKey) => {
    if (key === "map") router.push("/(tabs)");
    if (key === "collection") router.push("/collection");
    if (key === "myPage") router.push("/my-page");
  };

  if (view === "collage") {
    return (
      <View style={styles.container}>
        <View style={[styles.collageHeader, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={handleBack} hitSlop={8}>
            <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
          </Pressable>
          <View style={styles.collageHeaderTitleBlock}>
            <Text style={styles.collageHeaderTitle}>{t.collageHeaderTitle}</Text>
            <Text style={styles.collageHeaderSubtitle}>{t.collageHeaderSubtitle}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.collagePreview}>
          <View style={styles.frameBox}>
            {selected.map((item, index) => (
              <View key={item.id} style={[styles.frameSlot, COLLAGE_SLOT_RECTS[index]]}>
                <Image source={item.source} style={styles.frameSlotImage} resizeMode="contain" />
                {item.poseImage && (
                  <Image
                    source={item.poseImage}
                    style={[styles.stripPersonOverlay, { aspectRatio: item.poseAspectRatio }]}
                    resizeMode="cover"
                  />
                )}
              </View>
            ))}
            {frameEnabled && (
              <Image
                source={COLLAGE_FRAME}
                style={{ position: "absolute", top: 0, left: 0, width: COLLAGE_FRAME_WIDTH, height: COLLAGE_FRAME_HEIGHT }}
                resizeMode="stretch"
              />
            )}
          </View>

          {showSaveToast && <SaveToast title={t.saveToastTitle} body={t.saveToastBody} />}
        </View>

        <View style={[styles.collageBottom, { paddingBottom: insets.bottom > 0 ? insets.bottom : 32 }]}>
          <View style={styles.frameSection}>
            <Text style={styles.frameSectionLabel}>{t.frameSectionLabel}</Text>
            <View style={styles.frameOptionsRow}>
              <Pressable
                style={[styles.frameOptionButton, frameEnabled && styles.frameOptionButtonActive]}
                onPress={() => setFrameEnabled(true)}>
                <Text style={[styles.frameOptionText, frameEnabled && styles.frameOptionTextActive]}>
                  {t.frameOnLabel}
                </Text>
                <FontAwesome5
                  name="check"
                  size={12}
                  color={frameEnabled ? "#800000" : "transparent"}
                  solid={frameEnabled}
                />
              </Pressable>
              <Pressable
                style={[styles.frameOptionButton, !frameEnabled && styles.frameOptionButtonActive]}
                onPress={() => setFrameEnabled(false)}>
                <Text style={[styles.frameOptionText, !frameEnabled && styles.frameOptionTextActive]}>
                  {t.frameOffLabel}
                </Text>
                <FontAwesome5
                  name="check"
                  size={12}
                  color={!frameEnabled ? "#800000" : "transparent"}
                  solid={!frameEnabled}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.collageActions}>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <FontAwesome5 name="download" size={14} color="#fdfcf8" solid />
              <Text style={styles.saveButtonText}>{t.saveButtonLabel}</Text>
            </Pressable>
            <Pressable
              style={styles.shareIconButton}
              onPress={handleShare}
              accessibilityLabel={t.shareButtonAccessibilityLabel}>
              <FontAwesome5 name="share-alt" size={14} color="#b8860b" solid />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={handleBack} hitSlop={8}>
              <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
            </Pressable>
            <View style={styles.headerTitleBlock}>
              <Text style={styles.headerTitle}>{t.headerTitle}</Text>
              <Text style={styles.headerSubtitle}>{t.headerSubtitle}</Text>
            </View>
          </View>
          <Pressable style={styles.fab} onPress={() => setIsFilterSheetOpen(true)} hitSlop={4}>
            <FontAwesome5 name="sliders-h" size={20} color="#fdfcf8" solid />
          </Pressable>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={styles.progressStatus}>{t.progressStatus(selected.length, SLOT_COUNT)}</Text>
            <Text style={styles.progressFraction}>
              {selected.length} / {SLOT_COUNT}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(selected.length / SLOT_COUNT) * 100}%` }]} />
          </View>
        </View>

        <View style={styles.separator} />

        {sections.length === 0 ? (
          <Text style={styles.emptyText}>{t.emptyTitle}</Text>
        ) : (
          <View style={styles.body}>
            {sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionLabel}>{section.entry.name[locale]}</Text>
                <View style={styles.grid}>
                  {section.items.map((item) => {
                    const orderIndex = selected.findIndex((candidate) => candidate.id === item.id);
                    const isSelected = orderIndex !== -1;
                    const disabled = !isSelected && isFull;
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.card, isSelected && styles.cardSelected, disabled && styles.cardDisabled]}
                        onPress={() => toggleSelect(item)}
                        disabled={disabled}>
                        <Image source={item.source} style={styles.cardImage} resizeMode="contain" />
                        {item.poseImage && (
                          <Image
                            source={item.poseImage}
                            style={[styles.cardPersonOverlay, { aspectRatio: item.poseAspectRatio }]}
                            resizeMode="cover"
                          />
                        )}
                        {isSelected && (
                          <View style={styles.cardOverlay}>
                            <View style={styles.cardBadge}>
                              <Text style={styles.cardBadgeText}>{orderIndex + 1}</Text>
                            </View>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.generateBar}>
        <Pressable
          style={[styles.generateButton, !isFull && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={!isFull}>
          <FontAwesome5 name="grip-lines" size={14} color={isFull ? "#fff" : "rgba(253,252,248,0.8)"} solid />
          <Text style={[styles.generateButtonText, !isFull && styles.generateButtonTextDisabled]}>
            {t.generateButton}
          </Text>
        </Pressable>
      </View>

      <BottomNav active="album" labels={mapT.nav} onNavigate={navigate} />

      {isFilterSheetOpen && (
        <FilterSheet
          insetsBottom={insets.bottom}
          title={t.filterSheetTitle}
          closeLabel={t.filterCloseLabel}
          allLabel={t.filterAllLabel}
          activeFilter={themeFilter}
          sections={allSections}
          locale={locale}
          onSelect={handleApplyFilter}
          onClose={() => setIsFilterSheetOpen(false)}
        />
      )}

      {toastMessage && <Toast message={toastMessage} bottom={insets.bottom + 96} />}
    </View>
  );
}

type FilterSheetProps = {
  insetsBottom: number;
  title: string;
  closeLabel: string;
  allLabel: string;
  activeFilter: ThemeFilter;
  sections: { id: LocationId; entry: AlbumEntry }[];
  locale: Locale;
  onSelect: (filter: ThemeFilter) => void;
  onClose: () => void;
};

// Figma's own bottom sheet (node 0:1538, "한 손 조작용 프리미엄 바텀 시트") only ships
// blank placeholder rectangles for its option labels — no real copy was ever
// filled in — so option text here comes from live theme names instead.
function FilterSheet({ insetsBottom, title, closeLabel, allLabel, activeFilter, sections, locale, onSelect, onClose }: FilterSheetProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, damping: 18, mass: 0.8 }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.sheetBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: insetsBottom + 24, transform: [{ translateY: sheetTranslateY }] }]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.sheetClose}>{closeLabel}</Text>
          </Pressable>
        </View>
        <View style={styles.sheetOptions}>
          <FilterOption label={allLabel} active={activeFilter === ALL_FILTER} onPress={() => onSelect(ALL_FILTER)} />
          {sections.map(({ id, entry }) => (
            <FilterOption
              key={id}
              label={entry.name[locale]}
              active={activeFilter === id}
              onPress={() => onSelect(id)}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

function FilterOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.sheetOption, active && styles.sheetOptionActive, pressed && styles.sheetOptionPressed]}
      onPress={onPress}>
      <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]}>{label}</Text>
      {active && <FontAwesome5 name="check" size={12} color="#fff" solid />}
    </Pressable>
  );
}

function Toast({ message, bottom }: { message: string; bottom: number }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.toast, { bottom, opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// Matches Figma's "저장버튼 클릭시" confirmation (node 0:612): a gold-bordered
// card centered over the collage preview, not the corner toast used for
// filter feedback above.
function SaveToast({ title, body }: { title: string; body: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.saveToast, { opacity }]} pointerEvents="none">
      <Text style={styles.saveToastTitle}>{title}</Text>
      <Text style={styles.saveToastBody}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitleBlock: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 20,
    letterSpacing: -0.5,
    lineHeight: 28,
    color: "#1b1b1b",
  },
  headerSubtitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 11,
    letterSpacing: -0.275,
    lineHeight: 16.5,
    color: "#9ca3af",
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
  },
  progressSection: {
    paddingHorizontal: 32,
    gap: 8,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  progressStatus: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 16,
    color: "#800000",
  },
  progressFraction: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16.5,
    color: "#9ca3af",
  },
  progressTrack: {
    height: 6,
    borderRadius: 9999,
    backgroundColor: "#f5f4f0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: "#800000",
  },
  separator: {
    marginTop: 16,
    marginHorizontal: 32,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  body: {
    paddingHorizontal: 32,
    paddingTop: 20,
    gap: 24,
  },
  emptyText: {
    fontSize: 13,
    color: "#78716c",
    textAlign: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    color: "#b8860b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "46%",
    aspectRatio: 159 / 212,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: "#800000",
    shadowColor: "#800000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 6,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  cardPersonOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: "92%",
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  // paddingBottom is small and fixed (not + insets.bottom) — BottomNav
  // directly below already reserves the safe-area inset itself
  // (paddingBottom: insets.bottom + 14 in bottom-nav.tsx), so adding it here
  // too was stacking redundant space and pushing the button up away from the
  // nav bar instead of sitting snug just above it.
  generateBar: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fdfcf8",
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 16,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#800000",
  },
  generateButtonDisabled: {
    backgroundColor: "rgba(128,0,0,0.5)",
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  generateButtonTextDisabled: {
    color: "rgba(253,252,248,0.8)",
  },
  // Filter bottom sheet (Figma node 0:1538)
  sheetBackdrop: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fcfaf5",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  sheetTitle: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 18,
    color: "#1b1b1b",
  },
  sheetClose: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  sheetOptions: {
    gap: 10,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  sheetOptionActive: {
    backgroundColor: "#800000",
    borderColor: "#800000",
  },
  sheetOptionPressed: {
    opacity: 0.85,
  },
  sheetOptionText: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 14,
    color: "#1b1b1b",
  },
  sheetOptionTextActive: {
    color: "#fff",
  },
  // Toast (Figma node 0:1562)
  toast: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(27,27,27,0.95)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  toastText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#fdfcf8",
  },
  // Collage builder (Figma node 0:580 "부여세컷 완성")
  collageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 32,
    paddingBottom: 12,
  },
  collageHeaderTitleBlock: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  collageHeaderTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    letterSpacing: -0.45,
    lineHeight: 28,
    color: "#1b1b1b",
    textAlign: "center",
  },
  collageHeaderSubtitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 10,
    letterSpacing: -0.25,
    lineHeight: 15,
    color: "#9ca3af",
    textAlign: "center",
  },
  headerSpacer: {
    width: 20,
  },
  collagePreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(245,244,240,0.4)",
  },
  frameBox: {
    width: COLLAGE_FRAME_WIDTH,
    height: COLLAGE_FRAME_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  frameSlot: {
    position: "absolute",
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  },
  frameSlotImage: {
    width: "100%",
    height: "100%",
  },
  stripPersonOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: "92%",
  },
  saveToast: {
    position: "absolute",
    width: 256,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#b8860b",
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 17,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  saveToastTitle: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
    color: "#b8860b",
  },
  saveToastBody: {
    fontFamily: "serif",
    fontSize: 12,
    color: "#b8860b",
    textAlign: "center",
  },
  collageBottom: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fdfcf8",
    paddingHorizontal: 32,
    paddingTop: 21,
    gap: 20,
  },
  frameSection: {
    gap: 8,
  },
  frameSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#b8860b",
  },
  // Reproduces Figma's own two-button frame-choice row (node 0:596-0:602),
  // repurposed as an on/off pair (프레임 / 프레임 없음) instead of two frame
  // styles. Figma's fixed 157-wide pills only fit its own ~396px canvas —
  // on a narrower phone two 157s left no visible gap between them (and
  // could even overlap), so this uses flex+gap instead, matching the same
  // pattern as the save/share row directly below for a consistent, clean fit
  // regardless of screen width.
  frameOptionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  frameOptionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  frameOptionButtonActive: {
    borderWidth: 2,
    borderColor: "#800000",
  },
  frameOptionText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
  },
  frameOptionTextActive: {
    color: "#800000",
  },
  collageActions: {
    flexDirection: "row",
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#800000",
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fdfcf8",
  },
  shareIconButton: {
    width: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#f5f4f0",
  },
});
