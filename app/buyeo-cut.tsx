import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { requireOptionalNativeModule } from "expo-modules-core";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { ALBUM_ENTRIES, type AlbumEntry } from "@/constants/album";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { MAP_LOCATIONS, SPOT_ID_TO_LOCATION_ID, type LocationId } from "@/constants/locations";
import { buyeoCutScreenText, mapScreenText, type Locale } from "@/constants/translations";
import { useApiResource } from "@/hooks/use-api-resource";
import { useCapturedPhotos } from "@/hooks/use-captured-photos";
import { useHiddenAlbumPhotoIds } from "@/hooks/use-hidden-album-photos";
import { useLanguage } from "@/hooks/use-language";
import { toApiUrl } from "@/lib/api/client";
import { getFrames } from "@/lib/api/collage";
import { getSelfiePhotoOptions } from "@/lib/api/selfies";
import { getSharingModule } from "@/lib/sharing";

// Lazy-loaded the same way lib/sharing.ts loads expo-sharing — an old dev
// client can run without the native ExpoMediaLibrary module until it's
// rebuilt after installing expo-media-library.
type ExpoMediaLibraryModule = {
  requestPermissionsAsync: (writeOnly?: boolean) => Promise<{ granted: boolean }>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
};

async function getMediaLibraryModule(): Promise<ExpoMediaLibraryModule | null> {
  if (!requireOptionalNativeModule("ExpoMediaLibrary")) {
    console.warn("[buyeo-cut] ExpoMediaLibrary native module is unavailable. Rebuild the dev client to enable gallery saving.");
    return null;
  }
  try {
    return (await import("expo-media-library")) as unknown as ExpoMediaLibraryModule;
  } catch (error) {
    console.error("[buyeo-cut] expo-media-library native module is unavailable", error);
    return null;
  }
}

// "부여세컷" = "Buyeo 3-cut" (세 = three), matching Figma's own progress
// example ("2 / 3", node 0:1418) — not a 4-photo strip.
const SLOT_COUNT = 3;
const ALL_FILTER = "all" as const;
type ThemeFilter = string | typeof ALL_FILTER;

function parseRouteId(value: string | string[] | undefined): number | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue === undefined || rawValue === "") return undefined;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

// The frame box keeps the exact 1:2 ratio measured off Figma's original frame
// graphic (node 0:580's "image 46", native 887x1774) — GET /collages/frames
// doesn't return per-frame aspect-ratio or photo-window metadata, so every
// server frame image is stretched to fit this same fixed box instead.
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
// The collage is actually LAID OUT at this full resolution (frame ratio kept)
// and only scaled DOWN for display, so captureRef grabs a crisp 1080-wide
// bitmap 1:1 — the slot <Image>s decode at ~690px and the frame PNG (887px
// native) barely upscales. Just enlarging the capture of the ~234dp preview
// couldn't add detail that was never rendered.
const COLLAGE_EXPORT_WIDTH = 1080;
const COLLAGE_EXPORT_HEIGHT = Math.round(COLLAGE_EXPORT_WIDTH * (COLLAGE_FRAME_HEIGHT / COLLAGE_FRAME_WIDTH));
const COLLAGE_DISPLAY_SCALE = COLLAGE_FRAME_WIDTH / COLLAGE_EXPORT_WIDTH;
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
  collectionItemId?: number;
  collectionItemName?: string;
  /** Set only if the server upload in photo-save.tsx succeeded — undefined for
      local-only captures (upload failed, or never attempted). Not read right
      now (handleSave/handleShare capture the on-screen collage directly
      instead of calling createCollage), but kept for when the server-quality
      save path (createCollage + downloadCollageFile, still in
      lib/api/collage.ts) can be re-enabled once collection-item acquisition
      is wired up server-side. */
  serverSelfiePhotoId?: number;
};

type PickerSection = {
  sectionKey: string;
  id: LocationId;
  entry?: AlbumEntry;
  collectionItemName?: string;
  items: PickerItem[];
};

