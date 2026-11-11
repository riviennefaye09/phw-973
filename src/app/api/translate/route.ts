import { normalizeLocale, type LocaleCode } from "@/lib/i18n/locales";
import { getLocale } from "@/lib/i18n/server";
import { ensureTranslation, loadSource, type Scope } from "@/lib/translation";

export const dynamic = "force-dynamic";

const SCOPES: Scope[] = ["guide", "rules"];

// Generate (or fetch from cache) the translation of one content document for
// the visitor's current language. Called by the client after the page has
// already rendered in English, so the swap happens in place with no spinner.
export async function POST(req: Request) {
  let scope: Scope = "guide";
  let locale: LocaleCode = await getLocale();

  try {
    const body = (await req.json()) as { scope?: string; locale?: string };
    if (body?.scope && (SCOPES as string[]).includes(body.scope)) {
      scope = body.scope as Scope;
    }
    if (body?.locale) {
      locale = normalizeLocale(body.locale);
    }
  } catch {
    // Fall back to cookie locale
  }

  const source = await loadSource(scope);
  if (!source) return Response.json({ status: "unavailable" });

  const result = await ensureTranslation(scope, source, locale);
  if (result.status === "ready") {
    return Response.json({ status: "ready", doc: result.doc });
  }
  return Response.json({ status: result.status });
}

