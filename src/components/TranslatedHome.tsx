"use client";

import type { HomeDoc } from "@/lib/types";
import HomeView from "./HomeView";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedHome({
  source,
  translated,
  translatedLocale,
}: {
  source: HomeDoc;
  translated: HomeDoc | null;
  translatedLocale: string | null;
}) {
  const { doc, loading } = useTranslatedDoc<HomeDoc>("home", source, translated, translatedLocale);
  return (
    <>
      <HomeView home={doc} />
      <TranslateProgress active={loading} />
    </>
  );
}
