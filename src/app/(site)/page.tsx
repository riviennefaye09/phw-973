import type { Metadata } from "next";
import { normalizeHome } from "@/lib/content";
import { loadRow } from "@/lib/supabase";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/translation";
import { TranslatedHome } from "@/components/TranslatedHome";

export const metadata: Metadata = {
  title: "Phoenix of War 973 — PHW",
  description:
    "Phoenix of War 973 (PHW) — alliance family hub: guides, rules, and everything members need in one place.",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const row = await loadRow<Record<string, unknown>>("home");
  const home = normalizeHome(row?.doc ?? null);
  const locale = await getLocale();
  const { source, translated, locale: translatedLocale } = await localized("home", home, locale);
  return <TranslatedHome source={source} translated={translated} translatedLocale={translatedLocale} />;
}
