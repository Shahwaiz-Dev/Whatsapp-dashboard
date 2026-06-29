import { cookies } from "next/headers";
import { defaultLocale, isValidLocale, type Locale } from "./index";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value;
  return isValidLocale(locale) ? locale : defaultLocale;
}
