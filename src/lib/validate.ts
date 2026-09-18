import type { GuideDoc } from "./types";

export function validGuideDoc(doc: unknown): doc is GuideDoc {
  return (
    !!doc &&
    typeof doc === "object" &&
    Array.isArray((doc as GuideDoc).groups) &&
    (doc as GuideDoc).groups.every(
      (g) => g && typeof g === "object" && Array.isArray(g.sections)
    )
  );
}