export const SUPPORTED_LANGUAGES = ["zh-TW", "zh-CN", "en", "ja", "fr", "de", "es", "it", "pt-PT", "pt-BR", "ru", "ko", "uk", "pl", "tr"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "zh-TW";
export const LANGUAGE_STORAGE_KEY = "app-language";

const LANGUAGE_ALIASES: Record<string, AppLanguage> = {
	de: "de",
	en: "en",
	es: "es",
	fr: "fr",
	it: "it",
	ja: "ja",
	ko: "ko",
	pl: "pl",
	pt: "pt-PT",
	"pt-br": "pt-BR",
	"pt-pt": "pt-PT",
	ru: "ru",
	tr: "tr",
	uk: "uk",
	"zh-cn": "zh-CN",
	"zh-hans": "zh-CN",
	"zh-hk": "zh-TW",
	"zh-hant": "zh-TW",
	"zh-tw": "zh-TW"
};

export const normalizeLanguageTag = (language?: string | null): AppLanguage => {
	if (!language) {
		return DEFAULT_LANGUAGE;
	}

	const normalized = language.toLowerCase();
	const exactMatch = SUPPORTED_LANGUAGES.find(candidate => candidate.toLowerCase() === normalized);

	if (exactMatch) {
		return exactMatch;
	}

	const aliasMatch = LANGUAGE_ALIASES[normalized];

	if (aliasMatch) {
		return aliasMatch;
	}

	if (normalized.startsWith("zh-cn") || normalized.startsWith("zh-hans")) {
		return "zh-CN";
	}

	if (normalized.startsWith("zh-tw") || normalized.startsWith("zh-hant") || normalized.startsWith("zh-hk") || normalized.startsWith("zh")) {
		return "zh-TW";
	}

	const languageCode = normalized.split("-")[0];

	if (!languageCode) {
		return DEFAULT_LANGUAGE;
	}

	const languageMatch = LANGUAGE_ALIASES[languageCode];

	if (languageMatch) {
		return languageMatch;
	}

	return DEFAULT_LANGUAGE;
};

export const getStoredLanguage = (): AppLanguage | null => {
	if (typeof window === "undefined") {
		return null;
	}

	const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
	return stored ? normalizeLanguageTag(stored) : null;
};

export const detectInitialLanguage = (): AppLanguage => {
	const stored = getStoredLanguage();

	if (stored) {
		return stored;
	}

	if (typeof navigator !== "undefined") {
		return normalizeLanguageTag(navigator.language);
	}

	return DEFAULT_LANGUAGE;
};

export const getDateTimeLocale = (language: string): string => {
	return normalizeLanguageTag(language);
};
