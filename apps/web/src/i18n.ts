import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import heTranslation from './locales/he/translation.json';
import ruTranslation from './locales/ru/translation.json';
import arTranslation from './locales/ar/translation.json';

const resources = {
  en: { translation: enTranslation },
  he: { translation: heTranslation },
  ru: { translation: ruTranslation },
  ar: { translation: arTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // שפת ברירת מחדל אם אין זיהוי
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// --- התיקון הקריטי: עדכון הכיוון ברמת ה-HTML ---
i18n.on('languageChanged', (lng) => {
  const dir = ['he', 'ar'].includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

// הפעלה ראשונית כדי לוודא כיוון נכון בטעינה
const initialDir = ['he', 'ar'].includes(i18n.language) ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;

export default i18n;