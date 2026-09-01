import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";

import { GripRectIcon } from "@/components/grip-rect-icon";
import { ALBUM_ENTRIES } from "@/constants/album";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { PERSON_POSES } from "@/constants/poses";
import { albumScreenText, mapScreenText, personCameraText } from "@/constants/translations";
import { useCapturedPhotos } from "@/hooks/use-captured-photos";
import { useLanguage } from "@/hooks/use-language";
import { saveSelfiePhoto } from "@/lib/api/selfies";
import { PERSON_OVERLAY_HEIGHT_RATIO, resolveLocationId, resolveNumberParam, resolveSingleParam } from "@/lib/selfie-route";
import { shareImageAsync } from "@/lib/share-image";

// Matches Figma "사진 저장", node 0:1589 — same layout as the album's photo
// viewer, but the center action is "download/save" (not share) and there's
// a small share button pinned to the photo's own corner instead.
export default function PhotoSaveScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    poseId?: string;
    poseLabel?: string;
    poseImageUrl?: string;
    poseAspectRatio?: string;
    uri?: string;
    personOverlayHeightRatio?: string;
    spotId?: string;
    storyId?: string;
    collectionItemId?: string;
    collectionItemName?: string;
  }>();
  const locationId = resolveLocationId(params.locationId, params.spotId);
  const poseId = params.poseId ?? "";
  const selectedPoseId = resolveNumberParam(params.poseId);
  const poseLabel = params.poseLabel ?? "";
  const collectionItemName = resolveSingleParam(params.collectionItemName) ?? "";
  const poseImageUrl = params.poseImageUrl ?? "";
  const parsedPoseAspectRatio = Number(params.poseAspectRatio);
  const uri = params.uri ?? "";
  const parsedPersonOverlayHeightRatio = Number(params.personOverlayHeightRatio);
  const personOverlayHeightRatio =
    Number.isFinite(parsedPersonOverlayHeightRatio) && parsedPersonOverlayHeightRatio > 0
      ? parsedPersonOverlayHeightRatio
      : PERSON_OVERLAY_HEIGHT_RATIO;
  const spotId = resolveNumberParam(params.spotId);
  const storyId = resolveNumberParam(params.storyId);
  const collectionItemId = resolveNumberParam(params.collectionItemId);

  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const t = personCameraText[locale];
  const albumT = albumScreenText[locale];
  const mapT = mapScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const fallbackPose = PERSON_POSES[locationId]?.find((candidate) => candidate.id === poseId);
  const pose = poseImageUrl
    ? {
        id: poseId,
        label: { ko: poseLabel, en: poseLabel, zh: poseLabel, ja: poseLabel },
        image: { uri: poseImageUrl },
        aspectRatio:
          Number.isFinite(parsedPoseAspectRatio) && parsedPoseAspectRatio > 0
            ? parsedPoseAspectRatio
            : fallbackPose?.aspectRatio ?? 0.55,
      }
    : fallbackPose;
  const compositeRef = useRef<View>(null);
  const compositePhotoUriRef = useRef<string | null>(null);
  const [wrapperSize, setWrapperSize] = useState({ width: 0, height: 0 });
  const handlePhotoWrapperLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setWrapperSize({ width, height });
  };

  // The saved photo was cropped to the camera screen's visible viewfinder. Here
  // it fills the whole gray frame (scaled up to the frame height, sides cropped
  // — no letterbox bars), and since the viewfinder band maps to the full frame
  // height, the figure is bottom-anchored and sized by the same fraction of the
  // band it took up while framing.
  const personOverlayHeight = wrapperSize.height * personOverlayHeightRatio;

  const { addPhoto } = useCapturedPhotos();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showShareUnavailableToast, setShowShareUnavailableToast] = useState(false);

  const captureCompositePhoto = async () => {
    if (compositePhotoUriRef.current) return compositePhotoUriRef.current;
    if (!compositeRef.current) return uri;
    try {
      const compositeUri = await captureRef(compositeRef.current, {
        format: "jpg",
        quality: 0.9,
        result: "tmpfile",
      });
      compositePhotoUriRef.current = compositeUri;
      return compositeUri;
    } catch (error) {
      // e.g. an old dev client running before react-native-view-shot's
      // native module was linked — fall back to the raw frame instead of
      // letting this throw abort the whole save/share silently.
      console.error("[photo-save] view-shot capture failed, using raw camera frame", error);
      return uri;
    }
  };

  const handleShare = async () => {
    if (isSharing || !uri) return;
    setIsSharing(true);
    try {
      const compositeUri = await captureCompositePhoto();
      const didShare = await shareImageAsync(
        compositeUri,
        collectionItemName || poseLabel || entry?.name[locale] || mapT.pins[locationId],
      );
      if (!didShare) setShowShareUnavailableToast(true);
    } catch (error) {
      console.error("[photo-save] selfie photo share failed", error);
      setShowShareUnavailableToast(true);
    } finally {
      setIsSharing(false);
    }
  };

  // Saves the same composed frame the user sees here: camera photo plus the
  // selected person overlay captured by react-native-view-shot.
  const handleSave = async () => {
    if (isSaved || isSaving || !uri) return;
    setIsSaving(true);
    try {
      const compositeUri = await captureCompositePhoto();
      let serverSelfiePhotoId: number | undefined;
      if (spotId !== null && storyId !== null && collectionItemId !== null) {
        try {
          const saved = await saveSelfiePhoto({
            spotId,
            storyId,
            collectionItemId,
            ...(selectedPoseId !== null ? { poseId: selectedPoseId } : {}),
            photoUri: compositeUri,
          });
          serverSelfiePhotoId = saved.selfiePhotoId;
        } catch (error) {
          // Server sync is best-effort — the local save below must still
          // happen so a network hiccup doesn't lose the capture entirely.
          console.error("[photo-save] server selfie sync failed, keeping local copy only", error);
        }
      }
      addPhoto({
        locationId,
        poseId,
        poseLabel,
        uri: compositeUri,
        ...(collectionItemId !== null ? { collectionItemId } : {}),
        ...(collectionItemName ? { collectionItemName } : {}),
        serverSelfiePhotoId,
      });
      setIsSaved(true);
      setShowSaveToast(true);
    } catch (error) {
      console.error("[photo-save] selfie photo save failed", error);
    } finally {
      setIsSaving(false);
    }
  };

  const openAlbum = () => {
    router.push("/album");
  };

  useEffect(() => {
    if (!showSaveToast) return;
    const timer = setTimeout(() => setShowSaveToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showSaveToast]);

  useEffect(() => {
    if (!showShareUnavailableToast) return;
    const timer = setTimeout(() => setShowShareUnavailableToast(false), 2200);
    return () => clearTimeout(timer);
  }, [showShareUnavailableToast]);

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

      <View style={styles.photoWrapper} onLayout={handlePhotoWrapperLayout}>
        <View ref={compositeRef} style={StyleSheet.absoluteFill} collapsable={false}>
          {uri ? <Image source={{ uri }} style={styles.photoBackground} resizeMode="cover" /> : null}
          {pose && (
            <View
              style={[styles.photoPersonOverlay, { aspectRatio: pose.aspectRatio, height: personOverlayHeight }]}
              pointerEvents="none">
              <Image source={pose.image} style={styles.photoPersonOverlayImage} resizeMode="cover" />
            </View>
          )}
          {pose && <Text style={styles.photoDisclosureText}>{t.aiImageDisclosure}</Text>}
        </View>

        {poseLabel && (
          <View style={styles.captionPill}>
            <Text style={styles.captionText}>● {poseLabel}</Text>
          </View>
        )}

        <Pressable style={styles.shareCorner} onPress={handleShare} disabled={isSharing}>
          <FontAwesome5 name="share-alt" size={16} color="#b8860b" solid />
        </Pressable>

        {showSaveToast ? (
          <SaveToast title={t.photoSavedToastTitle} body={t.photoSavedToastBody} />
        ) : (
          showShareUnavailableToast && (
            <SaveToast title={t.shareUnavailableToastTitle} body={t.shareUnavailableToastBody} />
          )
        )}
      </View>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={styles.sideButton}
          onPress={() =>
            router.push({
              pathname: "/buyeo-cut",
              params: collectionItemId !== null ? { collectionItemId: String(collectionItemId) } : {},
            })
          }>
          <View style={styles.sideCircle}>
            <GripRectIcon />
          </View>
          <Text style={styles.sideLabel}>{albumT.buyeoCutLabel}</Text>
        </Pressable>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <FontAwesome5 name={isSaved ? "check" : "download"} size={24} color="#fff" solid />
        </Pressable>

        <Pressable style={styles.sideButton} onPress={openAlbum}>
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
  photoBackground: {
    width: "100%",
    height: "100%",
  },
  // Same right-anchored, floor-standing placement as the live camera overlay
  // (not centered), so the saved preview matches what was actually framed.
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
  photoDisclosureText: {
    position: "absolute",
    right: 10,
    bottom: 10,
    zIndex: 3,
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
