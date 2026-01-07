import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from '../locales/en.json';
import zh from '../locales/zh.json';

type Language = 'en' | 'zh';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  en,
  zh,
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('language');
      return (saved === 'en' || saved === 'zh') ? saved : 'en';
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('language', language);
    }
  }, [language]);

  const t = (path: string) => {
    const keys = path.split('.');
    let current: any = translations[language];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key as keyof typeof current];
      } else {
        console.warn(`Translation key not found: ${path}`);
        return path;
      }
    }

    return current as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
