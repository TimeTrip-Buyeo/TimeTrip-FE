import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { LangPill } from "@/components/lang-pill";
import { GUNGSEO_FONT, GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { SPOT_ID_TO_LOCATION_ID } from "@/constants/locations";
import { collectionScreenText, mapScreenText, shareSuffix, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { toApiUrl } from "@/lib/api/client";
import {
  getCollectionItemDetail,
  getCollectionItems,
  getStoryTopics,
  type CollectionItem,
  type CollectionItemDetail,
  type StoryTopic,
} from "@/lib/api/collections";

export default function CollectionScreen() {
  const params = useLocalSearchParams<{ storyId?: string; itemId?: string; title?: string }>();
  const storyId = resolveNumberParam(params.storyId);
  const itemId = resolveNumberParam(params.itemId);
  const title = resolveSingleParam(params.title);

  if (itemId !== null) return <CollectionDetail itemId={itemId} />;
  if (storyId !== null) return <CollectionItemGrid storyId={storyId} title={title} />;
  return <CollectionTopicList />;
}

function resolveSingleParam(raw: string | string[] | undefined) {
  return Array.isArray(raw) ? raw[0] : raw;
}

function resolveNumberParam(raw: string | string[] | undefined) {
  const value = resolveSingleParam(raw);
  if (value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function hasAcquiredCollection(topic: StoryTopic) {
  return topic.acquiredCollectionCount > 0;
}

function CollectionTopicList() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const mapT = mapScreenText[locale];
  const t = collectionScreenText[locale];
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [topics, setTopics] = useState<StoryTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    getStoryTopics({ locale, storyType: "special" })
      .then((nextTopics) => {
        if (isActive) setTopics(nextTopics.filter(hasAcquiredCollection));
      })
      .catch((error) => {
        console.error("[collection] topics failed", error);
        if (isActive) setTopics([]);
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
          ) : topics.length === 0 ? (
            <StatusMessage message={t.emptyTopicMessage} />
          ) : (
            topics.map((topic) => (
              <Pressable
                key={topic.storyId}
                style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
                onPress={() =>
                  router.push({
                    pathname: "/collection",
                    params: { storyId: String(topic.storyId), title: topic.title },
                  })
                }>
                {topic.thumbnailUrl ? (
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

function CollectionItemGrid({ storyId, title }: { storyId: number; title?: string }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const mapT = mapScreenText[locale];
  const t = collectionScreenText[locale];
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    getCollectionItems(storyId, { locale })
      .then(({ items: nextItems }) => {
        if (isActive) setItems(nextItems);
      })
      .catch((error) => {
        console.error("[collection] items failed", error);
        if (isActive) setItems([]);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [locale, storyId]);

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
          ) : items.length === 0 ? (
            <StatusMessage message={t.emptyItemMessage} />
          ) : (
            items.map((item) => {
              const locationId = SPOT_ID_TO_LOCATION_ID[item.spotId];
              const locationLabel = locationId ? mapT.pins[locationId] : "";
              const imageUrl = item.isAcquired ? item.cardImageUrl : item.beforeImageUrl;
              const cardContent = (
                <>
                  <View style={styles.gridCardImageWrapper}>
                    {imageUrl ? (
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

const HERO_HEIGHT = 420;

function CollectionDetail({ itemId }: { itemId: number }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();

  const t = collectionScreenText[locale];
  const mapT = mapScreenText[locale];
  const [detail, setDetail] = useState<CollectionItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    getCollectionItemDetail(itemId, { locale })
      .then((nextDetail) => {
        if (isActive) setDetail(nextDetail);
      })
      .catch((error) => {
        console.error("[collection] item detail failed", error);
        if (isActive) setDetail(null);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [itemId, locale]);

  const locationId = detail ? SPOT_ID_TO_LOCATION_ID[detail.spotId] : undefined;
  const locationLabel = locationId ? mapT.pins[locationId] : detail?.spotName;
  const imageUrl = detail?.detailImageUrl ?? detail?.cardImageUrl;

  const handleShare = () => {
    if (!detail) return;
    Share.share({
      message: `${detail.name} · ${locationLabel ?? ""} ${shareSuffix[locale]}`,
    });
  };

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <FontAwesome5 name="chevron-left" size={18} color={detail ? "#fff" : "#1b1b1b"} solid />
      </Pressable>
      {detail && (
        <View style={styles.topBarActions}>
          <Pressable style={styles.topBarActionButton} hitSlop={4} onPress={handleShare}>
            <FontAwesome5 name="share-alt" size={14} color="#fff" solid />
          </Pressable>
          <Pressable style={styles.topBarActionButton} hitSlop={4}>
            <FontAwesome5 name="download" size={14} color="#fff" solid />
          </Pressable>
        </View>
      )}
    </View>
  );

  if (isLoading || !detail) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.comingSoonWrapper}>
          <View style={styles.comingSoonIcon}>
            <FontAwesome5 name={isLoading ? "spinner" : "lock"} size={22} color="#b8860b" solid />
          </View>
          <Text style={styles.comingSoonTitle}>{isLoading ? t.loadingMessage : t.lockedItemMessage}</Text>
          <Text style={styles.comingSoonMessage}>{isLoading ? t.loadingMessage : t.detailUnavailableMessage}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <View style={styles.heroFrame}>
          {imageUrl ? (
            <Image source={{ uri: toApiUrl(imageUrl) }} style={styles.artifactHeroImage} resizeMode="contain" />
          ) : (
            <LinearGradient colors={["#1b1b1b", "#7a7a7a", "#a3a1a0"]} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient colors={["rgba(253,252,248,0)", "#fdfcf8"]} style={styles.heroFade} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{detail.name}</Text>

          <View style={styles.cardRow}>
            <View style={[styles.cardRowBar, { backgroundColor: "#b8860b" }]} />
            <Text style={styles.cardPrimaryValue}>{locationLabel}</Text>
          </View>

          <View style={styles.cardRow}>
            <View style={[styles.cardRowBar, { backgroundColor: "#800000" }]} />
            <View>
              <Text style={styles.cardFieldLabel}>{detail.isCharacter ? t.personTypeLabel : t.artifactTypeLabel}</Text>
              <Text style={styles.cardSecondaryValue}>{detail.sourceCredit ?? detail.type}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardDivider} />
            <View style={styles.cardDescriptionColumn}>
              <Text style={styles.cardFieldLabel}>{t.keyFeaturesLabel}</Text>
              <Text style={styles.cardDescription}>{detail.description}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              router.push({
                pathname: "/ar-camera",
                params: {
                  ...(locationId ? { locationId } : {}),
                  spotId: String(detail.spotId),
                  storyId: String(detail.storyId),
                  spotName: detail.spotName,
                },
              })
            }>
            <FontAwesome5 name="headphones" size={16} color="#fff" solid />
            <Text style={styles.primaryButtonText}>{t.listenToAudioGuide}</Text>
          </Pressable>
          {detail.isCharacter && locationId && (
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push({
                  pathname: "/person-camera",
                  params: {
                    locationId,
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
  listItemLocked: {
    backgroundColor: "#fafaf9",
    borderColor: "#f5f5f4",
    opacity: 0.6,
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
  listItemThumbLocked: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#e7e5e4",
    alignItems: "center",
    justifyContent: "center",
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
  listItemTitleLocked: {
    flex: 1,
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 15,
    color: "#9ca3af",
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
  topBarActions: {
    flexDirection: "row",
    gap: 8,
  },
  topBarActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailScrollContent: {
    flexGrow: 1,
  },
  // Keep collection artwork fully visible even when the source image ratio
  // differs from the device frame.
  heroFrame: {
    height: HERO_HEIGHT,
    backgroundColor: "#f8f6f0",
    overflow: "hidden",
  },
  personHeroImage: {
    width: "100%",
    height: "100%",
  },
  artifactHeroImage: {
    width: "100%",
    height: "100%",
  },
  heroFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
  },
  card: {
    marginTop: -40,
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
  cardTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 24,
    color: "#1b1b1b",
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 20,
  },
  cardRowBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginTop: 4,
  },
  cardDivider: {
    width: 1.6,
    height: 32,
    backgroundColor: "#1b1b1b",
    marginTop: 4,
  },
  cardPrimaryValue: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 14,
    color: "#000",
    marginTop: 4,
  },
  cardFieldLabel: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 10,
    color: "#9ca3af",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardSecondaryValue: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 14,
    color: "#000",
  },
  cardDescriptionColumn: {
    flex: 1,
  },
  cardDescription: {
    fontFamily: GUNGSEO_FONT,
    fontSize: 14,
    lineHeight: 22.75,
    color: "#4b5563",
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
  primaryButtonDisabled: {
    opacity: 0.5,
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
});
