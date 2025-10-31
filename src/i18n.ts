// src/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Chúng ta sẽ tạo các tệp này ở bước tiếp theo
import translationEN from './locales/en/translation.json';
import translationVI from './locales/vi/translation.json';

const resources = {
  en: {
    translation: translationEN,
  },
  vi: {
    translation: translationVI,
  },
};

i18n
  .use(initReactI18next) // Chuyển i18n instance xuống react-i18next
  .init({
    resources,
    lng: localStorage.getItem('app-language') ? JSON.parse(localStorage.getItem('app-language')!) : 'vi', // Ngôn ngữ mặc định
    fallbackLng: 'vi', // Ngôn ngữ dự phòng
    interpolation: {
      escapeValue: false, // React đã tự chống XSS
    },
  });

export default i18n;