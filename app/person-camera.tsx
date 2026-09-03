import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GripRectIcon } from "@/components/grip-rect-icon";
import { ALBUM_ENTRIES } from "@/constants/album";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { PERSON_POSES } from "@/constants/poses";
import { albumScreenText, mapScreenText, personCameraText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { getCollectionItemPoses, type CollectionItemPose } from "@/lib/api/collection-item-poses";
import { toApiUrl } from "@/lib/api/client";
import {
  FIGURE_MAX_ASPECT_RATIO,
  PERSON_OVERLAY_BLEED_FRACTION,
  PERSON_OVERLAY_HEIGHT_RATIO,
  resolveLocationId,
  resolveNumberParam,
  resolveSingleParam,
} from "@/lib/selfie-route";

// actionBar's own content height (paddingTop 17 + 64px shutter + paddingBottom 24), excluding safe-area inset.
const ACTION_BAR_CONTENT_HEIGHT = 105;
// poseSection style's own paddingTop (17) + paddingBottom (16) — added to the
// measured header row to get the pose panel's collapsed height.
const POSE_PANEL_PADDING = 33;
const DEFAULT_REMOTE_POSE_ASPECT_RATIO = 0.55;

type RuntimePersonPose = {
  id: string;
  apiPoseId?: number;
  label: Record<Locale, string>;
  image: ImageSourcePropType;
  imageUrl?: string;
  aspectRatio: number;
};

function firstText(...values: (string | null | undefined)[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

// The preview covers the whole screen, but the only part the user can actually
// compose against is the band between the top header and the bottom pose panel
// — and takePictureAsync returns the full sensor frame (wider FOV still). Crop
// the capture down to exactly that visible band so the saved photo shows the
// same framing, with the figure landing where its feet were during framing
// instead of floating mid-photo.
async function cropToViewfinder(
  photo: { uri: string; width?: number; height?: number },
  frame: { screenWidth: number; screenHeight: number; bandTop: number; bandHeight: number },
): Promise<string> {
  const { uri, width, height } = photo;
  const { screenWidth, screenHeight, bandTop, bandHeight } = frame;
  if (!width || !height || screenWidth <= 0 || screenHeight <= 0 || bandHeight <= 0) return uri;

  // The preview scaled the sensor image to the screen height (its taller axis),
  // cropping left/right — so full image height maps to full screen height.
  // NOTE: this assumes a portrait screen taller than the sensor is wide (true
  // for phones in portrait). On a tablet or a screen wider than the sensor
  // aspect, the preview would scale to WIDTH instead and this crop would be
  // off — revisit height/screenHeight here if targeting tablets.
  const pxPerScreenUnit = height / screenHeight;
  const cropWidth = Math.min(width, Math.round(screenWidth * pxPerScreenUnit));
  const cropHeight = Math.min(height, Math.round(bandHeight * pxPerScreenUnit));
  const originX = Math.round((width - cropWidth) / 2);
  const originY = Math.round(Math.min(Math.max(bandTop * pxPerScreenUnit, 0), height - cropHeight));

  try {
    const image = await ImageManipulator.manipulate(uri)
      .crop({ originX, originY, width: cropWidth, height: cropHeight })
      .renderAsync();
    const result = await image.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
    return result.uri;
  } catch (error) {
    console.error("[person-camera] crop to viewfinder failed, using raw frame", error);
    return uri;
  }
}

function getPoseApiId(pose: CollectionItemPose) {
  return pose.poseId ?? pose.id;
}

function toRuntimePoses(poses: CollectionItemPose[], aspectRatios: Record<string, number>): RuntimePersonPose[] {
  return poses.flatMap((pose, index) => {
    const imageUrl = firstText(pose.poseImageUrl, pose.thumbnailUrl);
    if (!imageUrl) return [];

    const apiPoseId = getPoseApiId(pose);
    const id = String(apiPoseId ?? `remote-${index}`);
    const label = firstText(pose.name) ?? `Pose ${index + 1}`;
    const resolvedImageUrl = toApiUrl(imageUrl);

    return [
      {
        id,
        apiPoseId,
        label: { ko: label, en: label, zh: label, ja: label },
        image: { uri: resolvedImageUrl },
        imageUrl: resolvedImageUrl,
        aspectRatio: aspectRatios[id] ?? DEFAULT_REMOTE_POSE_ASPECT_RATIO,
      },
    ];
  });
}

// Matches Figma "인물 카메라 (포즈 선택 가능)", node 0:1000. This screen
// captures the camera frame first; photo-save then captures the composed
// camera + person overlay image for local/server album storage.
export default function PersonCameraScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    spotId?: string;
    storyId?: string;
    collectionItemId?: string;
    collectionItemName?: string;
  }>();
  const locationId = resolveLocationId(params.locationId, params.spotId);
  const collectionItemId = resolveNumberParam(params.collectionItemId);
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { locale } = useLanguage();

  const mapT = mapScreenText[locale];
  const t = personCameraText[locale];
  const albumT = albumScreenText[locale];
  const entry = ALBUM_ENTRIES[locationId];
  const fallbackPoses = PERSON_POSES[locationId] ?? [];

  const [permission, requestPermission] = useCameraPermissions();
  const [poseIndex, setPoseIndex] = useState(0);
  const [remotePoses, setRemotePoses] = useState<CollectionItemPose[]>([]);
  const [remotePoseAspectRatios, setRemotePoseAspectRatios] = useState<Record<string, number>>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [isPoseSectionExpanded, setIsPoseSectionExpanded] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 5 | 10>(0);
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  // Bumped on every start/cancel so an in-flight setTimeout chain from a
  // cancelled countdown can recognize it's stale and stop instead of firing
  // late (e.g. after the user backs out mid-countdown).
  const countdownTokenRef = useRef(0);
  // The pose panel's HEADER row (stable height, expanded or collapsed) anchors
  // the figure and the capture crop — so toggling the pose list never changes
  // what gets saved.
  const [poseHeaderHeight, setPoseHeaderHeight] = useState(0);
  // The pose panel's FULL current height (grows when the list is expanded) —
  // used only to keep the "AI image" disclosure sitting just above the panel's
  // live top edge instead of getting covered by it.
  const [poseSectionHeight, setPoseSectionHeight] = useState(0);
  // Same reasoning — the top header's height depends on the safe-area inset
  // and font metrics, and the saved photo is cropped to start right below it,
  // so it has to be measured, not guessed.
  const [headerHeight, setHeaderHeight] = useState(0);
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

  useEffect(() => {
    if (collectionItemId === null) {
      setRemotePoses([]);
      return;
    }

    let isActive = true;
    getCollectionItemPoses(collectionItemId)
      .then((nextPoses) => {
        if (isActive) setRemotePoses(nextPoses);
      })
      .catch((error) => {
        console.error("[person-camera] collection item poses failed", error);
        if (isActive) setRemotePoses([]);
      });

    return () => {
      isActive = false;
    };
  }, [collectionItemId]);

  useEffect(() => {
    if (remotePoses.length === 0) {
      setRemotePoseAspectRatios({});
      return;
    }

    let isActive = true;
    remotePoses.forEach((pose, index) => {
      const imageUrl = firstText(pose.poseImageUrl, pose.thumbnailUrl);
      if (!imageUrl) return;

      const id = String(getPoseApiId(pose) ?? `remote-${index}`);
      Image.getSize(
        toApiUrl(imageUrl),
        (width, height) => {
          if (!isActive || width <= 0 || height <= 0) return;
          setRemotePoseAspectRatios((current) => ({ ...current, [id]: width / height }));
        },
        () => undefined,
      );
    });

    return () => {
      isActive = false;
    };
  }, [remotePoses]);

  const apiPoses = toRuntimePoses(remotePoses, remotePoseAspectRatios);
  const poses: RuntimePersonPose[] = apiPoses.length > 0 ? apiPoses : fallbackPoses;

  useEffect(() => {
    setPoseIndex(0);
  }, [collectionItemId, locationId]);

  const togglePoseSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsPoseSectionExpanded((expanded) => !expanded);
  };

  const handlePoseHeaderLayout = (event: LayoutChangeEvent) => {
    setPoseHeaderHeight(event.nativeEvent.layout.height);
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
  // The figure's floor. Anchored to the pose panel's COLLAPSED height (header
  // row + the section's own vertical padding), never its live height — so
  // expanding or collapsing the pose list while framing has no effect on the
  // saved photo. Falls back to just the action bar when there's no pose
  // section to render at all (poses.length <= 1).
  const captureFloor = actionBarHeight + (poses.length > 1 ? poseHeaderHeight + POSE_PANEL_PADDING : 0);
  const rawAspectRatio = selectedPose?.aspectRatio ?? DEFAULT_REMOTE_POSE_ASPECT_RATIO;
  // Cap the figure at the "백제 백성" size: a pose whose cutout is wider than
  // FIGURE_MAX_ASPECT_RATIO gets its height scaled down so its rendered width
  // matches the cap — nothing renders bigger than a standard standing figure.
  const figureScale = rawAspectRatio > FIGURE_MAX_ASPECT_RATIO ? FIGURE_MAX_ASPECT_RATIO / rawAspectRatio : 1;
  const personOverlayHeight = windowHeight * PERSON_OVERLAY_HEIGHT_RATIO * figureScale;
  const personOverlayWidth = personOverlayHeight * rawAspectRatio;
  // Bleed a fixed FRACTION of the figure's own width off the right edge, so
  // wide and narrow poses alike keep the same proportion on-screen instead of
  // some getting clipped by a one-size pixel offset.
  const personOverlayRight = -(personOverlayWidth * PERSON_OVERLAY_BLEED_FRACTION);
  // The visible viewfinder: screen minus the top header minus that floor. The
  // saved photo is cropped to exactly this band, so what you framed is what
  // you get — and it doesn't move when the pose panel does.
  const viewfinderHeight = Math.max(1, windowHeight - headerHeight - captureFloor);
  // The pose panel's live top edge — the "AI image" disclosure rides just
  // above it so an expanded panel can't cover it.
  const posePanelTop = actionBarHeight + (poses.length > 1 ? poseSectionHeight : 0);

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) return;
      const framedUri = await cropToViewfinder(photo, {
        screenWidth: windowWidth,
        screenHeight: windowHeight,
        bandTop: headerHeight,
        bandHeight: viewfinderHeight,
      });
      router.push({
        pathname: "/photo-save",
        params: {
          locationId,
          poseId: selectedPose?.apiPoseId !== undefined ? String(selectedPose.apiPoseId) : selectedPose?.id ?? "",
          poseLabel: selectedPose?.label[locale] ?? "",
          ...(selectedPose?.imageUrl ? { poseImageUrl: selectedPose.imageUrl } : {}),
          ...(selectedPose?.aspectRatio ? { poseAspectRatio: String(selectedPose.aspectRatio) } : {}),
          uri: framedUri,
          personOverlayHeightRatio: String(personOverlayHeight / viewfinderHeight),
          ...(resolveSingleParam(params.spotId) ? { spotId: resolveSingleParam(params.spotId)! } : {}),
          ...(resolveSingleParam(params.storyId) ? { storyId: resolveSingleParam(params.storyId)! } : {}),
          ...(resolveSingleParam(params.collectionItemId)
            ? { collectionItemId: resolveSingleParam(params.collectionItemId)! }
            : {}),
          ...(resolveSingleParam(params.collectionItemName)
            ? { collectionItemName: resolveSingleParam(params.collectionItemName)! }
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
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          mirror={facing === "front"}
        />
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
          Anchored to captureFloor — the pose panel's collapsed line — so the
          figure sits in the same place (and saves the same) no matter how the
          pose list is toggled; an expanded panel just floats over its shins. */}
      {selectedPose && (
        <View
          style={[
            styles.personOverlay,
            {
              aspectRatio: selectedPose.aspectRatio,
              bottom: captureFloor,
              height: personOverlayHeight,
              right: personOverlayRight,
            },
          ]}
          pointerEvents="none">
          <Image source={selectedPose.image} style={styles.personOverlayImage} resizeMode="cover" />
        </View>
      )}
      {selectedPose && (
        <Text style={[styles.imageDisclosureText, { bottom: posePanelTop + 8 }]} pointerEvents="none">
          {t.aiImageDisclosure}
        </Text>
      )}

      {/* Bottom tracks the pose panel's live top edge (+ gap) so the "take a
          photo with the figure" pill below it clears the panel instead of
          hiding behind it. */}
      <View style={[styles.guideFrame, { bottom: posePanelTop + 44 }]} pointerEvents="none">
        <View style={[styles.guideCorner, styles.guideCornerTL]} />
        <View style={[styles.guideCorner, styles.guideCornerTR]} />
        <View style={[styles.guideCorner, styles.guideCornerBL]} />
        <View style={[styles.guideCorner, styles.guideCornerBR]} />
        <Animated.View style={[styles.spotPill, { opacity: spotPillOpacity }]} pointerEvents="none">
          <View style={styles.spotDot} />
          <Text style={styles.spotPillText}>{t.photoWithFigureLabel}</Text>
        </Animated.View>
      </View>

      <View
        style={[styles.header, { paddingTop: insets.top + 16 }]}
        onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
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
          <Pressable style={styles.poseSectionHeader} onPress={togglePoseSection} onLayout={handlePoseHeaderLayout}>
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
  // Bleeds past the right screen edge so the figure reads as standing beside
  // the shot rather than centered in it. Both `right` (a fraction of the box
  // width) and `height` are set inline; width comes from `aspectRatio` so the
  // box hugs the trimmed cutout exactly, scaling the same way for every pose.
  personOverlay: {
    position: "absolute",
  },
  personOverlayImage: {
    width: "100%",
    height: "100%",
  },
  imageDisclosureText: {
    position: "absolute",
    right: 12,
    zIndex: 3,
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    // `bottom` is set inline — it follows the pose panel's live top edge.
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
