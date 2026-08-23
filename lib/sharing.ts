import { requireOptionalNativeModule } from "expo-modules-core";

export type ExpoSharingModule = {
  isAvailableAsync?: () => Promise<boolean>;
  shareAsync?: (url: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>;
};
type ExpoSharingModuleShape = ExpoSharingModule & { default?: ExpoSharingModule };

export async function getSharingModule(): Promise<ExpoSharingModule | null> {
  if (!requireOptionalNativeModule("ExpoSharing")) {
    console.warn("[sharing] ExpoSharing native module is unavailable. Rebuild the dev client to enable image sharing.");
    return null;
  }

  try {
    // Lazy-load because an old dev client can run without the native ExpoSharing
    // module until the user rebuilds after installing expo-sharing.
    const sharing = (await import("expo-sharing")) as ExpoSharingModuleShape;
    return sharing.isAvailableAsync ? sharing : sharing.default ?? null;
  } catch (error) {
    console.error("[sharing] expo-sharing native module is unavailable", error);
    return null;
  }
}
