import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { GripRectIcon } from "@/components/grip-rect-icon";
import { LangPill } from "@/components/lang-pill";
import { ALBUM_ENTRIES } from "@/constants/album";
import { COLLECTIBLES } from "@/constants/collectibles";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import type { LocationId } from "@/constants/locations";
import { PERSON_POSES } from "@/constants/poses";
import { albumScreenText, mapScreenText, shareSuffix, type Locale } from "@/constants/translations";
import { useCapturedPhotos } from "@/hooks/use-captured-photos";
import { useLanguage } from "@/hooks/use-language";

// Figma's "앨범" list (node 0:1079) only ever shows entries it has real
// content for — it doesn't define a locked/"?" card style the way "도감"
// does. So this list only renders what's in ALBUM_ENTRIES, nothing invented.
const ALBUM_LOCATION_IDS = Object.keys(ALBUM_ENTRIES) as LocationId[];

export default function AlbumScreen() {
  const params = useLocalSearchParams<{ locationId?: string; photo?: string }>();
  const locationId = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;
  const photo = Array.isArray(params.photo) ? params.photo[0] : params.photo;

  if (locationId && photo !== undefined) {
    return <PhotoViewer locationId={locationId as LocationId} photoParam={photo} />;
  }
  if (locationId) return <AlbumDetail locationId={locationId as LocationId} />;
  return <AlbumList />;
}

function BuyeoCutFab({ bottom }: { bottom: number }) {
  return (
    <Pressable style={[styles.fab, { bottom }]} onPress={() => router.push("/buyeo-cut")}>
      <GripRectIcon />
    </Pressable>
  );
}

function AlbumList() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const t = albumScreenText[locale];
  const mapT = mapScreenText[locale];
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { photosByLocation, clearLocationPhotos } = useCapturedPhotos();
  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
            </Pressable>
            <Text style={styles.headerTitle}>{mapT.nav.album}</Text>
          </View>
          <LangPill
            locale={locale}
            isLegendVisible={isLegendVisible}
            onToggleLegend={() => setIsLegendVisible((visible) => !visible)}
            onSelectLocale={handleSelectLocale}
          />
        </View>
        <View style={styles.listSubtitleRow}>
          <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
          <Pressable
            style={[styles.editControlButton, isEditMode && styles.editControlButtonActive]}
            onPress={() => setIsEditMode((current) => !current)}
            hitSlop={8}>
            <FontAwesome5 name={isEditMode ? "check" : "pen"} size={12} color={isEditMode ? "#fff" : "#9ca3af"} solid />
          </Pressable>
        </View>

        <View style={styles.list}>
          {ALBUM_LOCATION_IDS.map((id) => {
            const entry = ALBUM_ENTRIES[id]!;
            const hasCapturedPhotos = (photosByLocation[id]?.length ?? 0) > 0;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() =>
                  isEditMode
                    ? hasCapturedPhotos && clearLocationPhotos(id)
                    : router.push({ pathname: "/album", params: { locationId: id } })
                }
                disabled={isEditMode && !hasCapturedPhotos}>
                <View style={styles.cardThumb}>
                  {entry.thumbnail && (
                    <Image source={entry.thumbnail} style={styles.cardThumbImage} resizeMode="cover" />
                  )}
                  <View style={styles.cardPhotoCountBadge}>
                    <Text style={styles.cardPhotoCountText}>
                      {entry.photoCount}
                      {t.photoCountSuffix}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardTextColumn}>
                  <Text style={styles.cardTitle}>{entry.name[locale]}</Text>
                  <View style={styles.cardLocationRow}>
                    <FontAwesome5 name="medal" size={11} color="#b8860b" solid />
                    <Text style={styles.cardLocation}>{entry.locationCaption[locale]}</Text>
                  </View>
                </View>
                {isEditMode ? (
                  <FontAwesome5
                    name="trash-alt"
                    size={14}
                    color={hasCapturedPhotos ? "#800000" : "#e7e5e4"}
                    solid
                  />
                ) : (
                  <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" solid />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <BuyeoCutFab bottom={insets.bottom + 96} />

      <BottomNav
        active="album"
        labels={mapT.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "map") router.push("/(tabs)");
          if (key === "collection") router.push("/collection");
          if (key === "myPage") router.push("/my-page");
        }}
      />
    </View>
  );
}

