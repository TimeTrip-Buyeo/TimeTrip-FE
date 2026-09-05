import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CollectibleAcquiredModal } from "@/components/collectible-acquired-modal";
import { LanguageLegendModal } from "@/components/onboarding/language-legend-modal";
import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { arCameraText, collectibleAcquiredText, LOCALES, mapScreenText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { acquireCollectionItem, type AcquireCollectionItemResult } from "@/lib/api/collections";
import {
  getLocalizedSpotName,
  getSpotDetail,
  getSpotTimeslip,
  type SpotDetail,
  type SpotTimeslip,
  type StoryAudioGuide,
} from "@/lib/api/spots";
import { toApiUrl } from "@/lib/api/client";
import { AR_TIMESLIP_ENTER_RADIUS_METERS, AR_TIMESLIP_EXIT_RADIUS_METERS, distanceMeters } from "@/lib/geo";
import { resolveLocationId, resolveNumberParam, resolveSingleParam } from "@/lib/selfie-route";

// Screen is visible from onStart(mount) to onStop(unmount) only — the watch
// subscription below is torn down on unmount, matching the spec's "화면이
// 보이는 동안만 5~10초 간격으로 위치 업데이트".
const LOCATION_POLL_INTERVAL_MS = 7000;

// TEST-ONLY: skips the GPS radius check entirely so the overlay always shows
// as soon as this screen is entered, regardless of distance to the spot.
// Flip back to false to restore the real 100m/90m enter/exit radius gate.
const AR_TIMESLIP_TEST_BYPASS_RADIUS_CHECK = true;

// SEARCHING → READY / EMPTY ↔ SEARCHING transitions only — never gates
// screen entry (see lib/geo.ts for the enter/exit hysteresis values).
type GeoState = "searching" | "loading" | "ready" | "empty";

function resolveSpotTitle(raw: string | string[] | undefined) {
  return resolveSingleParam(raw) || null;
}

function AudioGuideButton({ guide, onFinished }: { guide: StoryAudioGuide; onFinished: () => void }) {
  const resolvedUri = toApiUrl(guide.filePath);
  const source = useMemo(() => ({ uri: resolvedUri }), [resolvedUri]);
  const player = useAudioPlayer(source);
  const status = useAudioPlayerStatus(player);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (status.didJustFinish) {
      setIsFinished(true);
      onFinished();
    }
  }, [status.didJustFinish, onFinished]);

  const handlePress = () => {
    if (isFinished) {
      setIsFinished(false);
      player.seekTo(0).then(() => player.play());
      return;
    }
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <Pressable style={styles.audioPlayButton} onPress={handlePress}>
      <FontAwesome5
        name={isFinished ? "redo" : status.playing ? "volume-up" : "play"}
        size={10}
        color="#b8860b"
        solid
      />
    </Pressable>
  );
}

