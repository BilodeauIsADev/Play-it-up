import { useMemo } from "react";
import type { Category, Channel } from "../../shared/types";
import { applyContentFilter } from "./countryFilter";
import { useApp } from "../store/app";

export function useContentFilter(channels: Channel[], categories: Category[]) {
  const countryFilter = useApp((s) => s.settings?.countryFilter);
  const languageFilter = useApp((s) => s.settings?.languageFilter);

  return useMemo(
    () =>
      applyContentFilter(channels, categories, {
        countries: countryFilter ?? [],
        languages: languageFilter ?? [],
      }),
    [channels, categories, countryFilter, languageFilter],
  );
}

/** @deprecated Use useContentFilter */
export function useCountryFilter(channels: Channel[], categories: Category[]) {
  return useContentFilter(channels, categories);
}