function AlbumDetail({ locationId }: { locationId: LocationId }) {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const t = albumScreenText[locale];
  const mapT = mapScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const collectible = COLLECTIBLES[locationId];
  const photo = collectible?.obtained ? collectible : undefined;
  const { photosByLocation, removePhoto } = useCapturedPhotos();
  const capturedPhotos = photosByLocation[locationId] ?? [];
  const [isEditMode, setIsEditMode] = useState(false);
  const [sortOldestFirst, setSortOldestFirst] = useState(false);
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const displayedCapturedPhotos = sortOldestFirst ? [...capturedPhotos].reverse() : capturedPhotos;
  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  const header = (
    <View style={[styles.detailHeader, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={8}>
        <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
      </Pressable>
      <Text style={styles.headerTitle}>{entry?.name[locale] ?? mapT.pins[locationId]}</Text>
      <LangPill
        locale={locale}
        isLegendVisible={isLegendVisible}
        onToggleLegend={() => setIsLegendVisible((visible) => !visible)}
        onSelectLocale={handleSelectLocale}
      />
    </View>
  );

  if (!photo && capturedPhotos.length === 0) {
    // Matches Figma "앨범( 사진 없을때)", node 0:384, literally.
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          {header}
          <View style={styles.emptyBody}>
            <View style={styles.emptyIconRing}>
              <FontAwesome5 name="folder-open" size={36} color="#b8860b" solid />
            </View>
            <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
            <Text style={styles.emptyBodyText}>
              {t.emptyBodyLine1}
              {"\n"}
              {t.emptyBodyLine2}
            </Text>
            <Pressable style={styles.emptyPrimaryButton} onPress={() => router.push("/collection")}>
              <FontAwesome5 name="camera-retro" size={12} color="#b8860b" solid />
              <Text style={styles.emptyPrimaryButtonText}>{t.emptyPrimaryButton}</Text>
            </Pressable>
            <Pressable style={styles.emptySecondaryButton} onPress={() => router.push("/(tabs)")}>
              <FontAwesome5 name="home" size={12} color="#a8a29e" solid />
              <Text style={styles.emptySecondaryButtonText}>{t.emptySecondaryButton}</Text>
            </Pressable>
          </View>
        </ScrollView>

        <BuyeoCutFab bottom={insets.bottom + 113} />

        <BottomNav
          active="album"
          labels={mapT.nav}
          onNavigate={(key: BottomNavKey) => {
            if (key === "map") router.push("/(tabs)");
            if (key === "collection") router.push("/collection");
            if (key === "myPage") router.push("/my-page");
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.photoSection}>
        {header}
        <View style={styles.photoSectionHeader}>
          <Text style={styles.themeLabel}>{entry?.name[locale] ?? t.themeLabel}</Text>
          {(capturedPhotos.length > 0 || photo) && (
            <View style={styles.editControls}>
              {/* Placeholder slots have no real timestamp, so reordering them
                  is meaningless — only show sort once there's more than one
                  real capture to reorder. */}
              {capturedPhotos.length > 0 && (
                <Pressable
                  style={[styles.editControlButton, sortOldestFirst && styles.editControlButtonActive]}
                  onPress={() => setSortOldestFirst((current) => !current)}
                  hitSlop={8}>
                  <FontAwesome5
                    name={sortOldestFirst ? "sort-amount-up" : "sort-amount-down"}
                    size={12}
                    color={sortOldestFirst ? "#fff" : "#9ca3af"}
                    solid
                  />
                </Pressable>
              )}
              <Pressable
                style={[styles.editControlButton, isEditMode && styles.editControlButtonActive]}
                onPress={() => setIsEditMode((current) => !current)}
                hitSlop={8}>
                <FontAwesome5 name={isEditMode ? "check" : "pen"} size={12} color={isEditMode ? "#fff" : "#9ca3af"} solid />
              </Pressable>
            </View>
          )}
        </View>
        <View style={styles.photoGrid}>
          {/* Real captures (from the person camera) lead the grid; the rest
              is filled out to the entry's known photoCount (법왕: 6, 무왕: 3)
              with the same placeholder illustration Figma's own photo-picker
              screens (node 0:1418) reuse across every slot in a theme. */}
          {displayedCapturedPhotos.map((captured) => {
            const pose = PERSON_POSES[locationId]?.find((candidate) => candidate.id === captured.poseId);
            return (
              <Pressable
                key={captured.id}
                style={({ pressed }) => [styles.photoCard, pressed && styles.photoCardPressed]}
                onPress={() =>
                  isEditMode
                    ? removePhoto(locationId, captured.id)
                    : router.push({ pathname: "/album", params: { locationId, photo: captured.id } })
                }>
                <Image source={{ uri: captured.uri }} style={styles.photoImage} resizeMode="cover" />
                {pose && (
                  <Image
                    source={pose.image}
                    style={[styles.photoImagePersonOverlay, { aspectRatio: pose.aspectRatio }]}
                    resizeMode="cover"
                  />
                )}
                {isEditMode && (
                  <View style={styles.deleteBadge}>
                    <FontAwesome5 name="trash-alt" size={12} color="#fff" solid />
                  </View>
                )}
              </Pressable>
            );
          })}
          {/* Placeholder-filled slots stay visible in edit mode too (previously
              hidden whenever isEditMode was true) — with 0-1 real captures,
              hiding them made the whole grid go blank the moment edit mode
              was entered, which read as "delete is broken" even though
              removePhoto itself worked fine. They're just not deletable
              (nothing to delete — disabled instead of wired to remove), so
              tapping into one mid-edit doesn't also navigate away. */}
          {photo &&
            Array.from({ length: Math.max((entry?.photoCount ?? 1) - capturedPhotos.length, 0) }).map((_, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.photoCard,
                  pressed && styles.photoCardPressed,
                  isEditMode && styles.photoCardDimmed,
                ]}
                disabled={isEditMode}
                onPress={() => router.push({ pathname: "/album", params: { locationId, photo: String(index) } })}>
                <Image source={photo.image} style={styles.photoImage} resizeMode="cover" />
              </Pressable>
            ))}
        </View>
      </ScrollView>

      <BuyeoCutFab bottom={insets.bottom + 96} />

      <BottomNav
        active="album"
        labels={mapT.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "map") router.push("/(tabs)");
          if (key === "collection") router.push("/collection");
          if (key === "myPage") router.push("/my-page");
        }}
      />
    </View>
  );
}

