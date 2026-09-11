import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";

/** Shared fetch-with-cancellation-guard pattern for screen-level API reads.
 *  Pass `{ keepPreviousData: true }` for deps that are background refreshes
 *  (e.g. a screen-focus token) so the UI doesn't flash back to a spinner. */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  errorLabel: string,
  options: { keepPreviousData?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!options.keepPreviousData) setData(null);
    setLoadError(false);
    fetcher()
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((error) => {
        console.error(errorLabel, error instanceof ApiError ? error.message : error);
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
    // deps is caller-supplied (mirrors useEffect's own contract) — the hook itself has no
    // way to statically declare it, so exhaustive-deps can't verify this array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loadError };
}
