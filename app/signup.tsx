import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GUNGSEO_FONT_BOLD } from "@/constants/fonts";
import { authText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";

// Registers a real (in-session) account via useSession().signUp — validation
// happens there (email format, password length, duplicate check); this
// screen only owns the confirm-password match, which signUp() has no
// parameter for. New members still see the onboarding tour afterward, same
// as the Kakao/Google mock buttons, so isLoggedIn isn't flipped here —
// onboarding's final step calls login(email) once the tour finishes.
export default function SignUpScreen() {
  const { locale } = useLanguage();
  const t = authText[locale];
  const { signUp } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (password !== confirmPassword) {
      setError(t.errors.passwordMismatch);
      return;
    }
    const result = signUp(email.trim(), password);
    if (!result.ok) {
      const errorText = {
        "invalid-email": t.errors.invalidEmail,
        "weak-password": t.errors.weakPassword,
        duplicate: t.errors.duplicate,
      }[result.error];
      setError(errorText);
      return;
    }
    router.push({ pathname: "/onboarding-guide", params: { email: email.trim() } });
  };

  const canSubmit = email.length > 0 && password.length > 0 && confirmPassword.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <FontAwesome5 name="chevron-left" size={20} color="#1b1b1b" solid />
        </Pressable>
        <Text style={styles.headerTitle}>{t.signUpTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            placeholder={t.emailPlaceholder}
            placeholderTextColor="#a8a29e"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.passwordLabel}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            placeholder={t.passwordPlaceholder}
            placeholderTextColor="#a8a29e"
            secureTextEntry
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.confirmPasswordLabel}</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setError(null);
            }}
            placeholder={t.confirmPasswordPlaceholder}
            placeholderTextColor="#a8a29e"
            secureTextEntry
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [styles.submitButton, pressed && styles.submitButtonPressed]}
          onPress={handleSubmit}
          disabled={!canSubmit}>
          <Text style={styles.submitButtonText}>{t.signUpButton}</Text>
        </Pressable>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>{t.hasAccountPrompt}</Text>
          <Pressable
            style={({ pressed }) => [styles.footerLink, pressed && styles.footerLinkPressed]}
            onPress={() => router.replace("/email-login")}
            hitSlop={8}>
            <Text style={styles.footerLinkText}>{t.loginLink}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    position: "absolute",
    left: 24,
    bottom: 16,
  },
  headerTitle: {
    fontFamily: GUNGSEO_FONT_BOLD,
    fontSize: 18,
    color: "#1b1b1b",
  },
  form: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5b4339",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafaf8",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#1b1b1b",
  },
  errorText: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: -8,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#800000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonPressed: {
    backgroundColor: "#cccccc",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  footerText: {
    fontSize: 13,
    color: "#8b7b73",
  },
  footerLink: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  footerLinkPressed: {
    backgroundColor: "#cccccc",
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#800000",
    textDecorationLine: "underline",
  },
});
