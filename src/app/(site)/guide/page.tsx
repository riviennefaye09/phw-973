import type { Metadata } from "next";
import { normalize } from "@/lib/content";
import { loadRow } from "@/lib/supabase";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/translation";
import { TranslatedGuideViewer } from "@/components/TranslatedGuideViewer";

export const metadata: Metadata = {
  title: "Guide — Phoenix of War 973",
  description:
    "Phoenix of War 973 — complete guide: features, Nien, the map, policies, skills and heroes.",
  openGraph: {
    title: "Guide — Phoenix of War 973",
    description:
      "Complete guide: Nien, the map, season policies, season skills and season heroes.",
  },
};

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const row = await loadRow<Record<string, unknown>>("guide");
  const doc = normalize(row?.doc ?? null);
  const locale = await getLocale();
  const { source, translated, locale: translatedLocale } = await localized("guide", doc, locale);
  return (
    <TranslatedGuideViewer
      source={source}
      translated={translated}
      translatedLocale={translatedLocale}
      target="guide"
    />
  );
}

