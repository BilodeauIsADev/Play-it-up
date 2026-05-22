import type { Category, Channel } from "../../shared/types";

export interface FilterOption {
  code: string;
  label: string;
  aliases: string[];
}

/** Common IPTV country group prefixes — order is display order in Settings. */
export const COUNTRY_OPTIONS: FilterOption[] = [
  { code: "US", label: "United States", aliases: ["USA", "UNITED STATES"] },
  { code: "CA", label: "Canada", aliases: ["CANADA"] },
  { code: "UK", label: "United Kingdom", aliases: ["GB", "GREAT BRITAIN", "ENGLAND"] },
  { code: "AU", label: "Australia", aliases: ["AUSTRALIA"] },
  { code: "DE", label: "Germany", aliases: ["GERMANY", "DEUTSCHLAND"] },
  { code: "FR", label: "France", aliases: ["FRANCE"] },
  { code: "IT", label: "Italy", aliases: ["ITALY"] },
  { code: "ES", label: "Spain", aliases: ["SPAIN", "ESPAÑA"] },
  { code: "PT", label: "Portugal", aliases: ["PORTUGAL"] },
  { code: "NL", label: "Netherlands", aliases: ["HOLLAND"] },
  { code: "BE", label: "Belgium", aliases: ["BELGIUM", "BELGIË"] },
  { code: "CH", label: "Switzerland", aliases: ["SWITZERLAND", "SUISSE"] },
  { code: "AT", label: "Austria", aliases: ["AUSTRIA", "ÖSTERREICH"] },
  { code: "IE", label: "Ireland", aliases: ["IRISH"] },
  { code: "NZ", label: "New Zealand", aliases: ["NEW ZEALAND"] },
  { code: "MX", label: "Mexico", aliases: ["MEXICO"] },
  { code: "BR", label: "Brazil", aliases: ["BRAZIL", "BRASIL"] },
  { code: "AR", label: "Argentina", aliases: ["ARGENTINA"] },
  { code: "IN", label: "India", aliases: ["INDIAN"] },
  { code: "PK", label: "Pakistan", aliases: ["PAKISTANI"] },
  { code: "AE", label: "UAE", aliases: ["UNITED ARAB EMIRATES", "DUBAI"] },
  { code: "SA", label: "Saudi Arabia", aliases: ["SAUDI", "KSA"] },
  { code: "TR", label: "Turkey", aliases: ["TURKEY", "TURKIYE"] },
  { code: "IL", label: "Israel", aliases: ["ISRAEL"] },
  { code: "GR", label: "Greece", aliases: ["GREECE"] },
  { code: "PL", label: "Poland", aliases: ["POLAND"] },
  { code: "RO", label: "Romania", aliases: ["ROMANIA"] },
  { code: "RU", label: "Russia", aliases: ["RUSSIA"] },
  { code: "UA", label: "Ukraine", aliases: ["UKRAINE"] },
  { code: "SE", label: "Sweden", aliases: ["SWEDEN"] },
  { code: "NO", label: "Norway", aliases: ["NORWAY"] },
  { code: "DK", label: "Denmark", aliases: ["DENMARK"] },
  { code: "FI", label: "Finland", aliases: ["FINLAND"] },
  { code: "ZA", label: "South Africa", aliases: ["SOUTH AFRICAN"] },
  { code: "PH", label: "Philippines", aliases: ["FILIPINO"] },
  { code: "KR", label: "South Korea", aliases: ["KOREA"] },
  { code: "JP", label: "Japan", aliases: ["JAPAN"] },
  { code: "CN", label: "China", aliases: ["CHINA"] },
];