function PhotoViewer({ locationId, photoParam }: { locationId: LocationId; photoParam: string }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const t = albumScreenText[locale];
  const mapT = mapScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const collectible = COLLECTIBLES[locationId];
  const { photosByLocation } = useCapturedPhotos();
  const captured = (photosByLocation[locationId] ?? []).find((item) => item.id === photoParam);
  const capturedPose = captured && PERSON_POSES[locationId]?.find((candidate) => candidate.id === captured.poseId);

  const handleShare = () => {
    const label = captured?.poseLabel || collectible?.name[locale];
    if (!label) return;
    Share.share({ message: `${label} · ${mapT.pins[locationId]} ${shareSuffix[locale]}` });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.viewerHeader, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.viewerBackButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
        </Pressable>
        <View style={styles.viewerHeaderText}>
          <Text style={styles.viewerTitle}>{mapT.pins[locationId]}</Text>
          <Text style={styles.viewerSubtitle}>{entry?.locationCaption[locale] ?? mapT.pins[locationId]}</Text>
        </View>
      </View>

      <View style={styles.viewerPhotoWrapper}>
        {captured ? (
          <>
            <Image source={{ uri: captured.uri }} style={styles.viewerPhoto} resizeMode="cover" />
            {capturedPose && (
              <Image
                source={capturedPose.image}
                style={[styles.viewerPersonOverlay, { aspectRatio: capturedPose.aspectRatio }]}
                resizeMode="cover"
              />
            )}
          </>
        ) : (
          collectible && <Image source={collectible.image} style={styles.viewerPhoto} resizeMode="cover" />
        )}
        {(captured?.poseLabel || entry) && (
          <View style={styles.viewerCaptionPill}>
            <Text style={styles.viewerCaptionText}>● {captured?.poseLabel || entry?.name[locale]}</Text>
          </View>
        )}
      </View>

      <View style={[styles.viewerActions, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.viewerSideButton} onPress={() => router.push("/buyeo-cut")}>
          <View style={styles.viewerSideCircle}>
            <GripRectIcon />
          </View>
          <Text style={styles.viewerSideLabel}>{t.buyeoCutLabel}</Text>
        </Pressable>

        <Pressable style={styles.viewerDownloadButton} onPress={handleShare}>
          <FontAwesome5 name="share-alt" size={20} color="#fff" solid />
        </Pressable>

        <Pressable
          style={styles.viewerSideButton}
          onPress={() => router.push({ pathname: "/person-camera", params: { locationId } })}>
          <View style={styles.viewerSideCircle}>
            <FontAwesome5 name="camera" size={16} color="#1b1b1b" solid />
          </View>
          <Text style={styles.viewerSideLabel}>{t.personCameraLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  fab: {
    position: "absolute",
    right: 40,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#1b1b1b",
  },
  listSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  headerSubtitle: {
    flex: 1,
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 11,
    lineHeight: 16.5,
    color: "#9ca3af",
  },
  list: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(231,229,228,0.6)",
    borderRadius: 16,
    padding: 17,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f5f5f4",
    overflow: "hidden",
  },
  cardThumbImage: {
    width: "100%",
    height: "100%",
  },
  cardPhotoCountBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    backgroundColor: "#800000",
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cardPhotoCountText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
  },
  cardTextColumn: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 15,
    color: "#1b1b1b",
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardLocation: {
    fontFamily: "serif",
    fontSize: 12,
    color: "#9ca3af",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 18,
    color: "#1b1b1b",
    textAlign: "center",
    marginBottom: 12,
  },
  emptyBodyText: {
    fontSize: 12,
    lineHeight: 19.5,
    color: "#78716c",
    textAlign: "center",
    marginBottom: 32,
  },
  emptyPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: "#800000",
    borderRadius: 16,
    paddingVertical: 16,
  },
  emptyPrimaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.3,
  },
  emptySecondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 16,
    paddingVertical: 15,
    marginTop: 12,
  },
  emptySecondaryButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a8a29e",
  },
  themeLabel: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 12,
    color: "#b8860b",
    textTransform: "uppercase",
  },
  photoSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 12,
    marginBottom: 12,
  },
  editControls: {
    flexDirection: "row",
    gap: 8,
  },
  editControlButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  editControlButtonActive: {
    backgroundColor: "#800000",
  },
  deleteBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(27,27,27,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Matches the real card proportions from Figma's photo-picker screens
  // (node 0:1418: aspect-[159/212] cards in a tight 2-col, 14px-gap grid) —
  // a square 46%-width tile is what made a single photo look oversized.
  photoSection: {
    paddingBottom: 24,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingHorizontal: 24,
  },
  photoCard: {
    width: "46%",
    aspectRatio: 159 / 212,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  photoCardPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.97 }],
  },
  photoCardDimmed: {
    opacity: 0.4,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoImagePersonOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: "92%",
  },
  // Photo viewer (Figma "사진 개별 선택시", node 0:1630)
  viewerHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  viewerBackButton: {
    position: "absolute",
    left: 24,
    bottom: 16,
  },
  viewerHeaderText: {
    alignItems: "center",
    gap: 2,
  },
  viewerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  viewerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  viewerPhotoWrapper: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  viewerPhoto: {
    width: "100%",
    height: "100%",
  },
  viewerPersonOverlay: {
    position: "absolute",
    right: 0,
    bottom: 0,
    height: "92%",
  },
  viewerCaptionPill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  viewerCaptionText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#fdfcf8",
  },
  viewerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    paddingTop: 16,
  },
  viewerSideButton: {
    alignItems: "center",
    gap: 8,
  },
  viewerSideCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerSideLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
  },
  viewerDownloadButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
  },
});