// Rebuilt to match Figma's "부여세컷 선택" → "콜라주 만들기" flow (nodes 0:1418,
// 0:1670, 0:580/0:612) directly. The picker grid shows real captures only —
// this session's local captures plus the user's uploaded selfies from the
// server (GET /collages/selfie-photos) — mock album/collectible artwork is
// intentionally excluded so tests don't accidentally select placeholder photos.
export default function BuyeoCutScreen() {
  const params = useLocalSearchParams<{ collectionItemId?: string }>();
  const selectedCollectionItemId = parseRouteId(params.collectionItemId);
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const t = buyeoCutScreenText[locale];
  const mapT = mapScreenText[locale];
  const { photosByLocation } = useCapturedPhotos();
  const hiddenPhotoIds = useHiddenAlbumPhotoIds();
  const [selected, setSelected] = useState<PickerItem[]>([]);
  const [view, setView] = useState<"pick" | "collage">("pick");
  const { data: framesData, loadError: framesLoadError } = useApiResource(
    () => getFrames(),
    [],
    "[buyeo-cut] failed to load frames",
  );
  // Always the user's FULL selfie set — coming in from a specific album only
  // sets the initial section filter (below), it doesn't narrow the data.
  const { data: selfiesData, loadError: selfiesLoadError } = useApiResource(
    () => getSelfiePhotoOptions({ locale }),
    [locale],
    "[buyeo-cut] failed to load selfie photos",
  );
  const remoteSelfies = useMemo(
    () => (selfiesData?.selfiePhotos ?? []).filter((photo) => !hiddenPhotoIds.has(photo.selfiePhotoId)),
    [selfiesData, hiddenPhotoIds],
  );
  // Excludes the server's "기본" (plain/default) frame — only real 부여세컷
  // frames should be selectable here.
  const frames = useMemo(() => (framesData?.frames ?? []).filter((frame) => !frame.name.includes("기본")), [framesData]);
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const selectedFrame = frames.find((frame) => frame.frameId === selectedFrameId) ?? null;
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>(ALL_FILTER);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Same split as the share toasts below: "gallery-save module isn't linked
  // in this build yet" vs. "capture/save actually failed just now".
  const [showSaveUnsupportedToast, setShowSaveUnsupportedToast] = useState(false);
  const [showSaveErrorToast, setShowSaveErrorToast] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  // Distinguishes "the sharing native module isn't linked in this build yet"
  // (needs a rebuild — see getSharingModule) from "capture/share actually
  // failed just now", since the two look identical from a plain error toast.
  const [showShareUnsupportedToast, setShowShareUnsupportedToast] = useState(false);
  const [showShareUnavailableToast, setShowShareUnavailableToast] = useState(false);
  // Captured on demand in handleShare (same react-native-view-shot pattern as
  // photo-save.tsx's compositeRef) — the on-screen collage is just layered
  // <Image>s, not a real file, until this flattens it into one.
  const collagePreviewRef = useRef<View>(null);

  // Mirrors the old default of "frame visible on first render" — auto-picks
  // the first (non-기본) server frame once the list loads, but only once, so
  // it doesn't stomp a later explicit "프레임 없음" choice (selectedFrameId
  // back to null).
  const hasAutoSelectedFrame = useRef(false);
  useEffect(() => {
    if (!hasAutoSelectedFrame.current && frames.length > 0) {
      hasAutoSelectedFrame.current = true;
      setSelectedFrameId(frames[0].frameId);
    }
  }, [frames]);

  const allSections = useMemo(() => {
    // Local captures already carry their own locationId — flatten every
    // location's bucket (not just the ones with an ALBUM_ENTRIES entry).
    const localItems: PickerItem[] = MAP_LOCATIONS.flatMap((location) => {
      const capturedPhotos = photosByLocation[location.id] ?? [];
      // photo.uri is already a flattened composite (background + person cutout
      // baked in by photo-save.tsx's captureRef).
      return capturedPhotos.map((photo) => ({
        id: photo.id,
        locationId: location.id,
        source: { uri: photo.uri },
        collectionItemId: photo.collectionItemId,
        collectionItemName: photo.collectionItemName,
        serverSelfiePhotoId: photo.serverSelfiePhotoId,
      }));
    });

    // Dedup: drop a remote entry a local capture already synced to the same
    // selfiePhotoId, so it isn't shown twice.
    const syncedRemoteIds = new Set(
      localItems.map((item) => item.serverSelfiePhotoId).filter((id): id is number => id !== undefined),
    );
    const remoteItems: PickerItem[] = remoteSelfies
      .filter((photo) => !syncedRemoteIds.has(photo.selfiePhotoId))
      .map((photo) => ({
        id: `remote-${photo.selfiePhotoId}`,
        // Unmapped spots fall into the first location so they still render; the
        // section label prefers collectionItemName anyway.
        locationId: SPOT_ID_TO_LOCATION_ID[photo.spotId] ?? MAP_LOCATIONS[0].id,
        source: { uri: toApiUrl(photo.photoUrl) },
        collectionItemId: photo.collectionItemId,
        collectionItemName: photo.collectionItemName,
        serverSelfiePhotoId: photo.selfiePhotoId,
      }));

    // Group by collection item when known, else by location.
    const groups = new Map<string, PickerItem[]>();
    for (const item of [...localItems, ...remoteItems]) {
      const groupKey =
        item.collectionItemId !== undefined ? `collection-${item.collectionItemId}` : `location-${item.locationId}`;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), item]);
    }

    return [...groups.entries()]
      .map(([sectionKey, items]) => ({
        sectionKey,
        id: items[0].locationId,
        entry: ALBUM_ENTRIES[items[0].locationId],
        collectionItemName: items.find((item) => item.collectionItemName)?.collectionItemName,
        items,
      }))
      .filter((section) => section.items.length > 0);
  }, [photosByLocation, remoteSelfies]);

  // Coming in from a specific figure's album detail — default the section
  // filter to that figure (once, so the user can still switch to 전체). From
  // the album main screen (no collectionItemId) it stays on 전체.
  const hasAppliedInitialFilter = useRef(false);
  useEffect(() => {
    if (hasAppliedInitialFilter.current || selectedCollectionItemId === undefined) return;
    const match = allSections.find((section) => section.sectionKey === `collection-${selectedCollectionItemId}`);
    if (match) {
      hasAppliedInitialFilter.current = true;
      setThemeFilter(match.sectionKey);
    }
  }, [allSections, selectedCollectionItemId]);

  const sections = useMemo(
    () =>
      themeFilter === ALL_FILTER
        ? allSections
        : allSections.filter((section) => section.sectionKey === themeFilter),
    [allSections, themeFilter],
  );

  const visibleItemIds = useMemo(
    () => new Set(sections.flatMap((section) => section.items.map((item) => item.id))),
    [sections],
  );

  useEffect(() => {
    setSelected((current) => current.filter((item) => visibleItemIds.has(item.id)));
  }, [visibleItemIds]);

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
    const activeSection = allSections.find((section) => section.sectionKey === filter);
    const label =
      filter === ALL_FILTER
        ? t.filterAllLabel
        : activeSection
          ? activeSection.collectionItemName ?? activeSection.entry?.name[locale] ?? mapT.pins[activeSection.id]
          : undefined;
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

  useEffect(() => {
    if (!showSaveUnsupportedToast) return;
    const timer = setTimeout(() => setShowSaveUnsupportedToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showSaveUnsupportedToast]);

  useEffect(() => {
    if (!showSaveErrorToast) return;
    const timer = setTimeout(() => setShowSaveErrorToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showSaveErrorToast]);

  useEffect(() => {
    if (!showShareUnsupportedToast) return;
    const timer = setTimeout(() => setShowShareUnsupportedToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showShareUnsupportedToast]);

  useEffect(() => {
    if (!showShareUnavailableToast) return;
    const timer = setTimeout(() => setShowShareUnavailableToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showShareUnavailableToast]);

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

  // Captures the on-screen collage directly (same react-native-view-shot
  // approach as handleShare) instead of createCollage + downloadCollageFile's
  // server round-trip — /selfie-photos requires a server-side "acquired"
  // collection item that isn't wired up yet, so selected photos never have a
  // real serverSelfiePhotoId to send. createCollage/downloadCollageFile are
  // left in lib/api/collage.ts — swap back to them here for the higher-
  // quality server-rendered original once acquisition is connected.
  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const mediaLibrary = await getMediaLibraryModule();
      if (!mediaLibrary) {
        setShowSaveUnsupportedToast(true);
        return;
      }
      const permission = await mediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setShowSaveErrorToast(true);
        return;
      }
      if (!collagePreviewRef.current) {
        setShowSaveErrorToast(true);
        return;
      }

      const localUri = await captureRef(collagePreviewRef.current, {
        format: "jpg",
        quality: 0.95,
        result: "tmpfile",
      });
      await mediaLibrary.saveToLibraryAsync(localUri);
      setShowSaveToast(true);
    } catch (error) {
      console.error("[buyeo-cut] failed to save collage", error);
      setShowSaveErrorToast(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const sharing = await getSharingModule();
      if (!sharing) {
        setShowShareUnsupportedToast(true);
        return;
      }
      const isAvailable = await sharing.isAvailableAsync?.();
      if (!isAvailable || !sharing.shareAsync) {
        setShowShareUnsupportedToast(true);
        return;
      }
      if (!collagePreviewRef.current) {
        setShowShareUnavailableToast(true);
        return;
      }

      const localUri = await captureRef(collagePreviewRef.current, {
        format: "jpg",
        quality: 0.95,
        result: "tmpfile",
      });
      await sharing.shareAsync(localUri, { mimeType: "image/jpeg", dialogTitle: t.collageHeaderTitle });
    } catch (error) {
      console.error("[buyeo-cut] failed to share collage", error);
      setShowShareUnavailableToast(true);
    } finally {
      setIsSharing(false);
    }
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

        <ScrollView contentContainerStyle={styles.collageScrollContent}>
          <View style={styles.collagePreview}>
            {/* Clips the full-res canvas down to display size; the canvas
                itself stays laid out at COLLAGE_EXPORT_WIDTH so captureRef
                gets it at full resolution. */}
            <View style={styles.collageViewport}>
              <View style={styles.collageScaler}>
                <View ref={collagePreviewRef} style={styles.frameBox} collapsable={false}>
                  {selected.map((item, index) => (
                    <View key={item.id} style={[styles.frameSlot, COLLAGE_SLOT_RECTS[index]]}>
                      <Image source={item.source} style={styles.frameSlotImage} resizeMode="cover" />
                    </View>
                  ))}
                  {selectedFrame && (
                    <Image
                      source={{ uri: selectedFrame.frameImageUrl }}
                      style={styles.frameOverlayImage}
                      resizeMode="stretch"
                    />
                  )}
                </View>
              </View>
            </View>

            <Text style={styles.aiGeneratedDisclaimerText}>{t.aiGeneratedDisclaimerText}</Text>

            {showSaveToast ? (
              <SaveToast title={t.saveToastTitle} body={t.saveToastBody} />
            ) : showSaveUnsupportedToast ? (
              <SaveToast title={t.saveUnsupportedToastTitle} body={t.saveUnsupportedToastBody} />
            ) : showSaveErrorToast ? (
              <SaveToast title={t.saveErrorToastTitle} body={t.saveErrorToastBody} />
            ) : showShareUnsupportedToast ? (
              <SaveToast title={t.shareUnsupportedToastTitle} body={t.shareUnsupportedToastBody} />
            ) : (
              showShareUnavailableToast && (
                <SaveToast title={t.shareUnavailableToastTitle} body={t.shareUnavailableToastBody} />
              )
            )}
          </View>

          <View style={[styles.collageBottom, { paddingBottom: insets.bottom > 0 ? insets.bottom : 32 }]}>
            <View style={styles.frameSection}>
            <Text style={styles.frameSectionLabel}>{t.frameSectionLabel}</Text>
            {framesLoadError ? (
              <Text style={styles.frameLoadErrorText}>{t.frameLoadErrorText}</Text>
            ) : framesData === null ? (
              <ActivityIndicator color="#800000" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frameOptionsRow}>
                <Pressable
                  style={[styles.frameOptionButton, selectedFrame === null && styles.frameOptionButtonActive]}
                  onPress={() => setSelectedFrameId(null)}>
                  <Text style={[styles.frameOptionText, selectedFrame === null && styles.frameOptionTextActive]}>
                    {t.frameOffLabel}
                  </Text>
                  <FontAwesome5
                    name="check"
                    size={12}
                    color={selectedFrame === null ? "#800000" : "transparent"}
                    solid={selectedFrame === null}
                  />
                </Pressable>
                {frames.map((frame) => {
                  const isActive = frame.frameId === selectedFrameId;
                  return (
                    <Pressable
                      key={frame.frameId}
                      style={[styles.frameOptionButton, isActive && styles.frameOptionButtonActive]}
                      onPress={() => setSelectedFrameId(frame.frameId)}>
                      <Text style={[styles.frameOptionText, isActive && styles.frameOptionTextActive]}>
                        {frame.name}
                      </Text>
                      <FontAwesome5 name="check" size={12} color={isActive ? "#800000" : "transparent"} solid={isActive} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.collageActions}>
            <Pressable
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#fdfcf8" size="small" />
              ) : (
                <FontAwesome5 name="download" size={14} color="#fdfcf8" solid />
              )}
              <Text style={styles.saveButtonText}>{t.saveButtonLabel}</Text>
            </Pressable>
            <Pressable
              style={[styles.shareIconButton, isSharing && styles.shareIconButtonDisabled]}
              onPress={handleShare}
              disabled={isSharing}
              accessibilityLabel={t.shareButtonAccessibilityLabel}>
              {isSharing ? (
                <ActivityIndicator color="#b8860b" size="small" />
              ) : (
                <FontAwesome5 name="share-alt" size={14} color="#b8860b" solid />
              )}
            </Pressable>
          </View>
        </View>
        </ScrollView>
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

        {selfiesData === null && !selfiesLoadError && sections.length === 0 ? (
          <ActivityIndicator color="#800000" style={styles.selfiesLoadingIndicator} />
        ) : sections.length === 0 ? (
          <Text style={styles.emptyText}>{t.emptyTitle}</Text>
        ) : (
          <View style={styles.body}>
            {selfiesLoadError && <Text style={styles.selfiesLoadErrorText}>{t.selfiesLoadErrorText}</Text>}
            {sections.map((section) => (
              <View key={section.sectionKey} style={styles.section}>
                <Text style={styles.sectionLabel}>
                  {section.collectionItemName ?? section.entry?.name[locale] ?? mapT.pins[section.id]}
                </Text>
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
                        <Image source={item.source} style={styles.cardImage} resizeMode="cover" />
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
  sections: PickerSection[];
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
    // JS driver, not native: a native-driven entrance animation leaves
    // Android's touch dispatch out of sync until the next tap, so the first
    // press on a filter option does nothing and it takes two taps.
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: false, damping: 18, mass: 0.8 }),
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
          {sections.map(({ sectionKey, id, entry, collectionItemName }) => (
            <FilterOption
              key={sectionKey}
              label={collectionItemName ?? entry?.name[locale] ?? mapScreenText[locale].pins[id]}
              active={activeFilter === sectionKey}
              onPress={() => onSelect(sectionKey)}
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
      onPress={onPress}
      hitSlop={6}>
      <Text style={[styles.sheetOptionText, active && styles.sheetOptionTextActive]} pointerEvents="none">
        {label}
      </Text>
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
  selfiesLoadingIndicator: {
    paddingTop: 48,
  },
  selfiesLoadErrorText: {
    fontSize: 12,
    color: "#78716c",
    paddingHorizontal: 32,
    paddingBottom: 12,
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
    alignSelf: "stretch",
    gap: 10,
  },
  sheetOption: {
    width: "100%",
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
  // Wrapping collagePreview + collageBottom in a ScrollView (see the
  // "collage" view's JSX) means nothing gets silently clipped or overlapped
  // if their combined content is taller than the screen — it just scrolls
  // instead. flexGrow: 1 keeps the old centered look on screens tall enough
  // to fit everything without scrolling.
  collageScrollContent: {
    flexGrow: 1,
  },
  collagePreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: "rgba(245,244,240,0.4)",
  },
  collageViewport: {
    width: COLLAGE_FRAME_WIDTH,
    height: COLLAGE_FRAME_HEIGHT,
    overflow: "hidden",
  },
  collageScaler: {
    position: "absolute",
    top: 0,
    left: 0,
    transform: [{ scale: COLLAGE_DISPLAY_SCALE }],
    transformOrigin: "top left",
  },
  frameBox: {
    width: COLLAGE_EXPORT_WIDTH,
    height: COLLAGE_EXPORT_HEIGHT,
    position: "relative",
    overflow: "hidden",
  },
  frameOverlayImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  aiGeneratedDisclaimerText: {
    marginTop: 8,
    fontSize: 10,
    textAlign: "center",
    color: "#C8CDD7",
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
  frameLoadErrorText: {
    fontSize: 12,
    color: "#78716c",
  },
  // Reproduces Figma's own two-button frame-choice row (node 0:596-0:602) as
  // a starting point, but now scrolls horizontally since GET /collages/frames
  // can return any number of frames (not just the original on/off pair) —
  // fixed-width pills in a horizontal ScrollView instead of flex+gap, which
  // only worked for exactly two evenly-split buttons.
  frameOptionsRow: {
    flexGrow: 1,
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  frameOptionButton: {
    width: 132,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
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
  unsyncedSelectionWarningText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#b91c1c",
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
  saveButtonDisabled: {
    backgroundColor: "rgba(128,0,0,0.5)",
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
  shareIconButtonDisabled: {
    opacity: 0.4,
  },
});
