import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { GripRectIcon } from "@/components/grip-rect-icon";
import { ALBUM_ENTRIES } from "@/constants/album";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { MAP_LOCATIONS, type LocationId } from "@/constants/locations";
import { PERSON_POSES } from "@/constants/poses";
import { albumScreenText, mapScreenText, personCameraText } from "@/constants/translations";
import { useCapturedPhotos } from "@/hooks/use-captured-photos";
import { useLanguage } from "@/hooks/use-language";
import { saveSelfiePhoto } from "@/lib/api/selfies";

const KNOWN_LOCATION_IDS = new Set<string>(MAP_LOCATIONS.map((location) => location.id));
const PERSON_OVERLAY_SCREEN_HEIGHT_RATIO = 0.5;

type ExpoSharingModule = {
  isAvailableAsync?: () => Promise<boolean>;
  shareAsync?: (url: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>;
};
type ExpoSharingModuleShape = ExpoSharingModule & { default?: ExpoSharingModule };

async function getSharingModule(): Promise<ExpoSharingModule | null> {
  try {
    // Lazy-load because an old dev client can run without the native ExpoSharing
    // module until the user rebuilds after installing expo-sharing.
    const sharing = (await import("expo-sharing")) as ExpoSharingModuleShape;
    return sharing.isAvailableAsync ? sharing : sharing.default ?? null;
  } catch (error) {
    console.error("[photo-save] expo-sharing native module is unavailable", error);
    return null;
  }
}

function resolveSingleParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

function resolveNumberParam(raw: string | string[] | undefined) {
  const value = Number(resolveSingleParam(raw));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Matches Figma "사진 저장", node 0:1589 — same layout as the album's photo
// viewer, but the center action is "download/save" (not share) and there's
// a small share button pinned to the photo's own corner instead.
export default function PhotoSaveScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    poseId?: string;
    poseLabel?: string;
    uri?: string;
    spotId?: string;
    storyId?: string;
    collectionItemId?: string;
  }>();
  const locationId = KNOWN_LOCATION_IDS.has(params.locationId ?? "") ? (params.locationId as LocationId) : "pagoda";
  const poseId = params.poseId ?? "";
  const poseLabel = params.poseLabel ?? "";
  const uri = params.uri ?? "";
  const spotId = resolveNumberParam(params.spotId);
  const storyId = resolveNumberParam(params.storyId);
  const collectionItemId = resolveNumberParam(params.collectionItemId);

  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { locale } = useLanguage();
  const t = personCameraText[locale];
  const albumT = albumScreenText[locale];
  const mapT = mapScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const pose = PERSON_POSES[locationId]?.find((candidate) => candidate.id === poseId);
  const personOverlayHeight = windowHeight * PERSON_OVERLAY_SCREEN_HEIGHT_RATIO;
  const compositeRef = useRef<View>(null);

  const { addPhoto } = useCapturedPhotos();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const captureCompositePhoto = () => {
    if (!compositeRef.current) return Promise.resolve(uri);
    return captureRef(compositeRef.current, {
      format: "jpg",
      quality: 0.9,
      result: "tmpfile",
    });
  };

  const handleShare = async () => {
    if (isSharing || !uri) return;
    setIsSharing(true);
    try {
      const sharing = await getSharingModule();
      if (!sharing) return;

      const isAvailable = await sharing.isAvailableAsync?.();
      if (!isAvailable || !sharing.shareAsync) return;

      const compositeUri = await captureCompositePhoto();
      await sharing.shareAsync(compositeUri, {
        mimeType: "image/jpeg",
        dialogTitle: poseLabel || entry?.name[locale] || mapT.pins[locationId],
      });
    } catch (error) {
      console.error("[photo-save] selfie photo share failed", error);
    } finally {
      setIsSharing(false);
    }
  };

  // TODO: composite the person cutout into the saved photo itself (not just
  // display them as two live-layered images) once react-native-view-shot is
  // linked in — it's already installed but needs a native rebuild
  // (`npx expo run:android`) before captureRef() is safe to call, so this
  // still saves the raw camera frame for now.
  const handleSave = async () => {
    if (isSaved || isSaving || !uri) return;
    setIsSaving(true);
    try {
      const compositeUri = await captureCompositePhoto();
      let serverSelfiePhotoId: number | undefined;
      if (spotId && storyId && collectionItemId) {
        const saved = await saveSelfiePhoto({ spotId, storyId, collectionItemId, photoUri: compositeUri });
        serverSelfiePhotoId = saved.selfiePhotoId;
      }
      addPhoto({ locationId, poseId, poseLabel, uri: compositeUri, serverSelfiePhotoId });
      setIsSaved(true);
      setShowSaveToast(true);
    } catch (error) {
      console.error("[photo-save] selfie photo save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!showSaveToast) return;
    const timer = setTimeout(() => setShowSaveToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showSaveToast]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{mapT.pins[locationId]}</Text>
          <Text style={styles.headerSubtitle}>
            {t.locationSubtitlePrefix}
            {entry?.locationCaption[locale] ?? mapT.pins[locationId]}
          </Text>
        </View>
      </View>

      <View style={styles.photoWrapper}>
        <View ref={compositeRef} style={styles.compositePhoto} collapsable={false}>
          {uri ? <Image source={{ uri }} style={styles.photoBackground} resizeMode="cover" /> : null}
          {pose && (
            <View
              style={[styles.photoPersonOverlay, { aspectRatio: pose.aspectRatio, height: personOverlayHeight }]}
              pointerEvents="none">
              <Image source={pose.image} style={styles.photoPersonOverlayImage} resizeMode="cover" />
            </View>
          )}
        </View>

        {poseLabel && (
          <View style={styles.captionPill}>
            <Text style={styles.captionText}>● {poseLabel}</Text>
          </View>
        )}

        <Pressable style={styles.shareCorner} onPress={handleShare} disabled={isSharing}>
          <FontAwesome5 name="share-alt" size={16} color="#b8860b" solid />
        </Pressable>

        {showSaveToast && <SaveToast title={t.photoSavedToastTitle} body={t.photoSavedToastBody} />}
      </View>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={styles.sideButton} onPress={() => router.push("/buyeo-cut")}>
          <View style={styles.sideCircle}>
            <GripRectIcon />
          </View>
          <Text style={styles.sideLabel}>{albumT.buyeoCutLabel}</Text>
        </Pressable>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <FontAwesome5 name={isSaved ? "check" : "download"} size={24} color="#fff" solid />
        </Pressable>

        <Pressable style={styles.sideButton} onPress={() => router.push({ pathname: "/album", params: { locationId } })}>
          <View style={styles.sideCircle}>
            <FontAwesome5 name="image" size={14} color="#1b1b1b" solid />
          </View>
          <Text style={styles.sideLabel}>{mapT.nav.album}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Same gold-bordered card design as buyeo-cut.tsx's SaveToast (Figma node
// 0:612's "저장버튼 클릭시" confirmation), reused here for the same save action.
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
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    position: "absolute",
    left: 24,
    bottom: 16,
  },
  headerText: {
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  photoWrapper: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  compositePhoto: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f3f4f6",
  },
  photoBackground: {
    width: "100%",
    height: "100%",
  },
  // Same right-anchored placement as the live camera overlay (not centered),
  // so the saved preview matches what was actually framed in the shot.
  photoPersonOverlay: {
    position: "absolute",
    right: -24,
    bottom: 0,
    zIndex: 2,
  },
  photoPersonOverlayImage: {
    width: "100%",
    height: "100%",
  },
  captionPill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    zIndex: 3,
  },
  captionText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#fdfcf8",
  },
  // zIndex above photoPersonOverlay (2) — the person cutout was previously
  // painting over this corner and swallowing its taps.
  shareCorner: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 3,
  },
  saveToast: {
    position: "absolute",
    top: "50%",
    left: 24,
    right: 24,
    transform: [{ translateY: -60 }],
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#b8860b",
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 17,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    zIndex: 4,
  },
  saveToastTitle: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.5,
    color: "#b8860b",
    textAlign: "center",
  },
  saveToastBody: {
    fontFamily: "serif",
    fontSize: 12,
    color: "#b8860b",
    textAlign: "center",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    paddingTop: 16,
  },
  sideButton: {
    alignItems: "center",
    gap: 8,
  },
  sideCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
  },
  saveButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
  },
});
