import type { Metadata } from "next";
import { normalizeRules } from "@/lib/content";
import { loadRow } from "@/lib/supabase";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/translation";
import { TranslatedGuideViewer } from "@/components/TranslatedGuideViewer";

export const metadata: Metadata = {
  title: "Alliance Rules — Phoenix of War 973",
  description:
    "Phoenix of War 973 — the alliance code of conduct: what we expect from every member, and how we handle problems.",
};

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const row = await loadRow<Record<string, unknown>>("rules");
  const doc = normalizeRules(row?.doc ?? null);
  const locale = await getLocale();
  const { source, translated, locale: translatedLocale } = await localized("rules", doc, locale);
  return (
    <TranslatedGuideViewer
      source={source}
      translated={translated}
      translatedLocale={translatedLocale}
      target="rules"
    />
  );
}