/** Language prefixes commonly used in IPTV category names (EN ◉ …, DE | …). */
export const LANGUAGE_OPTIONS: FilterOption[] = [
  { code: "EN", label: "English", aliases: ["ENGLISH", "ENG"] },
  { code: "DE", label: "German", aliases: ["DEUTSCH", "GERMAN"] },
  { code: "FR", label: "French", aliases: ["FRANCAIS", "FRANÇAIS", "FRENCH"] },
  { code: "ES", label: "Spanish", aliases: ["SPANISH", "ESPAÑOL", "ESPANOL"] },
  { code: "IT", label: "Italian", aliases: ["ITALIAN", "ITALIANO"] },
  { code: "PT", label: "Portuguese", aliases: ["PORTUGUESE", "PORTUGUÊS"] },
  { code: "NL", label: "Dutch", aliases: ["DUTCH", "NEDERLANDS"] },
  { code: "PL", label: "Polish", aliases: ["POLISH", "POLSKI"] },
  { code: "RU", label: "Russian", aliases: ["RUSSIAN", "RUSSKIY"] },
  { code: "AR", label: "Arabic", aliases: ["ARABIC", "ARAB"] },
  { code: "TR", label: "Turkish", aliases: ["TURKISH", "TURKCE"] },
  { code: "HI", label: "Hindi", aliases: ["HINDI"] },
  { code: "UR", label: "Urdu", aliases: ["URDU"] },
  { code: "HE", label: "Hebrew", aliases: ["HEBREW"] },
  { code: "EL", label: "Greek", aliases: ["GREEK"] },
  { code: "SV", label: "Swedish", aliases: ["SWEDISH", "SVENSKA"] },
  { code: "NO", label: "Norwegian", aliases: ["NORWEGIAN", "NORSK"] },
  { code: "DA", label: "Danish", aliases: ["DANISH", "DANSK"] },
  { code: "FI", label: "Finnish", aliases: ["FINNISH", "SUOMI"] },
  { code: "RO", label: "Romanian", aliases: ["ROMANIAN", "ROMÂNĂ"] },
  { code: "BG", label: "Bulgarian", aliases: ["BULGARIAN"] },
  { code: "HR", label: "Croatian", aliases: ["CROATIAN"] },
  { code: "CS", label: "Czech", aliases: ["CZECH", "ČEŠTINA"] },
  { code: "SK", label: "Slovak", aliases: ["SLOVAK"] },
  { code: "HU", label: "Hungarian", aliases: ["HUNGARIAN", "MAGYAR"] },
  { code: "SR", label: "Serbian", aliases: ["SERBIAN"] },
  { code: "UK", label: "Ukrainian", aliases: ["UKRAINIAN", "UKR"] },
  { code: "JA", label: "Japanese", aliases: ["JAPANESE"] },
  { code: "KO", label: "Korean", aliases: ["KOREAN"] },
  { code: "ZH", label: "Chinese", aliases: ["CHINESE", "MANDARIN", "CANTONESE"] },
  { code: "TH", label: "Thai", aliases: ["THAI"] },
  { code: "VI", label: "Vietnamese", aliases: ["VIETNAMESE"] },
  { code: "ID", label: "Indonesian", aliases: ["INDONESIAN"] },
  { code: "MS", label: "Malay", aliases: ["MALAY"] },
  { code: "FA", label: "Persian", aliases: ["PERSIAN", "FARSI"] },
  { code: "AL", label: "Albanian", aliases: ["ALBANIAN", "SHQIP"] },
  { code: "LT", label: "Lithuanian", aliases: ["LITHUANIAN"] },
  { code: "LV", label: "Latvian", aliases: ["LATVIAN"] },
  { code: "ET", label: "Estonian", aliases: ["ESTONIAN"] },
];

export interface ContentFilterSelection {
  countries: string[];
  languages: string[];
}

const countryDetectCache = new Map<string, string[]>();
const languageDetectCache = new Map<string, string[]>();
const groupMatchCache = new Map<string, boolean>();