export default function ArCameraScreen() {
  const params = useLocalSearchParams<{ locationId?: string; spotId?: string; storyId?: string; spotName?: string }>();
  const locationId = resolveLocationId(params.locationId, params.spotId, "busosanseong");
  const spotTitle = resolveSpotTitle(params.spotName);
  const spotId = resolveNumberParam(params.spotId);
  const insets = useSafeAreaInsets();

  const { locale, setLocale } = useLanguage();
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  // Figma shows this AR camera in two states: the guide sheet fully expanded
  // (all details visible) and collapsed down to just the "타임슬립카메라"
  // header so more of the camera view shows through — "스크롤로 전체화면 가능".
  // The audio row stays mounted (never unmounted) while collapsed so
  // playback keeps running underneath; see its `display: none` styling.
  // Toggled by the drag handle.
  const [isSheetExpanded, setIsSheetExpanded] = useState(true);
  const [isAcquiredModalVisible, setIsAcquiredModalVisible] = useState(false);
  const [acquireResult, setAcquireResult] = useState<AcquireCollectionItemResult | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();

  const [spotDetail, setSpotDetail] = useState<SpotDetail | null>(null);
  const [geoState, setGeoState] = useState<GeoState>("searching");
  const [timeslip, setTimeslip] = useState<SpotTimeslip | null>(null);
  // Which locale `timeslip` was fetched (or cache-hit) for — lets the header
  // fall back to the always-fresh getLocalizedSpotName while a locale-switch
  // refetch is still in flight, instead of showing timeslip.spotName from
  // the previous language.
  const [timeslipLocale, setTimeslipLocale] = useState<Locale | null>(null);
  const [localeRefreshFailed, setLocaleRefreshFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [activeAudioGuide, setActiveAudioGuide] = useState<StoryAudioGuide | null>(null);
  const [isCollectionItemAcquired, setIsCollectionItemAcquired] = useState(false);
  // Same fading black hint pill as person-camera's "take a photo with the
  // figure!" — shown briefly on entry, then fades out so it's not in the way.
  const matchHintOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(matchHintOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    }, 2800);
    return () => clearTimeout(timer);
  }, [matchHintOpacity]);

  // Keyed by `${spotId}:${month}:${locale}` so a SEARCHING→READY round-trip,
  // or switching back to a previously-viewed language, reuses the cached
  // response instead of re-hitting the API (content doesn't change within
  // the same month+language — see integration spec). A map (not a single
  // slot) so cache entries for earlier languages survive a locale switch.
  const timeslipCacheRef = useRef<Map<string, SpotTimeslip | null>>(new Map());

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (locationPermission?.status === Location.PermissionStatus.UNDETERMINED) {
      requestLocationPermission();
    }
  }, [locationPermission?.status, requestLocationPermission]);

  useEffect(() => {
    if (spotId === null) return;
    let isActive = true;
    getSpotDetail(spotId, locale)
      .then((detail) => {
        if (isActive) setSpotDetail(detail);
      })
      .catch((error) => console.error("[ar-camera] spot detail lookup failed", error));
    return () => {
      isActive = false;
    };
  }, [spotId, locale]);

  useEffect(() => {
    if (!locationPermission?.granted) return;

    if (AR_TIMESLIP_TEST_BYPASS_RADIUS_CHECK) {
      if (spotDetail !== null) {
        setGeoState((prev) => (prev === "searching" ? "loading" : prev));
      }
      return;
    }

    let isActive = true;
    let subscription: Location.LocationSubscription | null = null;

    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: LOCATION_POLL_INTERVAL_MS, distanceInterval: 5 },
      (location) => {
        if (!isActive || spotDetail === null) return;
        const distance = distanceMeters(
          location.coords.latitude,
          location.coords.longitude,
          spotDetail.latitude,
          spotDetail.longitude,
        );
        setGeoState((prev) => {
          if (prev === "searching" && distance <= AR_TIMESLIP_ENTER_RADIUS_METERS) return "loading";
          if ((prev === "ready" || prev === "empty") && distance > AR_TIMESLIP_EXIT_RADIUS_METERS) return "searching";
          return prev;
        });
      },
    ).then((sub) => {
      if (isActive) subscription = sub;
      else sub.remove();
    });

    return () => {
      isActive = false;
      subscription?.remove();
    };
  }, [locationPermission?.granted, spotDetail]);

  // Fires on the SEARCHING→READY transition, and again whenever the locale
  // changes while already READY, so the whole payload (spot name, item name,
  // guide text, audio guide) stays in sync with the selected language —
  // never on the repeated position callbacks above.
  useEffect(() => {
    if (spotId === null || (geoState !== "loading" && geoState !== "ready")) return;
    let isActive = true;
    const month = new Date().getMonth() + 1;
    const cacheKey = `${spotId}:${month}:${locale}`;

    if (timeslipCacheRef.current.has(cacheKey)) {
      const cached = timeslipCacheRef.current.get(cacheKey) ?? null;
      setTimeslip(cached);
      setTimeslipLocale(locale);
      setLocaleRefreshFailed(false);
      setGeoState(cached ? "ready" : "empty");
      return;
    }

    const wasAlreadyReady = geoState === "ready";

    getSpotTimeslip(spotId, { month, language: locale })
      .then((data) => {
        if (!isActive) return;
        timeslipCacheRef.current.set(cacheKey, data);
        setTimeslip(data);
        setTimeslipLocale(locale);
        setLocaleRefreshFailed(false);
        setGeoState(data ? "ready" : "empty");
      })
      .catch((error) => {
        console.error("[ar-camera] timeslip lookup failed", error);
        if (!isActive) return;
        // A background refresh triggered by a locale switch (already READY)
        // should leave the currently-displayed content and audio playback
        // alone on failure — only a fresh SEARCHING→READY load has no prior
        // content to fall back to. Flag the mismatch so the UI can offer a
        // retry instead of silently mixing the new locale's static labels
        // with the old locale's still-showing content.
        if (!wasAlreadyReady) {
          setGeoState("searching");
          return;
        }
        setLocaleRefreshFailed(true);
      });

    return () => {
      isActive = false;
    };
  }, [geoState, spotId, locale, retryToken]);

  useEffect(() => {
    if (geoState !== "ready" || !timeslip) {
      setActiveAudioGuide(null);
      return;
    }
    setActiveAudioGuide(timeslip.audioGuide);
    setIsCollectionItemAcquired(timeslip.collectionItem.isAcquired);
  }, [geoState, timeslip]);

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

  const handleRetryLocaleRefresh = () => {
    setLocaleRefreshFailed(false);
    setRetryToken((n) => n + 1);
  };

  const handleAudioFinished = useCallback(() => {
    if (!timeslip || isCollectionItemAcquired) return;
    const itemId = timeslip.collectionItem.collectionItemId;

    acquireCollectionItem(itemId)
      .then((result) => {
        // null means 409 (already acquired) — ignored silently per spec.
        setIsCollectionItemAcquired(true);
        // Patch the just-fetched timeslip and every cached locale's entry
        // for this item so switching languages afterwards doesn't resurrect
        // the pre-acquisition "not acquired" state from a stale cache hit.
        setTimeslip((prev) =>
          prev ? { ...prev, collectionItem: { ...prev.collectionItem, isAcquired: true } } : prev,
        );
        for (const [key, cached] of timeslipCacheRef.current) {
          if (cached && cached.collectionItem.collectionItemId === itemId) {
            timeslipCacheRef.current.set(key, {
              ...cached,
              collectionItem: { ...cached.collectionItem, isAcquired: true },
            });
          }
        }
        if (result) {
          setAcquireResult(result);
          setIsAcquiredModalVisible(true);
        }
      })
      .catch((error) => {
        console.error("[ar-camera] acquire failed", error);
      });
  }, [timeslip, isCollectionItemAcquired]);

  // timeslip?.spotName is only trusted when timeslipLocale matches the
  // current locale (i.e. it was fetched/cache-hit for this exact language);
  // otherwise a locale-switch refetch is still in flight and this falls
  // back to the always-fresh getLocalizedSpotName so the header updates the
  // instant locale changes instead of lagging behind.
  const localizedSpotTitle =
    (timeslipLocale === locale ? timeslip?.spotName : null) ??
    (spotDetail ? getLocalizedSpotName(spotDetail, locale) : null) ??
    timeslip?.spotName ??
    spotTitle ??
    mapT.pins[locationId];
  const locationDeniedForever = locationPermission !== null && !locationPermission.granted && !locationPermission.canAskAgain;
  const characterCardImageUrl = timeslip
    ? isCollectionItemAcquired
      ? (timeslip.collectionItem.cardImageUrl ?? timeslip.collectionItem.beforeImageUrl)
      : (timeslip.collectionItem.beforeImageUrl ?? timeslip.collectionItem.cardImageUrl)
    : null;
  const acquireImageUrl = acquireResult?.cardImageUrl ?? timeslip?.collectionItem.cardImageUrl ?? null;
  const acquireImageSource: ImageSourcePropType = acquireImageUrl
    ? { uri: acquireImageUrl }
    : require("@/assets/images/icon.png");

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
          <Text style={styles.locationTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {localizedSpotTitle}
          </Text>
        </View>
        <View style={styles.arActivePill}>
          <View style={styles.arActiveDot} />
          <Text style={styles.arActiveText}>{t.arActiveLabel}</Text>
        </View>
      </LinearGradient>

      {/* Same fading black hint pill as person-camera's guide pill, same design.
          Sits in the band the guide area reserves below (guideBoxWrapper's
          paddingTop), so it never overlaps the overlay image. */}
      <Animated.View
        style={[styles.hintPill, { top: insets.top + 52, opacity: matchHintOpacity }]}
        pointerEvents="none">
        <View style={styles.hintPillDot} />
        <Text style={styles.hintPillText}>{t.matchOverlayHintLabel}</Text>
      </Animated.View>

      {/* Guide/overlay area and sheet share one flex column so expanding the
          sheet (which grows taller) shrinks the guide area above it instead
          of the sheet covering the overlay image — both resize in the same
          layout pass toggleSheet's LayoutAnimation already animates. */}
      <View style={styles.contentColumn} pointerEvents="box-none">
        <View style={[styles.guideBoxWrapper, { paddingTop: insets.top + 108 }]} pointerEvents="none">
          {geoState === "ready" && timeslip && timeslip.overlayImageUrl ? (
            <Image
              source={{ uri: timeslip.overlayImageUrl }}
              style={styles.overlayImage}
              contentFit="cover"
            />
          ) : geoState === "ready" && timeslip ? (
            <View style={styles.guideBox}>
              <FontAwesome5 name="image" size={52} color="rgba(255,255,255,0.3)" solid />
              <View style={styles.guideCaption}>
                <Text style={styles.guideCaptionText}>{timeslip.guideText}</Text>
              </View>
            </View>
          ) : geoState === "loading" ? (
            <View style={styles.guideBox}>
              <ActivityIndicator color="rgba(255,255,255,0.85)" />
            </View>
          ) : geoState === "empty" ? (
            <View style={styles.guideBox}>
              <FontAwesome5 name="calendar-times" size={52} color="rgba(255,255,255,0.3)" solid />
              <View style={styles.guideCaption}>
                <Text style={styles.guideCaptionText}>{t.emptyStateTitle}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.guideBox}>
              <FontAwesome5 name="expand" size={60} color="rgba(255,255,255,0.3)" solid />
              <View style={styles.guideCaption}>
                <Text style={styles.guideCaptionText}>{t.searchingHintText}</Text>
              </View>
            </View>
          )}
          <Text style={styles.imageDisclosureText}>{t.aiImageDisclosure}</Text>
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

          {isSheetExpanded && localeRefreshFailed && (
            <Pressable style={styles.refreshErrorBanner} onPress={handleRetryLocaleRefresh} hitSlop={8}>
              <FontAwesome5 name="redo" size={11} color="#b8860b" solid />
              <Text style={styles.refreshErrorText}>{t.localeRefreshErrorMessage}</Text>
            </Pressable>
          )}

          {isSheetExpanded && geoState === "ready" && timeslip && (
            <View style={styles.characterCard}>
              {characterCardImageUrl ? (
                <Image
                  source={{ uri: characterCardImageUrl }}
                  style={styles.characterAvatarImage}
                  contentFit="cover"
                  contentPosition="top"
                />
              ) : (
                <View style={styles.characterAvatar}>
                  <FontAwesome5 name="user" size={26} color="#800000" solid />
                </View>
              )}
              <View style={styles.characterBody}>
                <Text style={styles.characterName}>{timeslip.collectionItem.name}</Text>
                {/* Shown on every AR camera, not only spots with an unacquired
                    item — it's the standing instruction for how to earn it. */}
                <Text style={styles.acquireHintText}>{t.acquireHintText}</Text>
                <Text style={styles.characterDescription}>{timeslip.guideText}</Text>
              </View>
            </View>
          )}

          {/* Always rendered (never inside the isSheetExpanded block) so
              AudioGuideButton (and the useAudioPlayer it owns) never
              unmounts when the sheet is collapsed — audio keeps playing.
              Hidden via `display: none` rather than unmounted when
              collapsed, so only "타임슬립카메라" stays visible while the
              player keeps running underneath. */}
          {geoState === "ready" && activeAudioGuide && (
            <View style={[styles.audioRow, !isSheetExpanded && styles.audioRowCollapsed]}>
              <AudioGuideButton
                key={activeAudioGuide.filePath}
                guide={activeAudioGuide}
                onFinished={handleAudioFinished}
              />
              <View style={styles.audioTextColumn}>
                <Text style={styles.audioLabel}>{t.audioGuideLabel}</Text>
                <Text style={styles.audioTitle}>{activeAudioGuide.title}</Text>
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
                  <LanguageLegendModal currentLocale={locale} onSelect={handleSelectLocale} direction="up" />
                </View>
              )}
            </View>
          )}

          {isSheetExpanded && (
            <>
              {geoState === "loading" && (
                <View style={styles.stateRow}>
                  <ActivityIndicator color="#800000" />
                  <Text style={styles.stateText}>{t.loadingText}</Text>
                </View>
              )}

              {geoState === "empty" && (
                <View style={styles.stateRow}>
                  <Text style={styles.stateTitle}>{t.emptyStateTitle}</Text>
                  <Text style={styles.stateText}>{t.emptyStateMessage}</Text>
                </View>
              )}

              {geoState === "searching" && (
                <View style={styles.stateRow}>
                  <Text style={styles.stateText}>
                    {!locationPermission?.granted
                      ? locationDeniedForever
                        ? t.locationPermissionDeniedMessage
                        : t.locationPermissionMessage
                      : t.searchingHintText}
                  </Text>
                  {!locationPermission?.granted && (
                    <Pressable
                      style={styles.locationPermissionButton}
                      onPress={locationDeniedForever ? Linking.openSettings : requestLocationPermission}>
                      <Text style={styles.locationPermissionButtonText}>
                        {locationDeniedForever ? t.openSettingsLabel : t.grantLocationAccessLabel}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}

              <View style={styles.navIndicator} />
            </>
          )}
        </View>
      </View>

      {isAcquiredModalVisible && acquireResult && (
        <CollectibleAcquiredModal
          type={acquireResult.isCharacter ? "person" : "artifact"}
          name={acquireResult.name}
          description={collectibleAcquiredText[locale].genericAcquiredMessage}
          image={acquireImageSource}
          onClose={() => setIsAcquiredModalVisible(false)}
          onViewCollection={() => {
            setIsAcquiredModalVisible(false);
            router.push({ pathname: "/collection", params: { locationId } });
          }}
          onTakePhoto={
            acquireResult.isCharacter
              ? () => {
                  setIsAcquiredModalVisible(false);
                  router.push({
                    pathname: "/person-camera",
                    params: {
                      locationId,
                      ...(spotId !== null ? { spotId: String(spotId) } : {}),
                      ...(timeslip ? { storyId: String(timeslip.storyId) } : {}),
                      collectionItemId: String(acquireResult.collectionItemId),
                      collectionItemName: acquireResult.name,
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
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  locationTitle: {
    flexShrink: 1,
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#fff",
  },
  arActivePill: {
    flexShrink: 0,
    marginLeft: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  // Mirrors person-camera's spotPill / spotDot / spotPillText exactly.
  hintPill: {
    position: "absolute",
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
  hintPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#b8860b",
  },
  hintPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
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
  contentColumn: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  guideBoxWrapper: {
    flex: 1,
  },
  guideBox: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayImage: {
    flex: 1,
    opacity: 0.78,
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
  imageDisclosureText: {
    marginTop: 8,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sheet: {
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
  refreshErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdf6e3",
    borderWidth: 1,
    borderColor: "#f3e3b8",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshErrorText: {
    flex: 1,
    fontSize: 11.5,
    color: "#8a6d1f",
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
  // Same 64x64 box as before, but cropped from the top (contentPosition="top")
  // so a full-body figure shows its face — the legs get cut, not the head.
  characterAvatarImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
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
  acquireHintText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#b8860b",
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
  audioRowCollapsed: {
    display: "none",
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
    bottom: "100%",
    right: 0,
    marginBottom: 8,
    zIndex: 10,
  },
  stateRow: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  stateTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 14,
    color: "#1b1b1b",
    textAlign: "center",
  },
  stateText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    textAlign: "center",
  },
  locationPermissionButton: {
    backgroundColor: "#800000",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  locationPermissionButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
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
