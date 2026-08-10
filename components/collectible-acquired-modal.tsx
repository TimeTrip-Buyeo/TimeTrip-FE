import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { collectibleAcquiredText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";

type CollectibleAcquiredModalProps = {
  type: "person" | "artifact";
  name: string;
  description: string;
  image: ImageSourcePropType;
  onClose: () => void;
  onViewCollection: () => void;
  /** Person acquisitions only — Figma has no "사진 찍기" button on the artifact variant. */
  onTakePhoto?: () => void;
};

// Matches Figma "인물카드 획득" / "유물 카드 획득" (nodes 0:2718 / 0:2821) — the
// celebratory popup for a new collection acquisition. Centered card + fade
// (not a bottom sheet) since this is a one-off celebratory interrupt, not a
// picker.
export function CollectibleAcquiredModal({
  type,
  name,
  description,
  image,
  onClose,
  onViewCollection,
  onTakePhoto,
}: CollectibleAcquiredModalProps) {
  const { locale } = useLanguage();
  const t = collectibleAcquiredText[locale];
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, damping: 16, mass: 0.7 }),
    ]).start();
  }, [backdropOpacity, cardScale]);

  const isPerson = type === "person";
  const typeLabel = isPerson ? t.personLabel : t.artifactLabel;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.centerWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }], opacity: backdropOpacity }]}>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel={t.closeButtonAccessibilityLabel}>
            <FontAwesome5 name="times" size={16} color="#9ca3af" solid />
          </Pressable>

          <View style={styles.badge}>
            <FontAwesome5 name={isPerson ? "crown" : "gem"} size={22} color="#b8860b" solid />
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>
              {t.newAcquiredPrefix}
              <Text style={styles.accentText}>{typeLabel}</Text>
              {t.newAcquiredSuffix}
            </Text>
            <Text style={styles.subtitle}>
              <Text style={styles.accentText}>{name}</Text>
              {t.addedToCollectionSuffix}
            </Text>
          </View>

          <View style={styles.itemCard}>
            <Image source={image} style={styles.itemImage} resizeMode="cover" />
            <View style={styles.itemTextColumn}>
              <Text style={styles.itemName}>{name}</Text>
              <Text style={styles.itemDescription}>{description}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {isPerson && onTakePhoto && (
              <Pressable style={styles.primaryButton} onPress={onTakePhoto}>
                <FontAwesome5 name="camera" size={13} color="#fff" solid />
                <Text style={styles.primaryButtonText}>{t.takePhotoButtonLabel}</Text>
              </Pressable>
            )}
            <Pressable style={styles.secondaryButton} onPress={onViewCollection}>
              <Text style={styles.secondaryButtonText}>{t.viewCollectionButtonLabel}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  centerWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 337,
    backgroundColor: "#f6f1ec",
    borderRadius: 22,
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 24,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  closeButton: {
    position: "absolute",
    top: 13,
    right: 13,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fdf1cf",
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontFamily: "System",
    fontWeight: "600",
    fontSize: 21,
    color: "#1b1b1b",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
  },
  accentText: {
    color: "#7d1e1f",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    borderWidth: 1,
    borderColor: "#e1dcd6",
    borderRadius: 10,
    padding: 8,
  },
  itemImage: {
    width: 100,
    height: 95,
    borderRadius: 6,
    backgroundColor: "#e5e7eb",
  },
  itemTextColumn: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 13,
    color: "#1b1b1b",
    textAlign: "center",
  },
  itemDescription: {
    fontFamily: "serif",
    fontSize: 10,
    lineHeight: 15,
    color: "#1b1b1b",
    textAlign: "center",
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#7d1e1f",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#7d1d1e",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#800000",
  },
});