function selectionCacheKey(selection: ContentFilterSelection): string {
  return `${selection.countries.join(",")}|${selection.languages.join(",")}`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Split provider category names on common IPTV separators. */
function splitGroupSegments(groupName: string): string[] {
  return groupName
    .toUpperCase()
    .split(/[\|◉·•/\-–—]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function termMatches(text: string, segments: string[], term: string): boolean {
  const upper = term.toUpperCase();
  if (segments.some((seg) => seg === upper)) return true;
  if (segments.some((seg) => seg.startsWith(`${upper} `))) return true;

  const re = new RegExp(
    `(?:^|[\\s|[(/\\-–—|])${escapeRegex(upper)}(?:$|[\\s|\\])\\-–—|])`,
    "i",
  );
  return re.test(text);
}

function matchesOption(
  groupName: string,
  option: FilterOption,
  mode: "country" | "language",
): boolean {
  const text = groupName.toUpperCase();
  const segments = splitGroupSegments(groupName);
  const first = segments[0] ?? "";
  const terms = [option.code, ...option.aliases];

  if (mode === "language") {
    if (terms.some((term) => first === term.toUpperCase())) return true;
    if (terms.some((term) => first.startsWith(`${term.toUpperCase()} `))) {
      return true;
    }
    const prefix = new RegExp(
      `^${escapeRegex(option.code)}(?:\\s|[◉·•|\\-/–—])`,
      "i",
    );
    if (prefix.test(text)) return true;
  }

  return terms.some((term) => termMatches(text, segments, term));
}

function detectInGroup(
  groupName: string | undefined,
  options: FilterOption[],
  mode: "country" | "language",
): string[] {
  if (!groupName?.trim()) return [];

  const cache = mode === "country" ? countryDetectCache : languageDetectCache;
  const hit = cache.get(groupName);
  if (hit) return hit;

  const found = new Set<string>();
  for (const option of options) {
    if (matchesOption(groupName, option, mode)) {
      found.add(option.code);
    }
  }
  const result = [...found];
  cache.set(groupName, result);
  return result;
}

/** Detect country codes embedded in a provider category/group name. */
export function detectCountriesInGroup(groupName: string | undefined): string[] {
  return detectInGroup(groupName, COUNTRY_OPTIONS, "country");
}

/** Detect language codes embedded in a provider category/group name. */
export function detectLanguagesInGroup(groupName: string | undefined): string[] {
  return detectInGroup(groupName, LANGUAGE_OPTIONS, "language");
}

export function groupMatchesContentFilter(
  groupName: string | undefined,
  selection: ContentFilterSelection,
): boolean {
  const { countries, languages } = selection;
  if (countries.length === 0 && languages.length === 0) return true;
  if (!groupName?.trim()) return false;

  const cacheKey = `${groupName}\0${selectionCacheKey(selection)}`;
  const cached = groupMatchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const detectedCountries = detectCountriesInGroup(groupName);
  const detectedLanguages = detectLanguagesInGroup(groupName);

  const countryHit =
    countries.length > 0 &&
    detectedCountries.some((code) => countries.includes(code));
  const languageHit =
    languages.length > 0 &&
    detectedLanguages.some((code) => languages.includes(code));

  let result: boolean;
  if (countries.length > 0 && languages.length > 0) {
    result = countryHit || languageHit;
  } else if (countries.length > 0) {
    result = countryHit;
  } else {
    result = languageHit;
  }

  groupMatchCache.set(cacheKey, result);
  return result;
}

export function filterChannelsByContent(
  channels: Channel[],
  selection: ContentFilterSelection,
): Channel[] {
  if (selection.countries.length === 0 && selection.languages.length === 0) {
    return channels;
  }
  return channels.filter((c) =>
    groupMatchesContentFilter(c.group, selection),
  );
}

export function filterCategoriesForChannels(
  categories: Category[],
  visibleChannels: Channel[],
): Category[] {
  const visibleKeys = new Set<string>();
  for (const ch of visibleChannels) {
    if (ch.groupId) visibleKeys.add(ch.groupId);
    if (ch.group) visibleKeys.add(ch.group);
  }

  return categories
    .filter((cat) => visibleKeys.has(cat.id) || visibleKeys.has(cat.name))
    .map((cat) => ({
      ...cat,
      count: visibleChannels.filter(
        (ch) =>
          ch.groupId === cat.id ||
          ch.group === cat.name ||
          ch.group === cat.id,
      ).length,
    }))
    .filter((cat) => (cat.count ?? 0) > 0);
}

export function applyContentFilter(
  channels: Channel[],
  categories: Category[],
  selection: ContentFilterSelection,
): { channels: Channel[]; categories: Category[]; active: boolean } {
  if (selection.countries.length === 0 && selection.languages.length === 0) {
    return { channels, categories, active: false };
  }

  const filteredChannels = filterChannelsByContent(channels, selection);
  const filteredCategories = filterCategoriesForChannels(
    categories,
    filteredChannels,
  );

  return {
    channels: filteredChannels,
    categories: filteredCategories,
    active: true,
  };
}

/** @deprecated Use applyContentFilter */
export function applyCountryFilter(
  channels: Channel[],
  categories: Category[],
  selectedCountries: string[],
): ReturnType<typeof applyContentFilter> {
  return applyContentFilter(channels, categories, {
    countries: selectedCountries,
    languages: [],
  });
}

export function contentFilterFromSettings(settings: {
  countryFilter?: string[];
  languageFilter?: string[];
}): ContentFilterSelection {
  return {
    countries: settings.countryFilter ?? [],
    languages: settings.languageFilter ?? [],
  };
}
