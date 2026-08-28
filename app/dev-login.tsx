import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { loginText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";
import { useSession } from "@/hooks/use-session";
import { ApiError } from "@/lib/api/client";

export default function DevLoginScreen() {
  const { locale } = useLanguage();
  const { loginWithDev } = useSession();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = loginText[locale];

  const handleSubmit = async () => {
    if (isSubmitting || !loginId || !password) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await loginWithDev(loginId, password);
      router.push("/onboarding-guide");
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 429) {
        setError(t.devLoginTooMany);
      } else if (submitError instanceof ApiError && submitError.status === 401) {
        setError(t.devLoginInvalid);
      } else if (submitError instanceof ApiError && submitError.status === 404) {
        // DEV_LOGIN_ENABLED=false인 서버(주로 로컬/개발 환경)에서는 /users/dev 자체가 없어
        // 스프링 기본 404 포맷(code/message 없음)이 내려온다. 운영 서버에서는 항상 켜져 있어
        // 정상적인 사용자는 이 분기를 만나지 않는다.
        setError(t.devLoginUnavailable);
      } else {
        console.error("[dev-login] login failed", submitError);
        setError(t.socialLoginError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
        <Text style={styles.backButtonText}>‹</Text>
      </Pressable>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.form}>
          <Text style={styles.title}>{t.devLoginToggle}</Text>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder={t.devLoginIdPlaceholder}
            placeholderTextColor="#a09087"
            value={loginId}
            onChangeText={setLoginId}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />
          <TextInput
            style={styles.input}
            placeholder={t.devLoginPasswordPlaceholder}
            placeholderTextColor="#a09087"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!isSubmitting}
          />

          <Pressable
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting || !loginId || !password}>
            <Text style={styles.submitButtonText}>{t.devLoginButton}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdfcf8",
  },
  backButton: {
    width: 40,
    height: 40,
    marginLeft: 12,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 28,
    color: "#2b1f1b",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  form: {
    gap: 10,
  },
  title: {
    fontFamily: "serif",
    fontSize: 22,
    fontWeight: "bold",
    color: "#2b1f1b",
    textAlign: "center",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
    color: "#b91c1c",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafaf8",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#2b1f1b",
  },
  submitButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "#2b1f1b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fdfcf8",
  },
});
