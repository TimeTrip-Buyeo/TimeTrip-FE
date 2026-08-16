import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, LayoutAnimation, Pressable, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GripRectIcon } from "@/components/grip-rect-icon";
import { ALBUM_ENTRIES } from "@/constants/album";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { MAP_LOCATIONS, type LocationId } from "@/constants/locations";
import { PERSON_POSES } from "@/constants/poses";
import { albumScreenText, mapScreenText, personCameraText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";

const KNOWN_LOCATION_IDS = new Set<string>(MAP_LOCATIONS.map((location) => location.id));

function resolveLocationId(raw: string | string[] | undefined): LocationId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && KNOWN_LOCATION_IDS.has(value) ? (value as LocationId) : "pagoda";
}

function resolveSingleParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

// actionBar's own content height (paddingTop 17 + 64px shutter + paddingBottom 24), excluding safe-area inset.
const ACTION_BAR_CONTENT_HEIGHT = 105;
const PERSON_OVERLAY_SCREEN_HEIGHT_RATIO = 0.4;

// Matches Figma "인물 카메라 (포즈 선택 가능)", node 0:1000. The person cutout is
// composited live over the real camera feed (not baked into a single photo
// file — this project has no view-shot/native compositing module installed
// yet), and capture uses expo-camera's own takePictureAsync.
export default function PersonCameraScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    spotId?: string;
    storyId?: string;
    collectionItemId?: string;
  }>();
  const locationId = resolveLocationId(params.locationId);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { locale } = useLanguage();

  const mapT = mapScreenText[locale];
  const t = personCameraText[locale];
  const albumT = albumScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const poses = PERSON_POSES[locationId] ?? [];

  const [permission, requestPermission] = useCameraPermissions();
  const [poseIndex, setPoseIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("front");
  const [isPoseSectionExpanded, setIsPoseSectionExpanded] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Bumped on every start/cancel so an in-flight setTimeout chain from a
  // cancelled countdown can recognize it's stale and stop instead of firing
  // late (e.g. after the user backs out mid-countdown).
  const countdownTokenRef = useRef(0);
  // Measured (not guessed) from the pose section's own layout — its exact
  // height shifts with font metrics across platforms, and a hardcoded guess
  // is what previously let it silently drift out of sync and clip the
  // figure standing above it.
  const [poseSectionHeight, setPoseSectionHeight] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  // Shown only for the first few seconds on entering the screen, then fades
  // out — a persistent instruction pill was in the way once the shot was
  // already framed.
  const spotPillOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(spotPillOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 2800);
    return () => clearTimeout(timer);
  }, [spotPillOpacity]);

  const togglePoseSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPoseSectionExpanded((expanded) => !expanded);
  };

  const handlePoseSectionLayout = (event: LayoutChangeEvent) => {
    setPoseSectionHeight(event.nativeEvent.layout.height);
  };

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    return () => {
      countdownTokenRef.current += 1;
    };
  }, []);

  const selectedPose = poses[poseIndex];

  // Computed (not hardcoded) so the pose section's anchor always sits right
  // above the action bar regardless of screen/inset size — a fixed guess
  // here is what let the two silently overlap and swallow the collapse
  // toggle's taps once the section shrank.
  const actionBarHeight = ACTION_BAR_CONTENT_HEIGHT + insets.bottom;
  const poseAreaBottom = actionBarHeight;

  // The person overlay's own floor: it must clear whatever opaque panel is
  // currently stacked above the action bar (the pose section, in either its
  // expanded or collapsed height), or the panel paints over — "잘리는" —
  // the figure's legs instead of the figure standing on top of it. Falls
  // back to 0 before the first layout pass and whenever there's no pose
  // section to render at all (poses.length <= 1).
  const personFloor = actionBarHeight + (poses.length > 1 ? poseSectionHeight : 0);
  const personOverlayHeight = windowHeight * PERSON_OVERLAY_SCREEN_HEIGHT_RATIO;

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      router.push({
        pathname: "/photo-save",
        params: {
          locationId,
          poseId: selectedPose?.id ?? "",
          poseLabel: selectedPose?.label[locale] ?? "",
          uri: photo.uri,
          ...(resolveSingleParam(params.spotId) ? { spotId: resolveSingleParam(params.spotId)! } : {}),
          ...(resolveSingleParam(params.storyId) ? { storyId: resolveSingleParam(params.storyId)! } : {}),
          ...(resolveSingleParam(params.collectionItemId)
            ? { collectionItemId: resolveSingleParam(params.collectionItemId)! }
            : {}),
        },
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const runCountdown = (secondsLeft: number, token: number) => {
    if (countdownTokenRef.current !== token) return;
    setCountdown(secondsLeft);
    setTimeout(() => {
      if (countdownTokenRef.current !== token) return;
      if (secondsLeft <= 1) {
        setCountdown(null);
        takePhoto();
      } else {
        runCountdown(secondsLeft - 1, token);
      }
    }, 1000);
  };

  const handleCapture = () => {
    if (isCapturing) return;
    if (countdown !== null) {
      // Tapping again mid-countdown cancels it, matching common camera apps.
      countdownTokenRef.current += 1;
      setCountdown(null);
      return;
    }
    if (timerSeconds > 0) {
      countdownTokenRef.current += 1;
      runCountdown(timerSeconds, countdownTokenRef.current);
    } else {
      takePhoto();
    }
  };

  const handleSelectTimer = (seconds: 0 | 3 | 5 | 10) => {
    setTimerSeconds(seconds);
    setIsTimerMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cameraFallback]}>
          <FontAwesome5 name="camera" size={40} color="rgba(255,255,255,0.35)" solid />
          <Text style={styles.cameraFallbackText}>{t.cameraPermissionMessage}</Text>
          {permission && !permission.granted && permission.canAskAgain && (
            <Pressable style={styles.cameraPermissionButton} onPress={requestPermission}>
              <Text style={styles.cameraPermissionButtonText}>{t.grantCameraAccessLabel}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* The historical figure, composited live on top of the feed — "그
          인물이랑 같이 사진을 찍는 것처럼", pushed as far to the side as possible
          (allowed to bleed off the screen edge — cropping the body is fine)
          so they read as a companion standing beside the shot, not the
          subject filling it. Sized to roughly chest-height rather than full
          body on purpose. The box's aspectRatio matches the trimmed cutout
          exactly (see constants/poses.ts), so there's no letterbox gap.
          Anchored to personFloor (not the screen edge) so their feet always
          land on whatever opaque panel is topmost, never floating above it
          or getting clipped behind it. */}
      {selectedPose && (
        <View
          style={[
            styles.personOverlay,
            { aspectRatio: selectedPose.aspectRatio, bottom: personFloor, height: personOverlayHeight },
          ]}
          pointerEvents="none">
          <Image source={selectedPose.image} style={styles.personOverlayImage} resizeMode="cover" />
        </View>
      )}

      <View style={styles.guideFrame} pointerEvents="none">
        <View style={[styles.guideCorner, styles.guideCornerTL]} />
        <View style={[styles.guideCorner, styles.guideCornerTR]} />
        <View style={[styles.guideCorner, styles.guideCornerBL]} />
        <View style={[styles.guideCorner, styles.guideCornerBR]} />
        <Animated.View style={[styles.spotPill, { opacity: spotPillOpacity }]} pointerEvents="none">
          <View style={styles.spotDot} />
          <Text style={styles.spotPillText}>{t.photoWithFigureLabel}</Text>
        </Animated.View>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
        </Pressable>
        <View style={styles.headerTextColumn}>
          <Text style={styles.headerTitle}>{mapT.pins[locationId]}</Text>
          <Text style={styles.headerSubtitle}>
            {t.locationSubtitlePrefix}
            {entry?.locationCaption[locale] ?? mapT.pins[locationId]}
          </Text>
        </View>
        <View style={styles.timerButtonWrapper}>
          <Pressable
            style={styles.timerButton}
            onPress={() => setIsTimerMenuOpen((open) => !open)}
            hitSlop={8}
            accessibilityLabel={t.timerButtonAccessibilityLabel}>
            {timerSeconds > 0 ? (
              <Text style={styles.timerButtonText}>{timerSeconds}</Text>
            ) : (
              <FontAwesome5 name="clock" size={12} color="#b8860b" />
            )}
          </Pressable>
          {isTimerMenuOpen && (
            <View style={styles.timerMenu}>
              {([0, 3, 5, 10] as const).map((seconds, index) => {
                const isSelected = seconds === timerSeconds;
                return (
                  <Pressable
                    key={seconds}
                    style={[styles.timerMenuRow, index > 0 && styles.timerMenuRowDivider]}
                    onPress={() => handleSelectTimer(seconds)}>
                    <Text style={[styles.timerMenuRowText, isSelected && styles.timerMenuRowTextSelected]}>
                      {seconds === 0 ? t.timerOffLabel : t.timerOptionLabel(seconds)}
                    </Text>
                    {isSelected && <FontAwesome5 name="check" size={11} color="#800000" solid />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {countdown !== null && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownText}>{countdown}</Text>
        </View>
      )}

      {/* Rendered after the header (not before) so it can never end up
          painted-over by it — that's what made this look "hidden" before. */}
      <Pressable
        style={[styles.flipButton, { top: insets.top + 100 }]}
        onPress={() => setFacing((current) => (current === "front" ? "back" : "front"))}
        hitSlop={8}>
        <FontAwesome5 name="sync-alt" size={16} color="#fff" solid />
      </Pressable>

      {poses.length > 1 && (
        <View style={[styles.poseSection, { bottom: actionBarHeight }]} onLayout={handlePoseSectionLayout}>
          <Pressable style={styles.poseSectionHeader} onPress={togglePoseSection}>
            <View style={styles.poseSectionLabelRow}>
              <FontAwesome5 name="user-circle" size={11} color="#b8860b" solid />
              <Text style={styles.poseSectionLabel}>{t.posePickerLabel}</Text>
            </View>
            <View style={styles.poseSectionHeaderRight}>
              <Text style={styles.poseSelectedBadge}>{t.poseSelectedLabel(poseIndex + 1)}</Text>
              <FontAwesome5 name={isPoseSectionExpanded ? "chevron-down" : "chevron-up"} size={12} color="#9ca3af" solid />
            </View>
          </Pressable>
          {isPoseSectionExpanded && (
            <View style={styles.poseRow}>
              {poses.map((pose, index) => {
                const isSelected = index === poseIndex;
                return (
                  <Pressable
                    key={pose.id}
                    style={[styles.poseThumb, isSelected ? styles.poseThumbSelected : styles.poseThumbUnselected]}
                    onPress={() => setPoseIndex(index)}>
                    <Image source={pose.image} style={styles.poseThumbImage} resizeMode="contain" />
                    <Text style={[styles.poseThumbLabel, isSelected && styles.poseThumbLabelSelected]}>
                      {pose.label[locale]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.sideButton} onPress={() => router.push("/buyeo-cut")}>
          <View style={styles.sideCircle}>
            <GripRectIcon />
          </View>
          <Text style={styles.sideLabel}>{albumT.buyeoCutLabel}</Text>
        </Pressable>

        <Pressable style={styles.shutterButton} onPress={handleCapture} disabled={isCapturing}>
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable style={styles.sideButton} onPress={() => router.push("/album")}>
          <View style={styles.sideCircle}>
            <FontAwesome5 name="image" size={14} color="#1b1b1b" solid />
          </View>
          <Text style={styles.sideLabel}>{mapT.nav.album}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraFallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    backgroundColor: "#1b1b1b",
    paddingHorizontal: 32,
  },
  cameraFallbackText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
  },
  cameraPermissionButton: {
    backgroundColor: "#b8860b",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  cameraPermissionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  // Pushed as far right as possible — allowed to bleed past the screen edge
  // — instead of kept fully on-screen, so the figure reads as standing
  // beside the shot rather than centered in it; a clipped shoulder/arm here
  // is fine. Height is deliberately small (roughly chest-up, not full body)
  // so it sits low and out of the way instead of looming over the header.
  // Width is omitted since it's derived from `aspectRatio` (set inline per
  // pose) so the box hugs the trimmed cutout exactly, with no letterbox
  // gap — this scales the same way for every location's pose set since both
  // dimensions come from the image's own aspect ratio, not a hardcoded size.
  personOverlay: {
    position: "absolute",
    right: -24,
  },
  personOverlayImage: {
    width: "100%",
    height: "100%",
  },
  flipButton: {
    position: "absolute",
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  guideFrame: {
    position: "absolute",
    top: "22%",
    bottom: 210,
    left: 24,
    right: 24,
  },
  guideCorner: {
    position: "absolute",
    width: 16,
    height: 16,
    borderColor: "rgba(255,255,255,0.6)",
  },
  guideCornerTL: { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 },
  guideCornerTR: { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 },
  guideCornerBL: { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 },
  guideCornerBR: { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 },
  spotPill: {
    position: "absolute",
    bottom: -22,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 9999,
    paddingHorizontal: 17,
    paddingVertical: 7,
  },
  spotDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#b8860b",
  },
  spotPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 24,
    paddingBottom: 17,
  },
  headerTextColumn: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 20,
    color: "#1b1b1b",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
  },
  timerButtonWrapper: {
    position: "relative",
  },
  timerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fafaf9",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  timerButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#b8860b",
  },
  timerMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    minWidth: 96,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0ece4",
    paddingVertical: 4,
    overflow: "hidden",
    shadowColor: "#2b1f1b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 10,
  },
  timerMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  timerMenuRowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#f5f1ea",
  },
  timerMenuRowText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1b1b1b",
  },
  timerMenuRowTextSelected: {
    color: "#800000",
    fontWeight: "700",
  },
  countdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  countdownText: {
    fontSize: 96,
    fontWeight: "800",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  poseSection: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 128,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 24,
    paddingTop: 17,
    paddingBottom: 16,
    gap: 12,
  },
  poseSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  poseSectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  poseSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1b1b1b",
    textTransform: "uppercase",
  },
  poseSectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  poseSelectedBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#800000",
  },
  poseRow: {
    flexDirection: "row",
    gap: 12,
  },
  poseThumb: {
    flex: 1,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    gap: 4,
  },
  poseThumbSelected: {
    backgroundColor: "#fcf5f5",
    borderColor: "#800000",
  },
  poseThumbUnselected: {
    backgroundColor: "#fff",
    borderColor: "#e4e4e0",
    opacity: 0.6,
  },
  poseThumbImage: {
    width: 40,
    height: 56,
  },
  poseThumbLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#9ca3af",
    textAlign: "center",
  },
  poseThumbLabelSelected: {
    color: "#1f2937",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 32,
    paddingTop: 17,
  },
  sideButton: {
    alignItems: "center",
    gap: 4,
  },
  sideCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(250,250,249,0.5)",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  sideLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9ca3af",
  },
  shutterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#800000",
  },
});
