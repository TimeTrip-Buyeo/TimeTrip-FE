import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { LangPill } from "@/components/lang-pill";
import { GUNGSEO_FONT, GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { SPOT_ID_TO_LOCATION_ID } from "@/constants/locations";
import { collectionScreenText, mapScreenText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { ApiError, toApiUrl } from "@/lib/api/client";
import {
  getCollectionItemDetail,
  getCollectionItems,
  getStoryTopics,
  type CollectionItem,
  type CollectionItemDetail,
  type StoryTopic,
} from "@/lib/api/collections";
import { getSpotAudioGuide, type StoryAudioGuide } from "@/lib/api/spots";
import { resolveLocationId, resolveNumberParam, resolveSingleParam } from "@/lib/selfie-route";

export default function CollectionScreen() {
  const params = useLocalSearchParams<{ storyId?: string; storyIds?: string; itemId?: string; title?: string }>();
  const storyId = resolveNumberParam(params.storyId);
  const storyIds = resolveStoryIdsParam(params.storyIds, storyId);
  const itemId = resolveNumberParam(params.itemId);
  const title = resolveSingleParam(params.title);

  if (itemId !== null) return <CollectionDetail itemId={itemId} />;
  if (storyIds.length > 0) return <CollectionItemGrid storyIds={storyIds} title={title} />;
  return <CollectionTopicList />;
}

function resolveStoryIdsParam(rawStoryIds: string | string[] | undefined, fallbackStoryId: number | null) {
  const storyIds = resolveSingleParam(rawStoryIds)
    ?.split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (storyIds?.length) return [...new Set(storyIds)];
  return fallbackStoryId !== null ? [fallbackStoryId] : [];
}

function hasAcquiredCollection(topic: StoryTopic) {
  return topic.acquiredCollectionCount > 0;
}

function dedupeStoryTopics(topics: StoryTopic[]) {
  const seenStoryIds = new Set<string>();
  return topics.filter((topic) => {
    const storyIdKey = topic.storyIds.join(",");
    if (seenStoryIds.has(storyIdKey)) return false;
    seenStoryIds.add(storyIdKey);
    return true;
  });
}

function dedupeCollectionItems(items: CollectionItem[]) {
  const seenItemIds = new Set<number>();
  return items.filter((item) => {
    if (seenItemIds.has(item.collectionItemId)) return false;
    seenItemIds.add(item.collectionItemId);
    return true;
  });
}

function hasImageUrl(imageUrl: string | null | undefined): imageUrl is string {
  return typeof imageUrl === "string" && imageUrl.trim().length > 0;
}

function firstImageUrl(...imageUrls: (string | null | undefined)[]) {
  return imageUrls.find(hasImageUrl);
}

function firstText(...values: (string | null | undefined)[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function getCollectionImageDisclosure(detail: CollectionItemDetail, t: (typeof collectionScreenText)[Locale]) {
  if (detail.isCharacter) return t.aiImageDisclosure;

  const institution = firstText(
    detail.sourceInstitution,
    detail.sourceAgency,
    detail.institutionName,
    detail.museumName,
  );
  const site = firstText(detail.sourceSite, detail.sourceSiteName, detail.siteName, detail.sourceName);
  const sourceParts = [institution, site].filter(Boolean);

  if (sourceParts.length > 0) return `${t.sourceDisclosurePrefix}${sourceParts.join(", ")}`;

  const sourceCredit = firstText(detail.sourceCredit);
  return sourceCredit ? `${t.sourceDisclosurePrefix}${sourceCredit}` : null;
}

function CollectionDetailInfoRow({
  accentColor,
  label,
  value,
}: {
  accentColor: string;
  label?: string;
  value: string;
}) {
  return (
    <View style={styles.cardInfoRow}>
      <View style={[styles.cardInfoBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardInfoTextColumn}>
        {label ? <Text style={styles.cardInfoLabel}>{label}</Text> : null}
        <Text style={styles.cardInfoValue}>{value}</Text>
      </View>
    </View>
  );
}

function formatAudioTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function AudioGuideModal({
  audioFile,
  title,
  isVisible,
  onClose,
  t,
}: {
  audioFile: StoryAudioGuide | null;
  title: string;
  isVisible: boolean;
  onClose: () => void;
  t: (typeof collectionScreenText)[Locale];
}) {
  const player = useAudioPlayer(audioFile ? toApiUrl(audioFile.filePath) : null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || audioFile?.durationSec || 0;
  const currentTime = Math.min(status.currentTime || 0, duration || status.currentTime || 0);
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  useEffect(() => {
    if (!isVisible) {
      player.pause();
      player.seekTo(0).catch(() => undefined);
    }
  }, [isVisible, player]);

  const handleTogglePlay = () => {
    if (!audioFile) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && currentTime >= duration) {
      player.seekTo(0).catch(() => undefined);
    }
    player.play();
  };

  const handleClose = () => {
    player.pause();
    player.seekTo(0).catch(() => undefined);
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.audioModalBackdrop}>
        <View style={styles.audioModalSheet}>
          <Pressable style={styles.audioModalCloseButton} onPress={handleClose} hitSlop={8}>
            <FontAwesome5 name="times" size={16} color="#1b1b1b" solid />
          </Pressable>
          <Text style={styles.audioModalEyebrow}>{t.audioGuideModalTitle}</Text>
          <Text style={styles.audioModalTitle}>{title}</Text>

          {audioFile ? (
            <>
              <View style={styles.audioProgressTrack}>
                <View style={[styles.audioProgressFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.audioTimeRow}>
                <Text style={styles.audioTimeText}>{formatAudioTime(currentTime)}</Text>
                <Text style={styles.audioTimeText}>{formatAudioTime(duration)}</Text>
              </View>
              <Pressable style={styles.audioPlayButton} onPress={handleTogglePlay}>
                <FontAwesome5 name={status.playing ? "pause" : "play"} size={16} color="#fff" solid />
                <Text style={styles.audioPlayButtonText}>
                  {status.playing ? t.audioGuidePauseLabel : t.audioGuidePlayLabel}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.audioUnavailableText}>{t.audioGuideUnavailableMessage}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

function CollectionTopicList() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const mapT = mapScreenText[locale];
  const t = collectionScreenText[locale];
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [topics, setTopics] = useState<StoryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError(false);
    getStoryTopics({ locale, storyType: "special" })
      .then((nextTopics) => {
        if (__DEV__) {
          console.log(
            "[collection] topics",
            nextTopics.map((topic) => ({
              storyIds: topic.storyIds,
              title: topic.title,
              total: topic.totalCollectionCount,
              acquired: topic.acquiredCollectionCount,
              thumbnailUrl: topic.thumbnailUrl,
            })),
          );
        }
        if (isActive) setTopics(dedupeStoryTopics(nextTopics.filter(hasAcquiredCollection)));
      })
      .catch((error) => {
        console.error("[collection] topics failed", error);
        if (isActive) {
          setTopics([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [locale]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.listScrollContent}>
        <View style={[styles.listHeader, { paddingTop: insets.top + 16 }]}>
          <View style={styles.listHeaderLeft}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
            </Pressable>
            <Text style={styles.listTitle}>{t.listTitle}</Text>
          </View>
          <LangPill
            locale={locale}
            isLegendVisible={isLegendVisible}
            onToggleLegend={() => setIsLegendVisible((visible) => !visible)}
            onSelectLocale={handleSelectLocale}
          />
        </View>
        <Text style={styles.listSubtitle}>{t.listSubtitle}</Text>

        <View style={styles.list}>
          {isLoading ? (
            <StatusMessage message={t.loadingMessage} />
          ) : loadError ? (
            <StatusMessage message={t.loadErrorMessage} />
          ) : topics.length === 0 ? (
            <StatusMessage message={t.emptyTopicMessage} />
          ) : (
            topics.map((topic) => (
              <Pressable
                key={`collection-topic-${topic.storyIds.join("-")}`}
                style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
                onPress={() =>
                  router.push({
                    pathname: "/collection",
                    params: {
                      storyId: String(topic.storyIds[0]),
                      storyIds: topic.storyIds.join(","),
                      title: topic.title,
                    },
                  })
                }>
                {hasImageUrl(topic.thumbnailUrl) ? (
                  <Image
                    source={{ uri: toApiUrl(topic.thumbnailUrl) }}
                    style={styles.listItemThumb}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.listItemThumb} />
                )}
                <View style={styles.listItemTextColumn}>
                  <Text style={styles.listItemTitle}>{topic.title}</Text>
                  <Text style={styles.listItemProgress}>
                    {topic.acquiredCollectionCount}/{topic.totalCollectionCount}
                  </Text>
                </View>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" solid />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <BottomNav
        active="collection"
        labels={mapT.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "map") router.push("/(tabs)");
          if (key === "album") router.push("/album");
          if (key === "myPage") router.push("/my-page");
        }}
      />
    </View>
  );
}

function CollectionItemGrid({ storyIds, title }: { storyIds: number[]; title?: string }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const mapT = mapScreenText[locale];
  const t = collectionScreenText[locale];
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError(false);
    Promise.allSettled(storyIds.map((storyId) => getCollectionItems(storyId, { locale })))
      .then((results) => {
        const fulfilledResults = results.filter((result): result is PromiseFulfilledResult<{ items: CollectionItem[] }> =>
          result.status === "fulfilled",
        );
        const nextItems = dedupeCollectionItems(fulfilledResults.flatMap((result) => result.value.items));

        if (__DEV__) {
          console.log(
            "[collection] items",
            nextItems.map((item) => ({
              collectionItemId: item.collectionItemId,
              storyId: item.storyId,
              spotId: item.spotId,
              name: item.name,
              type: item.type,
              isAcquired: item.isAcquired,
              cardImageUrl: item.cardImageUrl,
              beforeImageUrl: item.beforeImageUrl,
            })),
          );
        }

        if (!fulfilledResults.length) {
          throw results.find((result) => result.status === "rejected")?.reason ?? new Error("Collection items failed");
        }

        if (isActive) setItems(nextItems);
      })
      .catch((error) => {
        console.error("[collection] items failed", error);
        if (isActive) {
          setItems([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [locale, storyIds]);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.gridScrollContent}>
        <View style={[styles.gridHeader, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
          </Pressable>
          <Text style={styles.gridTitle}>{title ?? t.listTitle}</Text>
        </View>

        <View style={styles.grid}>
          {isLoading ? (
            <StatusMessage message={t.loadingMessage} />
          ) : loadError ? (
            <StatusMessage message={t.loadErrorMessage} />
          ) : items.length === 0 ? (
            <StatusMessage message={t.emptyItemMessage} />
          ) : (
            items.map((item) => {
              const locationId = SPOT_ID_TO_LOCATION_ID[item.spotId];
              const locationLabel = locationId ? mapT.pins[locationId] : item.spotName ?? "";
              const imageUrl = item.isAcquired ? item.cardImageUrl : item.beforeImageUrl;
              const cardContent = (
                <>
                  <View style={styles.gridCardImageWrapper}>
                    {hasImageUrl(imageUrl) ? (
                      <Image source={{ uri: toApiUrl(imageUrl) }} style={styles.gridCardImage} resizeMode="contain" />
                    ) : (
                      <View style={styles.gridCardImageLocked}>
                        <Text style={styles.gridCardQuestionMark}>?</Text>
                      </View>
                    )}
                    {item.isAcquired ? (
                      <View style={styles.gridCardBadge}>
                        <FontAwesome5 name="check" size={9} color="#fff" solid />
                      </View>
                    ) : (
                      <View style={styles.gridCardLockBadge}>
                        <FontAwesome5 name="lock" size={9} color="#fff" solid />
                      </View>
                    )}
                  </View>
                  <Text style={item.isAcquired ? styles.gridCardName : styles.gridCardNameLocked}>
                    {item.isAcquired ? item.name : "?"}
                  </Text>
                  <Text style={item.isAcquired ? styles.gridCardLocation : styles.gridCardLocationLocked}>
                    {item.isAcquired ? locationLabel : t.lockedItemMessage}
                  </Text>
                </>
              );

              if (!item.isAcquired) {
                return (
                  <View key={item.collectionItemId} style={styles.gridCard}>
                    {cardContent}
                  </View>
                );
              }

              return (
                <Pressable
                  key={item.collectionItemId}
                  style={({ pressed }) => [styles.gridCard, pressed && styles.listItemPressed]}
                  onPress={() =>
                    router.push({
                      pathname: "/collection",
                      params: { itemId: String(item.collectionItemId) },
                    })
                  }>
                  {cardContent}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      <BottomNav
        active="collection"
        labels={mapT.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "map") router.push("/(tabs)");
          if (key === "album") router.push("/album");
          if (key === "myPage") router.push("/my-page");
        }}
      />
    </View>
  );
}

const MIN_HERO_HEIGHT = 320;
const FALLBACK_HERO_HEIGHT = 420;
const MAX_HERO_HEIGHT_RATIO = 0.52;
const COLLAPSED_HERO_HEIGHT_RATIO = 0.78;

function CollectionDetail({ itemId }: { itemId: number }) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { locale } = useLanguage();

  const t = collectionScreenText[locale];
  const mapT = mapScreenText[locale];
  const [detail, setDetail] = useState<CollectionItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDetailCardExpanded, setIsDetailCardExpanded] = useState(true);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [isAudioGuideVisible, setIsAudioGuideVisible] = useState(false);
  const [audioFile, setAudioFile] = useState<StoryAudioGuide | null>(null);
  const audioGuideSpotId = detail?.spotId ?? null;

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setLoadError(false);
    getCollectionItemDetail(itemId, { locale })
      .then((nextDetail) => {
        if (isActive) setDetail(nextDetail);
      })
      .catch((error) => {
        console.error("[collection] item detail failed", error);
        const isLockedItem = error instanceof ApiError && error.code === "COLLECTION4031";
        if (isActive) {
          setDetail(null);
          setLoadError(!isLockedItem);
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [itemId, locale]);

  useEffect(() => {
    if (audioGuideSpotId === null) {
      setAudioFile(null);
      return;
    }

    let isActive = true;
    setAudioFile(null);
    getSpotAudioGuide(audioGuideSpotId, { language: locale })
      .then((nextAudioFile) => {
        if (isActive) setAudioFile(nextAudioFile);
      })
      .catch((error) => {
        console.error("[collection] spot audio guide failed", error);
        if (isActive) setAudioFile(null);
      });

    return () => {
      isActive = false;
    };
  }, [audioGuideSpotId, locale]);

  const locationId = detail ? SPOT_ID_TO_LOCATION_ID[detail.spotId] : undefined;
  const cameraLocationId = detail ? resolveLocationId(undefined, String(detail.spotId)) : undefined;
  const locationLabel = locationId ? mapT.pins[locationId] : detail?.spotName;
  const imageUrl = firstImageUrl(detail?.detailImageUrl, detail?.cardImageUrl);
  const sourceDisclosure = detail ? getCollectionImageDisclosure(detail, t) : null;
  const imageDisclosure = detail?.isCharacter ? sourceDisclosure : null;
  const cardSourceDisclosure = detail && !detail.isCharacter ? sourceDisclosure : null;
  const summary = firstText(detail?.shortDescription, detail?.summary, detail?.description);
  const locationText = firstText(detail?.location, locationLabel);
  const periodText = firstText(detail?.period);
  const mainFeatureText = firstText(detail?.mainFeature, detail?.description);
  const characterShortDescription = detail?.isCharacter ? firstText(detail.shortDescription, detail.summary) : null;
  const rawHeroHeight = imageAspectRatio ? windowWidth / imageAspectRatio : FALLBACK_HERO_HEIGHT;
  const maxHeroHeight = windowHeight * MAX_HERO_HEIGHT_RATIO;
  const imageFrameHeight = Math.min(Math.max(rawHeroHeight, MIN_HERO_HEIGHT), maxHeroHeight);
  const collapsedHeroHeight = windowHeight * COLLAPSED_HERO_HEIGHT_RATIO;
  const heroHeight = isDetailCardExpanded ? imageFrameHeight : collapsedHeroHeight;
  const imageCenterOffset = isDetailCardExpanded ? 0 : Math.max(0, (collapsedHeroHeight - imageFrameHeight) / 2);

  useEffect(() => {
    if (!hasImageUrl(imageUrl)) {
      setImageAspectRatio(null);
      return;
    }

    let isActive = true;
    Image.getSize(
      toApiUrl(imageUrl),
      (width, height) => {
        if (isActive && width > 0 && height > 0) setImageAspectRatio(width / height);
      },
      () => {
        if (isActive) setImageAspectRatio(null);
      },
    );

    return () => {
      isActive = false;
    };
  }, [imageUrl]);

  const toggleDetailCard = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDetailCardExpanded((expanded) => !expanded);
  };

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <FontAwesome5 name="chevron-left" size={18} color={detail ? "#fff" : "#1b1b1b"} solid />
      </Pressable>
    </View>
  );

  if (isLoading || !detail) {
    const statusIcon = isLoading ? "spinner" : loadError ? "exclamation-circle" : "lock";
    const statusTitle = isLoading ? t.loadingMessage : loadError ? t.loadErrorMessage : t.lockedItemMessage;
    const statusMessage = isLoading ? t.loadingMessage : loadError ? t.loadErrorMessage : t.detailUnavailableMessage;

    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.comingSoonWrapper}>
          <View style={styles.comingSoonIcon}>
            <FontAwesome5 name={statusIcon} size={22} color="#b8860b" solid />
          </View>
          <Text style={styles.comingSoonTitle}>{statusTitle}</Text>
          <Text style={styles.comingSoonMessage}>{statusMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <View style={[styles.heroFrame, { height: heroHeight }]}>
          <View style={[styles.heroImageFrame, { height: imageFrameHeight, transform: [{ translateY: imageCenterOffset }] }]}>
            {hasImageUrl(imageUrl) ? (
              <Image source={{ uri: toApiUrl(imageUrl) }} style={styles.artifactHeroImage} resizeMode="contain" />
            ) : (
              <LinearGradient colors={["#1b1b1b", "#7a7a7a", "#a3a1a0"]} style={StyleSheet.absoluteFill} />
            )}
          </View>
          {imageDisclosure && <Text style={styles.detailImageDisclosureText}>{imageDisclosure}</Text>}
        </View>

        <View style={[styles.card, !isDetailCardExpanded && styles.cardCollapsed]}>
          <Pressable style={styles.cardDragHandle} onPress={toggleDetailCard} hitSlop={8}>
            <View style={[styles.cardDragHandleIcon, !isDetailCardExpanded && styles.cardDragHandleIconCollapsed]}>
              <FontAwesome5
                name="chevron-left"
                size={14}
                color="#1b1b1b"
                solid
                style={{ transform: [{ rotate: "-90deg" }] }}
              />
            </View>
          </Pressable>
          <Text style={styles.cardTitle}>{detail.name}</Text>

          {isDetailCardExpanded ? (
            <>
              {detail.isCharacter
                ? characterShortDescription && (
                    <CollectionDetailInfoRow accentColor="#b8860b" value={characterShortDescription} />
                  )
                : locationText && (
                    <CollectionDetailInfoRow accentColor="#b8860b" label={t.locationLabel} value={locationText} />
                  )}
              {periodText && (
                <CollectionDetailInfoRow
                  accentColor="#800000"
                  label={detail.isCharacter ? t.lifespanLabel : t.productionPeriodLabel}
                  value={periodText}
                />
              )}
              {mainFeatureText && (
                <CollectionDetailInfoRow accentColor="#1b1b1b" label={t.keyFeaturesLabel} value={mainFeatureText} />
              )}
              {cardSourceDisclosure && <Text style={styles.cardSourceText}>{cardSourceDisclosure}</Text>}
            </>
          ) : summary ? (
            <Text style={styles.cardSummary} numberOfLines={1} ellipsizeMode="tail">
              {summary}
            </Text>
          ) : null}
        </View>

        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.primaryButton} onPress={() => setIsAudioGuideVisible(true)}>
            <FontAwesome5 name="headphones" size={16} color="#fff" solid />
            <Text style={styles.primaryButtonText}>{t.listenToAudioGuide}</Text>
          </Pressable>
          {detail.isCharacter && cameraLocationId && (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/person-camera",
                  params: {
                    locationId: cameraLocationId,
                    spotId: String(detail.spotId),
                    storyId: String(detail.storyId),
                    collectionItemId: String(detail.collectionItemId),
                  },
                })
              }>
              <FontAwesome5 name="camera" size={16} color="#fff" solid />
              <Text style={styles.primaryButtonText}>{t.takePhotoWithFigure}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {topBar}
      <AudioGuideModal
        audioFile={audioFile}
        title={detail.name}
        isVisible={isAudioGuideVisible}
        onClose={() => setIsAudioGuideVisible(false)}
        t={t}
      />
    </View>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <View style={styles.statusMessage}>
      <Text style={styles.statusMessageText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  listScroll: {
    flex: 1,
  },
  listScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  listHeader: {
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  listTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#1b1b1b",
  },
  listSubtitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 12,
    color: "#9ca3af",
    paddingHorizontal: 32,
    paddingTop: 12,
  },
  list: {
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  listItem: {
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
  listItemPressed: {
    opacity: 0.7,
  },
  listItemThumb: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#f8f6f0",
  },
  listItemTextColumn: {
    flex: 1,
    gap: 6,
  },
  listItemTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 15,
    color: "#1b1b1b",
  },
  listItemProgress: {
    fontSize: 12,
    fontWeight: "700",
    color: "#b8860b",
  },
  gridScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  gridTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 20,
    color: "#1b1b1b",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingHorizontal: 24,
  },
  statusMessage: {
    width: "100%",
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  statusMessageText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#9ca3af",
    textAlign: "center",
  },
  gridCard: {
    width: "46%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 12,
    padding: 13,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  gridCardImageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#f8f6f0",
    overflow: "hidden",
  },
  gridCardImage: {
    width: "100%",
    height: "100%",
  },
  gridCardImageLocked: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardQuestionMark: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9ca3af",
  },
  gridCardBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#b8860b",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardLockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#9ca3af",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardName: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 12,
    color: "#1b1b1b",
    marginTop: 4,
  },
  gridCardLocation: {
    fontSize: 8,
    color: "#9ca3af",
  },
  gridCardNameLocked: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  gridCardLocationLocked: {
    fontSize: 8,
    color: "#d1d5db",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 2,
  },
  backButton: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  detailScrollContent: {
    flexGrow: 1,
  },
  // Keep collection artwork fully visible even when the source image ratio
  // differs from the device frame.
  heroFrame: {
    backgroundColor: "#f8f6f0",
    overflow: "hidden",
  },
  heroImageFrame: {
    width: "100%",
  },
  artifactHeroImage: {
    width: "100%",
    height: "100%",
  },
  detailImageDisclosureText: {
    position: "absolute",
    right: 24,
    bottom: 48,
    zIndex: 2,
    fontSize: 9,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  card: {
    marginTop: 0,
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    borderRadius: 24,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 6,
  },
  cardCollapsed: {
    marginTop: -84,
    paddingTop: 18,
    paddingBottom: 18,
  },
  cardDragHandle: {
    alignSelf: "center",
    marginTop: -18,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  cardDragHandleIcon: {
    transform: [{ rotate: "0deg" }],
  },
  cardDragHandleIconCollapsed: {
    transform: [{ rotate: "180deg" }],
  },
  cardTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#1b1b1b",
    marginBottom: 20,
  },
  cardSummary: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
  },
  cardInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  cardInfoBar: {
    width: 1.6,
    height: 32,
    marginTop: 4,
  },
  cardInfoTextColumn: {
    flex: 1,
  },
  cardInfoLabel: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 10,
    color: "#9ca3af",
    marginBottom: 4,
  },
  cardInfoValue: {
    flex: 1,
    fontFamily: GUNGSEO_FONT,
    fontSize: 14,
    lineHeight: 22.75,
    color: "#4b5563",
  },
  cardSourceText: {
    marginTop: 18,
    textAlign: "left",
    fontSize: 10,
    fontWeight: "600",
    color: "#9ca3af",
  },
  actionButtons: {
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    backgroundColor: "#800000",
    borderRadius: 16,
  },
  primaryButtonText: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 16,
    color: "#fff",
  },
  comingSoonWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 40,
  },
  comingSoonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fdf1cf",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  comingSoonTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  comingSoonMessage: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
  audioModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  audioModalSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  audioModalCloseButton: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioModalEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: "#b8860b",
    textAlign: "center",
    marginBottom: 8,
  },
  audioModalTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 20,
    lineHeight: 28,
    color: "#1b1b1b",
    textAlign: "center",
    marginBottom: 28,
  },
  audioProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f1f2f4",
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#800000",
  },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 20,
  },
  audioTimeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
  },
  audioPlayButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#800000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  audioPlayButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  audioUnavailableText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6b7280",
    textAlign: "center",
  },
});
