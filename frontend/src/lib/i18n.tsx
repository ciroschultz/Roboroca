'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

import ptBR from '@/locales/pt-BR.json';
import enUS from '@/locales/en-US.json';
import es from '@/locales/es.json';

export type Locale = 'pt-BR' | 'en-US' | 'es';

const locales: Record<Locale, Record<string, any>> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es': es,
};

export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português (BR)',
  'en-US': 'English',
  'es': 'Español',
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'pt-BR',
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('roboroca_locale') as Locale) || 'pt-BR';
    }
    return 'pt-BR';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('roboroca_locale', newLocale);
    }
  }, []);

  const t = useCallback((key: string): string => {
    const parts = key.split('.');
    let value: any = locales[locale];
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        // Fallback to pt-BR
        let fallback: any = locales['pt-BR'];
        for (const p of parts) {
          fallback = fallback?.[p];
        }
        return typeof fallback === 'string' ? fallback : key;
      }
    }
    return typeof value === 'string' ? value : key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useTranslation() {
  const { t } = useContext(I18nContext);
  return t;
}
