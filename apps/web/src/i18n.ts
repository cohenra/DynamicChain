import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import heTranslation from './locales/he/translation.json';
import enTranslation from './locales/en/translation.json';
import ruTranslation from './locales/ru/translation.json';
import arTranslation from './locales/ar/translation.json';

// Configure i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources: {
      he: { translation: heTranslation },
      en: { translation: enTranslation },
      ru: { translation: ruTranslation },
      ar: { translation: arTranslation },
    },
    fallbackLng: 'he', // Default language
    lng: 'he', // Initial language
    debug: false, // Set to true for debugging
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

// Update HTML direction attribute based on language
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'he' || lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// Set initial direction
const initialLng = i18n.language || 'he';
const initialDir = initialLng === 'he' || initialLng === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = initialLng;

export default i18n;
