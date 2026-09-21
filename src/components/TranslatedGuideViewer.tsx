"use client";

import type { GuideDoc } from "@/lib/types";
import GuideViewer from "./GuideViewer";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedGuideViewer({
  source,
  translated,
  translatedLocale,
  target = "guide",
}: {
  source: GuideDoc;
  translated: GuideDoc | null;
  translatedLocale: string | null;
  target?: "guide" | "rules";
}) {
  const { doc, loading } = useTranslatedDoc<GuideDoc>(target, source, translated, translatedLocale);
  const defaultEyebrow = target === "rules" ? "Alliance" : "Guide";
  const defaultTitle = target === "rules" ? "Alliance rules" : "Guide";

  const withPage: GuideDoc = {
    ...doc,
    page: {
      eyebrow: doc.page?.eyebrow || defaultEyebrow,
      title: doc.page?.title || defaultTitle,
    },
  };
  return (
    <>
      <GuideViewer doc={withPage} />
      <TranslateProgress active={loading} />
    </>
  );
}
