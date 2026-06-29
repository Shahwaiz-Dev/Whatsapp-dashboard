"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  dateLocales,
  defaultLocale,
  isValidLocale,
  translate,
  type Locale,
  type TranslationKey,
} from "@/lib/i18n";

interface LocaleContextValue {
  locale: Locale;
  dateLocale: (typeof dateLocales)[Locale];
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  return isValidLocale(match?.[1]) ? match[1] : defaultLocale;
}

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const cookieLocale = readLocaleCookie();
    if (cookieLocale !== locale) {
      setLocaleState(cookieLocale);
    }
    document.documentElement.lang = cookieLocale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      document.cookie = `locale=${next};path=/;max-age=31536000;SameSite=Lax`;
      document.documentElement.lang = next;
      setLocaleState(next);
      router.refresh();
    },
    [router]
  );

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      dateLocale: dateLocales[locale],
      setLocale,
      t,
    }),
    [locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
