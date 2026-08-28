import { apiDelete, apiGet, apiPost, publicPost } from "@/lib/api/client";
import type { AuthTokens } from "@/lib/token-storage";

export type MeResponse = {
  id: number;
  /** 필드명은 name이지만 실제로는 닉네임 (AUTH_API_SPEC.md 2.5 참고). */
  name: string;
};

export function loginWithKakao(providerAccessToken: string): Promise<AuthTokens> {
  return publicPost<AuthTokens>("/users/kakao", { accessToken: providerAccessToken });
}

export function loginWithGoogle(providerIdToken: string): Promise<AuthTokens> {
  return publicPost<AuthTokens>("/users/google", { idToken: providerIdToken });
}

/** Review/QA-only fixed-account login (Play/관광공사 심사, 내부 QA). See AUTH_API_SPEC.md. */
export function loginWithDev(loginId: string, password: string): Promise<AuthTokens> {
  return publicPost<AuthTokens>("/users/dev", { loginId, password });
}

export function getMe(): Promise<MeResponse> {
  return apiGet<MeResponse>("/users");
}

export function logout(): Promise<null> {
  return apiPost<null>("/auth/logout");
}

export function deleteAccount(): Promise<null> {
  return apiDelete<null>("/users");
}
