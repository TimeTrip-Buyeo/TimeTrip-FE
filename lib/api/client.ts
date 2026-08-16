import { clearTokens, getTokens, saveTokens, type AuthTokens } from "@/lib/token-storage";

// AUTH_API_SPEC.md 2번: 응답 포맷은 항상 { isSuccess, code, message, result }.
// 로그아웃/탈퇴처럼 HTTP status가 200으로 내려오는 경우도 있어서 성공/실패
// 판정은 HTTP status가 아니라 isSuccess로 해야 한다.
type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://10.0.2.2:8081";

if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn(`[api] EXPO_PUBLIC_API_BASE_URL이 설정되지 않아 기본값을 사용합니다: ${API_BASE_URL}`);
}

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

// SessionProvider가 구독해서 refresh 실패(=완전 로그아웃 상태) 시 isLoggedIn을
// false로 내린다. Stack.Protected 가드가 나머지 네비게이션을 알아서 처리하므로
// 이 모듈은 화면 이동을 직접 다루지 않는다.
export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  unauthorizedListener = listener;
}

type RequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

function buildFetchInit(init: RequestInit = {}): globalThis.RequestInit {
  const isFormData = init.body instanceof FormData;
  return {
    method: init.method ?? "GET",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    body: init.body === undefined ? undefined : isFormData ? (init.body as BodyInit) : JSON.stringify(init.body),
  };
}

async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, buildFetchInit(init));
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!json.isSuccess) {
    throw new ApiError(response.status, json.code, json.message);
  }
  return json.result;
}

function reissueTokens(refreshToken: string): Promise<AuthTokens> {
  // 스펙 2.3: body 없음, Refresh-Token 커스텀 헤더 (Authorization 아님).
  return rawRequest<AuthTokens>("/auth/token/reissue", {
    method: "POST",
    headers: { "Refresh-Token": refreshToken },
  });
}

// 401이 동시에 여러 건 터져도 reissue는 한 번만 나가도록 진행 중인 요청을 공유한다.
let pendingReissue: Promise<AuthTokens | null> | null = null;

function reissueOnce(refreshToken: string): Promise<AuthTokens | null> {
  if (!pendingReissue) {
    pendingReissue = reissueTokens(refreshToken)
      .then(async (tokens) => {
        await saveTokens(tokens);
        return tokens;
      })
      .catch(() => null)
      .finally(() => {
        pendingReissue = null;
      });
  }
  return pendingReissue;
}

async function authedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await getTokens();
  const headers = {
    ...init.headers,
    ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  };

  try {
    return await rawRequest<T>(path, { ...init, headers });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !tokens) throw error;

    const refreshed = await reissueOnce(tokens.refreshToken);
    if (!refreshed) {
      await clearTokens();
      unauthorizedListener?.();
      throw error;
    }

    return rawRequest<T>(path, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${refreshed.accessToken}` },
    });
  }
}

export function publicPost<T>(path: string, body?: unknown): Promise<T> {
  return rawRequest<T>(path, { method: "POST", body });
}

export function publicGet<T>(path: string): Promise<T> {
  return rawRequest<T>(path);
}

export function apiGet<T>(path: string): Promise<T> {
  return authedRequest<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return authedRequest<T>(path, { method: "POST", body });
}

export function apiMultipartPost<T>(path: string, formData: FormData): Promise<T> {
  return authedRequest<T>(path, { method: "POST", body: formData });
}

export function apiDelete<T>(path: string): Promise<T> {
  return authedRequest<T>(path, { method: "DELETE" });
}

export function toApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}${pathOrUrl}`;
}
