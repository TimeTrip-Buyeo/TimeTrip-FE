import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { LangPill } from "@/components/lang-pill";
import { COLLECTIBLES } from "@/constants/collectibles";
import { GUNGSEO_FONT, GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { LOCATION_ID_TO_SPOT_ID, type LocationId } from "@/constants/locations";
import { COLLECTION_THEMES, type CollectionTheme } from "@/constants/themes";
import { collectionScreenText, mapScreenText, shareSuffix, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { getCollectionItems, getStoryTopics } from "@/lib/api/collections";

function themeTitle(theme: CollectionTheme, locale: Locale) {
  return typeof theme.title === "string" ? theme.title : theme.title[locale];
}

// Three levels, matching Figma exactly: 도감 (theme list, node 0:1148) →
// Screen 4: 컬렉션 (theme grid, node 0:901) → 컬렉션(인물/유물) (item detail,
// node 0:851 / 0:788).
export default function CollectionScreen() {
  const params = useLocalSearchParams<{ locationId?: string; themeId?: string }>();
  const locationId = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;
  const themeId = Array.isArray(params.themeId) ? params.themeId[0] : params.themeId;

  if (locationId) return <CollectionDetail locationId={locationId as LocationId} />;
  if (themeId) return <CollectionThemeGrid themeId={themeId} />;
  return <CollectionThemeList />;
}

function CollectionThemeList() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const mapT = mapScreenText[locale];
  const t = collectionScreenText[locale];
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLegendVisible(false);
  };

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
          {COLLECTION_THEMES.map((theme) => {
            if (theme.locked) {
              return (
                <View key={theme.id} style={[styles.listItem, styles.listItemLocked]}>
                  <View style={styles.listItemThumbLocked}>
                    <FontAwesome5 name="lock" size={18} color="#a8a29e" solid />
                  </View>
                  <Text style={styles.listItemTitleLocked}>?</Text>
                  <FontAwesome5 name="lock" size={12} color="#d6d3d1" solid />
                </View>
              );
            }
            return (
              <Pressable
                key={theme.id}
                style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
                onPress={() => router.push({ pathname: "/collection", params: { themeId: theme.id } })}>
                <View style={styles.listItemThumb} />
                <Text style={styles.listItemTitle}>{themeTitle(theme, locale)}</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" solid />
              </Pressable>
            );
          })}
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

function CollectionThemeGrid({ themeId }: { themeId: string }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();
  const mapT = mapScreenText[locale];
  const theme = COLLECTION_THEMES.find((candidate) => candidate.id === themeId);
  const locationIds = theme?.locationIds ?? [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.gridScrollContent}>
        <View style={[styles.gridHeader, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <FontAwesome5 name="chevron-left" size={18} color="#1b1b1b" solid />
          </Pressable>
          <Text style={styles.gridTitle}>{theme && themeTitle(theme, locale)}</Text>
        </View>

        <View style={styles.grid}>
          {locationIds.map((id) => {
            const item = COLLECTIBLES[id];
            const locationLabel = mapT.pins[id];
            const handlePress = () => router.push({ pathname: "/collection", params: { locationId: id } });

            if (!item || !item.obtained) {
              return (
                <Pressable
                  key={id}
                  style={({ pressed }) => [styles.gridCard, pressed && styles.listItemPressed]}
                  onPress={handlePress}>
                  <View style={styles.gridCardImageLocked} />
                  <Text style={styles.gridCardNameLocked}>?</Text>
                  <Text style={styles.gridCardLocationLocked}>{locationLabel}</Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.gridCard, pressed && styles.listItemPressed]}
                onPress={handlePress}>
                <View style={styles.gridCardImageWrapper}>
                  <Image source={item.image} style={styles.gridCardImage} resizeMode="cover" />
                  <View style={styles.gridCardBadge}>
                    <FontAwesome5 name="check" size={9} color="#fff" solid />
                  </View>
                </View>
                <Text style={styles.gridCardName}>{item.name[locale]}</Text>
                <Text style={styles.gridCardLocation}>{locationLabel}</Text>
              </Pressable>
            );
          })}
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

function CollectionDetail({ locationId }: { locationId: LocationId }) {
  const insets = useSafeAreaInsets();
  const { locale } = useLanguage();

  const t = collectionScreenText[locale];
  const mapT = mapScreenText[locale];
  const collectible = COLLECTIBLES[locationId];
  const isPerson = collectible?.type === "person";
  const spotId = LOCATION_ID_TO_SPOT_ID[locationId] ?? null;
  const [guideRouteParams, setGuideRouteParams] = useState<Record<string, string>>({});
  // Gates the guide/photo buttons until guideRouteParams finishes loading —
  // without this, a tap that lands before the async lookup resolves sends
  // spotId/storyId/collectionItemId as empty, so photo-save silently skips
  // the server save with no error shown.
  const [isGuideParamsLoading, setIsGuideParamsLoading] = useState(spotId !== null);

  useEffect(() => {
    if (!collectible || spotId === null) {
      setGuideRouteParams({});
      setIsGuideParamsLoading(false);
      return;
    }

    let isActive = true;
    setIsGuideParamsLoading(true);
    getStoryTopics({ locale, spotId, storyType: "special" })
      .then(async (stories) => {
        const story = stories[0];
        if (!story) return { spotId: String(spotId) };

        if (!isPerson) return { spotId: String(spotId), storyId: String(story.storyId) };

        const { items } = await getCollectionItems(story.storyId, { locale, spotId, type: "CHARACTER" });
        return {
          spotId: String(spotId),
          storyId: String(story.storyId),
          ...(items[0] ? { collectionItemId: String(items[0].collectionItemId) } : {}),
        };
      })
      .then((params) => {
        if (isActive) setGuideRouteParams(params);
      })
      .catch((error) => {
        console.error("[collection] guide route lookup failed", error);
        if (isActive) setGuideRouteParams(spotId === null ? {} : { spotId: String(spotId) });
      })
      .finally(() => {
        if (isActive) setIsGuideParamsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [collectible, isPerson, locale, spotId]);

  const handleShare = () => {
    if (!collectible) return;
    Share.share({
      message: `${collectible.name[locale]} · ${mapT.pins[locationId]} ${shareSuffix[locale]}`,
    });
  };

  const topBar = (
    <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
        <FontAwesome5 name="chevron-left" size={18} color={collectible ? "#fff" : "#1b1b1b"} solid />
      </Pressable>
      {collectible && (
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

  if (!collectible) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.comingSoonWrapper}>
          <View style={styles.comingSoonIcon}>
            <FontAwesome5 name="hourglass-half" size={22} color="#b8860b" solid />
          </View>
          <Text style={styles.comingSoonTitle}>{t.comingSoonTitle}</Text>
          <Text style={styles.comingSoonMessage}>{mapT.pins[locationId]}</Text>
          <Text style={styles.comingSoonMessage}>{t.comingSoonMessage}</Text>
        </View>
      </View>
    );
  }

  const secondaryLabel = collectible.secondaryLabelKey === "lifespan" ? t.lifespanLabel : t.productionPeriodLabel;

  return (
    <View style={styles.container}>
      {/* Everything scrolls together — hero, card, buttons — so the card is
          always free to grow to fit its content and the buttons simply
          follow after it in normal flow. Nothing can ever overlap. */}
      <ScrollView contentContainerStyle={styles.detailScrollContent}>
        <View style={styles.heroFrame}>
          {isPerson ? (
            // 법왕/성왕's art has a transparent background, so it's composited
            // onto Figma's own blurred-gradient backdrop colors instead of
            // being cropped to fill — cropping a transparent-background
            // portrait is what made these look wrong.
            <>
              <LinearGradient colors={["#1b1b1b", "#7a7a7a", "#a3a1a0"]} style={StyleSheet.absoluteFill} />
              <Image source={collectible.image} style={styles.personHeroImage} resizeMode="contain" />
            </>
          ) : (
            <Image source={collectible.image} style={styles.artifactHeroImage} resizeMode="cover" />
          )}
          <LinearGradient colors={["rgba(253,252,248,0)", "#fdfcf8"]} style={styles.heroFade} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{collectible.name[locale]}</Text>

          <View style={styles.cardRow}>
            <View style={[styles.cardRowBar, { backgroundColor: "#b8860b" }]} />
            <Text style={styles.cardPrimaryValue}>{collectible.primaryLine[locale]}</Text>
          </View>

          <View style={styles.cardRow}>
            <View style={[styles.cardRowBar, { backgroundColor: "#800000" }]} />
            <View>
              <Text style={styles.cardFieldLabel}>{secondaryLabel}</Text>
              <Text style={styles.cardSecondaryValue}>{collectible.secondaryLine[locale]}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardDivider} />
            <View style={styles.cardDescriptionColumn}>
              <Text style={styles.cardFieldLabel}>{t.keyFeaturesLabel}</Text>
              <Text style={styles.cardDescription}>{collectible.description[locale]}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            style={[styles.primaryButton, isGuideParamsLoading && styles.primaryButtonDisabled]}
            disabled={isGuideParamsLoading}
            onPress={() => router.push({ pathname: "/ar-camera", params: { locationId, ...guideRouteParams } })}>
            <FontAwesome5 name="headphones" size={16} color="#fff" solid />
            <Text style={styles.primaryButtonText}>{t.listenToAudioGuide}</Text>
          </Pressable>
          {isPerson && (
            <Pressable
              style={[styles.primaryButton, isGuideParamsLoading && styles.primaryButtonDisabled]}
              disabled={isGuideParamsLoading}
              onPress={() => router.push({ pathname: "/person-camera", params: { locationId, ...guideRouteParams } })}>
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
    backgroundColor: "#f5f5f4",
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
    flex: 1,
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 15,
    color: "#1b1b1b",
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
    backgroundColor: "#f1f1f1",
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
  // Full-bleed edge to edge (no side margins) for both types — a person's
  // art floats on Figma's blurred-gradient colors via `contain`, an
  // artifact's photo fills the frame via `cover`. Either way the bottom
  // fades into the page background instead of cutting off hard.
  heroFrame: {
    height: HERO_HEIGHT,
    backgroundColor: "#1b1b1b",
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
