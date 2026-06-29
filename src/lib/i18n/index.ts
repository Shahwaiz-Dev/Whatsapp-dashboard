import { en, type Dictionary } from "./locales/en";
import { it } from "./locales/it";
import { enUS, it as itDateFns } from "date-fns/locale";

export type Locale = "en" | "it";

export const locales: Locale[] = ["en", "it"];
export const defaultLocale: Locale = "it";

const dictionaries: Record<Locale, Dictionary> = { en, it };

export const dateLocales = {
  en: enUS,
  it: itDateFns,
} as const;

export function isValidLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "it";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in vars ? String(vars[key]) : `{${key}}`
  );
}

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<Dictionary>;

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const parts = key.split(".");
  let value: unknown = getDictionary(locale);
  for (const part of parts) {
    value = (value as Record<string, unknown>)?.[part];
  }
  if (typeof value !== "string") return key;
  return interpolate(value, vars);
}
