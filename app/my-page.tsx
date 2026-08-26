import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMe } from "@/lib/api/auth";
import { BottomNav, type BottomNavKey } from "@/components/bottom-nav";
import { LOCALES, mapScreenText, myPageText, type Locale } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";

// A tab-root destination like AlbumList/CollectionList (album.tsx,
// collection.tsx) — no back chevron, reached only via the bottom nav.
export default function MyPageScreen() {
  const insets = useSafeAreaInsets();
  const { locale, setLocale } = useLanguage();
  const { currentEmail, logout, withdraw } = useSession();
  const t = myPageText[locale];
  const mapT = mapScreenText[locale];
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const currentLocaleMeta = LOCALES.find((item) => item.code === locale)!;

  // GET /users gives the real nickname for a Kakao/Google session. For the
  // email mock session (or if the call fails), fall back to the previous
  // currentEmail/guestLabel display.
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setNickname(me.name);
      })
      .catch(() => {
        // Not a real session (or offline) — keep the currentEmail/guestLabel fallback below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setIsLanguageModalOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleWithdraw = () => {
    Alert.alert(t.withdrawConfirmTitle, t.withdrawConfirmMessage, [
      { text: t.withdrawCancelButton, style: "cancel" },
      {
        text: t.withdrawConfirmButton,
        style: "destructive",
        onPress: async () => {
          try {
            await withdraw();
            router.replace("/login");
          } catch {
            Alert.alert(t.withdrawConfirmTitle, t.withdrawErrorMessage);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>{t.title}</Text>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <FontAwesome5 name="user" size={22} color="#800000" solid />
          </View>
          <Text style={styles.accountEmail}>{nickname ?? currentEmail ?? t.guestLabel}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t.settingsSectionLabel}</Text>

        <View style={styles.settingsGroup}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => setIsLanguageModalOpen(true)}>
            <View style={styles.rowLeft}>
              <FontAwesome5 name="globe-asia" size={14} color="#b8860b" solid />
              <Text style={styles.rowLabel}>{t.languageRowLabel}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{currentLocaleMeta.nativeLabel}</Text>
              <FontAwesome5 name="chevron-right" size={12} color="#d1d5db" solid />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.row, styles.rowDivider, pressed && styles.rowPressed]}
            onPress={handleLogout}>
            <View style={styles.rowLeft}>
              <FontAwesome5 name="sign-out-alt" size={14} color="#b91c1c" solid />
              <Text style={[styles.rowLabel, styles.logoutLabel]}>{t.logoutRowLabel}</Text>
            </View>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.withdrawButton, pressed && styles.withdrawButtonPressed]}
          onPress={handleWithdraw}
          hitSlop={8}>
          <Text style={styles.withdrawText}>{t.withdrawRowLabel}</Text>
        </Pressable>
      </ScrollView>

      <BottomNav
        active="myPage"
        labels={mapT.nav}
        onNavigate={(key: BottomNavKey) => {
          if (key === "map") router.push("/(tabs)");
          if (key === "collection") router.push("/collection");
          if (key === "album") router.push("/album");
        }}
      />

      {isLanguageModalOpen && (
        <LanguageSelectModal
          title={t.languageModalTitle}
          closeLabel={t.languageModalCloseLabel}
          currentLocale={locale}
          insetsBottom={insets.bottom}
          onSelect={handleSelectLocale}
          onClose={() => setIsLanguageModalOpen(false)}
        />
      )}
    </View>
  );
}

type LanguageSelectModalProps = {
  title: string;
  closeLabel: string;
  currentLocale: Locale;
  insetsBottom: number;
  onSelect: (locale: Locale) => void;
  onClose: () => void;
};

// Was an anchored popover (LanguageLegendModal) positioned absolutely under
// the language row — on this screen it overlapped the "로그아웃" row directly
// below it instead of pushing it down, which read as broken. This is a
// proper bottom sheet instead (same motion/backdrop pattern as buyeo-cut.tsx's
// FilterSheet), sized to this screen's own settings row rather than reused
// as-is from the small top-right badge popover other screens use.
function LanguageSelectModal({ title, closeLabel, currentLocale, insetsBottom, onSelect, onClose }: LanguageSelectModalProps) {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(sheetTranslateY, { toValue: 0, useNativeDriver: true, damping: 18, mass: 0.8 }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.modalBackdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[styles.modalSheet, { paddingBottom: insetsBottom + 24, transform: [{ translateY: sheetTranslateY }] }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.modalClose}>{closeLabel}</Text>
          </Pressable>
        </View>
        <View style={styles.modalOptions}>
          {LOCALES.map((option) => {
            const isActive = option.code === currentLocale;
            return (
              <Pressable
                key={option.code}
                style={({ pressed }) => [
                  styles.modalOption,
                  isActive && styles.modalOptionActive,
                  pressed && styles.modalOptionPressed,
                ]}
                onPress={() => onSelect(option.code)}>
                <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>
                  {option.nativeLabel}
                </Text>
                {isActive && <FontAwesome5 name="check" size={12} color="#fff" solid />}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#faf9f5",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 32,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: "serif",
    fontWeight: "900",
    fontSize: 24,
    color: "#1b1b1b",
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 24,
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fcf5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  accountEmail: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  sectionLabel: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 12,
    color: "#b8860b",
    textTransform: "uppercase",
    marginHorizontal: 24,
    marginTop: 28,
    marginBottom: 12,
  },
  settingsGroup: {
    marginHorizontal: 24,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(231,229,228,0.6)",
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingVertical: 16,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  rowPressed: {
    backgroundColor: "#cccccc",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  logoutLabel: {
    color: "#b91c1c",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  withdrawButton: {
    alignItems: "center",
    marginTop: 20,
  },
  withdrawButtonPressed: {
    opacity: 0.6,
  },
  withdrawText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9ca3af",
  },
  // Language select modal (bottom sheet)
  modalBackdrop: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -15 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "serif",
    fontWeight: "700",
    fontSize: 18,
    color: "#1b1b1b",
  },
  modalClose: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  modalOptions: {
    gap: 10,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 17,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: "#faf9f5",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  modalOptionActive: {
    backgroundColor: "#800000",
    borderColor: "#800000",
  },
  modalOptionPressed: {
    opacity: 0.85,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1b1b1b",
  },
  modalOptionTextActive: {
    color: "#fff",
  },
});
