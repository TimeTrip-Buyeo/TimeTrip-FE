import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CollectibleAcquiredModal } from "@/components/collectible-acquired-modal";
import { LanguageLegendModal } from "@/components/onboarding/language-legend-modal";
import { COLLECTIBLES } from "@/constants/collectibles";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { arCameraText, LOCALES, mapScreenText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { getCollectionItems, type CollectionItem } from "@/lib/api/collections";
import { resolveLocationId, resolveNumberParam, resolveSingleParam } from "@/lib/selfie-route";

// Placeholder — no real audio guide asset is wired up yet, so pressing play
// simulates a few seconds of playback to demonstrate the finished-gating
// flow. Swap for a real onPlaybackStatusUpdate(didJustFinish) once the audio
// guide ships.
const AUDIO_GUIDE_PLACEHOLDER_DURATION_MS = 3000;

function resolveSpotTitle(raw: string | string[] | undefined) {
  return resolveSingleParam(raw) || null;
}

export default function ArCameraScreen() {
  const params = useLocalSearchParams<{ locationId?: string; spotId?: string; storyId?: string; spotName?: string }>();
  const locationId = resolveLocationId(params.locationId, params.spotId, "busosanseong");
  const spotTitle = resolveSpotTitle(params.spotName);
  const spotId = resolveNumberParam(params.spotId);
  const storyId = resolveNumberParam(params.storyId);
  const insets = useSafeAreaInsets();

  const { locale, setLocale } = useLanguage();
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  // Figma shows this AR camera in two states: the guide sheet fully expanded
  // (all details visible) and "peeked" down to a single row so more of the
  // camera view shows through — "스크롤로 전체화면 가능". Toggled by the drag handle.
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [isAcquiredModalVisible, setIsAcquiredModalVisible] = useState(false);
  const [collectionItem, setCollectionItem] = useState<CollectionItem | null>(null);
  const collectible = COLLECTIBLES[locationId];

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (collectible?.type !== "person" || spotId === null || storyId === null) {
      setCollectionItem(null);
      return;
    }

    let isActive = true;
    getCollectionItems(storyId, { spotId, locale, type: "CHARACTER" })
      .then(({ items }) => {
        if (!isActive) return;
        setCollectionItem(items[0] ?? null);
      })
      .catch((error) => {
        console.error("[ar-camera] collection item lookup failed", error);
        if (isActive) setCollectionItem(null);
      });

    return () => {
      isActive = false;
    };
  }, [collectible?.type, locale, spotId, storyId]);

  const mapT = mapScreenText[locale];
  const t = arCameraText[locale];
  const currentLocaleMeta = LOCALES.find((item) => item.code === locale)!;

  const toggleSheet = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSheetExpanded((expanded) => !expanded);
  };

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  const handlePlayAudio = () => {
    if (isAudioPlaying || isAudioFinished) return;
    setIsAudioPlaying(true);
    setTimeout(() => {
      setIsAudioPlaying(false);
      setIsAudioFinished(true);
    }, AUDIO_GUIDE_PLACEHOLDER_DURATION_MS);
  };

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
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

      <LinearGradient
        colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0)"]}
        style={[styles.topBar, { paddingTop: insets.top + 20 }]}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <FontAwesome5 name="chevron-left" size={20} color="#fff" solid />
          </Pressable>
          <Text style={styles.locationTitle}>{spotTitle ?? mapT.pins[locationId]}</Text>
        </View>
        <View style={styles.arActivePill}>
          <View style={styles.arActiveDot} />
          <Text style={styles.arActiveText}>{t.arActiveLabel}</Text>
        </View>
      </LinearGradient>

      {/* AR alignment guide — where the saved historical image for this
          location will be overlaid onto the live camera feed once that
          asset pipeline exists. */}
      <View style={styles.guideBoxWrapper} pointerEvents="none">
        <View style={styles.guideBox}>
          <FontAwesome5 name="expand" size={60} color="rgba(255,255,255,0.3)" solid />
          <View style={styles.guideCaption}>
            <Text style={styles.guideCaptionText}>{t.alignInstructionText}</Text>
          </View>
        </View>
      </View>

      {isLegendVisible && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsLegendVisible(false)} />
      )}

      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable style={styles.dragHandle} onPress={toggleSheet} hitSlop={8}>
          <View style={[styles.dragHandleIcon, !isSheetExpanded && styles.dragHandleIconCollapsed]}>
            <FontAwesome5
              name="chevron-left"
              size={16}
              color="#1b1b1b"
              solid
              style={{ transform: [{ rotate: "-90deg" }] }}
            />
          </View>
        </Pressable>

        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetHeaderIcon}>
            <FontAwesome5 name="camera-retro" size={12} color="#fff" solid />
          </View>
          <Text style={styles.sheetHeaderTitle}>{t.timeSlipCameraTitle}</Text>
        </View>

        {isSheetExpanded && (
          <>
            <View style={styles.characterCard}>
              <View style={styles.characterAvatar}>
                <FontAwesome5 name="user" size={26} color="#800000" solid />
              </View>
              <View style={styles.characterBody}>
                <Text style={styles.characterName}>{t.characterName}</Text>
                <Text style={styles.characterDescription}>{t.collectibleHint}</Text>
              </View>
            </View>

            {/* Placeholder trigger — later this unlocks automatically once
                GPS confirms the visitor is physically at this location,
                instead of being manually tappable. */}
            <View style={styles.audioRow}>
              <Pressable
                style={styles.audioPlayButton}
                onPress={handlePlayAudio}
                disabled={isAudioPlaying || isAudioFinished}>
                <FontAwesome5
                  name={isAudioFinished ? "check" : isAudioPlaying ? "volume-up" : "play"}
                  size={10}
                  color="#b8860b"
                  solid
                />
              </Pressable>
              <View style={styles.audioTextColumn}>
                <Text style={styles.audioLabel}>{t.audioGuideLabel}</Text>
                <Text style={styles.audioTitle}>{t.audioGuideTitle}</Text>
              </View>
              <Pressable
                style={[styles.langBadge, isLegendVisible && styles.langBadgeActive]}
                onPress={() => setIsLegendVisible((visible) => !visible)}
                hitSlop={8}>
                <FontAwesome5 name="globe" size={10} color={isLegendVisible ? "#fff" : "#b8860b"} solid />
                <Text style={[styles.langBadgeText, isLegendVisible && styles.langBadgeTextActive]}>
                  {currentLocaleMeta.badgeLabel}
                </Text>
              </Pressable>
              {isLegendVisible && (
                <View style={styles.legendAnchor}>
                  <LanguageLegendModal currentLocale={locale} onSelect={handleSelectLocale} />
                </View>
              )}
            </View>

            {/* Hidden until the audio guide finishes playing. */}
            {isAudioFinished && (
              <Pressable style={styles.findButton} onPress={() => setIsAcquiredModalVisible(true)}>
                <Text style={styles.findButtonText}>{t.findCollectibleButtonLabel}</Text>
              </Pressable>
            )}

            <View style={styles.navIndicator} />
          </>
        )}
      </View>

      {isAcquiredModalVisible && collectible && (
        <CollectibleAcquiredModal
          type={collectible.type}
          name={collectible.name[locale]}
          description={collectible.description[locale]}
          image={collectible.image}
          onClose={() => setIsAcquiredModalVisible(false)}
          onViewCollection={() => {
            setIsAcquiredModalVisible(false);
            router.push({ pathname: "/collection", params: { locationId } });
          }}
          onTakePhoto={
            collectible.type === "person"
              ? () => {
                  setIsAcquiredModalVisible(false);
                  router.push({
                    pathname: "/person-camera",
                    params: {
                      locationId,
                      ...(spotId !== null ? { spotId: String(spotId) } : {}),
                      ...(storyId !== null ? { storyId: String(storyId) } : {}),
                      ...(collectionItem ? { collectionItemId: String(collectionItem.collectionItemId) } : {}),
                    },
                  });
                }
              : undefined
          }
        />
      )}
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
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  locationTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#fff",
  },
  arActivePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  arActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  arActiveText: {
    fontSize: 9.5,
    color: "#fff",
  },
  guideBoxWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  guideBox: {
    width: 317,
    height: 360,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  guideCaption: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  guideCaptionText: {
    fontSize: 11.3,
    color: "#fff",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fdfcf8",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  dragHandle: {
    alignItems: "center",
    paddingVertical: 6,
  },
  dragHandleIcon: {
    transform: [{ rotate: "0deg" }],
  },
  dragHandleIconCollapsed: {
    transform: [{ rotate: "180deg" }],
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderTitle: {
    fontSize: 15.3,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  characterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
  },
  characterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  characterBody: {
    flex: 1,
    gap: 4,
  },
  characterName: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 13.5,
    color: "#1b1b1b",
  },
  characterDescription: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 9.4,
    lineHeight: 16.25,
    color: "#6b7280",
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingTop: 21,
    paddingBottom: 17,
  },
  audioPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  audioTextColumn: {
    flex: 1,
    gap: 2,
  },
  audioLabel: {
    fontSize: 9.7,
    fontWeight: "700",
    color: "#9ca3af",
  },
  audioTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 11.4,
    color: "#000",
  },
  langBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#b8860b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  langBadgeActive: {
    backgroundColor: "#b8860b",
    borderColor: "#b8860b",
  },
  langBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#b8860b",
  },
  langBadgeTextActive: {
    color: "#fff",
  },
  legendAnchor: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: 8,
    zIndex: 10,
  },
  // Matches Figma exactly (node 110:146): a single full-width CTA, not the
  // 3-button camera-control row (album/shutter/share) this screen had
  // before — that trio wasn't in the design and the shutter/share buttons
  // didn't do anything (no AR capture pipeline exists here).
  findButton: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#800000",
  },
  findButtonText: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 16,
    color: "#fff",
  },
  navIndicator: {
    alignSelf: "center",
    width: 128,
    height: 4,
    borderRadius: 9999,
    backgroundColor: "#e5e7eb",
  },
});
