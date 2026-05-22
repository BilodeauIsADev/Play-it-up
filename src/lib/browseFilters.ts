import type { AppSettings, Category, Channel } from "../../shared/types";
import { applyContentFilter } from "./countryFilter";

export interface BrowseFilterState {
  browseChannels: Channel[];
  browseCategories: Category[];
  browseMovies: Channel[];
  browseMovieCategories: Category[];
  browseSeries: Channel[];
  browseSeriesCategories: Category[];
  contentFilterActive: boolean;
}

export const EMPTY_BROWSE: BrowseFilterState = {
  browseChannels: [],
  browseCategories: [],
  browseMovies: [],
  browseMovieCategories: [],
  browseSeries: [],
  browseSeriesCategories: [],
  contentFilterActive: false,
};

export function computeBrowseFilters(input: {
  channels: Channel[];
  categories: Category[];
  movies: Channel[];
  movieCategories: Category[];
  series: Channel[];
  seriesCategories: Category[];
  settings: AppSettings | null;
}): BrowseFilterState {
  const selection = {
    countries: input.settings?.countryFilter ?? [],
    languages: input.settings?.languageFilter ?? [],
  };

  const live = applyContentFilter(input.channels, input.categories, selection);
  const mov = applyContentFilter(input.movies, input.movieCategories, selection);
  const ser = applyContentFilter(input.series, input.seriesCategories, selection);

  return {
    browseChannels: live.channels,
    browseCategories: live.categories,
    browseMovies: mov.channels,
    browseMovieCategories: mov.categories,
    browseSeries: ser.channels,
    browseSeriesCategories: ser.categories,
    contentFilterActive: live.active || mov.active || ser.active,
  };
}
