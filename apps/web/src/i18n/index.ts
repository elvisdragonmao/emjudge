import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, detectInitialLanguage, getDateTimeLocale, normalizeLanguageTag } from "@/i18n/config";
import de from "@/i18n/locales/de/translation.json";
import en from "@/i18n/locales/en/translation.json";
import es from "@/i18n/locales/es/translation.json";
import fr from "@/i18n/locales/fr/translation.json";
import it from "@/i18n/locales/it/translation.json";
import ja from "@/i18n/locales/ja/translation.json";
import ko from "@/i18n/locales/ko/translation.json";
import pl from "@/i18n/locales/pl/translation.json";
import ptBR from "@/i18n/locales/pt-BR/translation.json";
import ptPT from "@/i18n/locales/pt-PT/translation.json";
import ru from "@/i18n/locales/ru/translation.json";
import tr from "@/i18n/locales/tr/translation.json";
import uk from "@/i18n/locales/uk/translation.json";
import zhCN from "@/i18n/locales/zh-CN/translation.json";
import zhTW from "@/i18n/locales/zh-TW/translation.json";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
	de: { translation: de },
	en: { translation: en },
	es: { translation: es },
	fr: { translation: fr },
	it: { translation: it },
	ja: { translation: ja },
	ko: { translation: ko },
	pl: { translation: pl },
	"pt-BR": { translation: ptBR },
	"pt-PT": { translation: ptPT },
	ru: { translation: ru },
	tr: { translation: tr },
	uk: { translation: uk },
	"zh-CN": { translation: zhCN },
	"zh-TW": { translation: zhTW }
} as const;

void i18n.use(initReactI18next).init({
	resources,
	lng: detectInitialLanguage(),
	fallbackLng: DEFAULT_LANGUAGE,
	supportedLngs: [...SUPPORTED_LANGUAGES],
	interpolation: {
		escapeValue: false
	}
});

const syncLanguage = (language: string) => {
	const normalized = normalizeLanguageTag(language);

	if (typeof window !== "undefined") {
		window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
	}

	if (typeof document !== "undefined") {
		document.documentElement.lang = normalized;
	}
};

syncLanguage(i18n.resolvedLanguage ?? i18n.language);

i18n.on("languageChanged", language => {
	syncLanguage(language);
});

export const formatDateTime = (value: string | number | Date) => {
	return new Intl.DateTimeFormat(getDateTimeLocale(i18n.resolvedLanguage ?? i18n.language), {
		dateStyle: "medium",
		timeStyle: "short"
	}).format(new Date(value));
};

export const formatDate = (value: string | number | Date) => {
	return new Intl.DateTimeFormat(getDateTimeLocale(i18n.resolvedLanguage ?? i18n.language), {
		dateStyle: "medium"
	}).format(new Date(value));
};

export { i18n };
