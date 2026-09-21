import { normalize, normalizeHome, normalizeRules } from "./content";
import { loadRow, serverClient } from "./supabase";
import { LOCALES, type LocaleCode } from "./i18n/locales";
import {
  contentHash,
  mapTranslations,
  collectTranslatableStrings,
  missingFromMap,
  applyTranslationMap,
} from "./translate-walk";
import { loadLocaleMap, mergeIntoLocaleMap } from "./translation-store";

// Server-only: on-demand content translation with the Gemini API, cached in the
// `translations` table and local/storage JSON maps (`data/translations/[locale].json`).
// The public pages and the API route use this; it must never be imported from a client
// component (it reads the service-role client).
//
// The design keeps Gemini usage tiny: a document is translated once per locale
// and then served from local JSON maps / Postgres to everyone, so cost scales with
// (documents x languages actually used), not with traffic.

export type Scope = "guide" | "home" | "rules";

const REF = "root";

// Built translated documents, keyed per scope+locale and only reused while the
// source hash matches. This makes repeat requests for a cached language a
// straight map/DB hit instead of re-walking the whole document each time.
const docMemo = new Map<string, { hash: string; doc: unknown }>();
const memoKey = (scope: Scope, locale: LocaleCode) => `${scope}:${locale}`;

// Postgres rows written by `warm` must only be saved once per instance, or a
// busy server would fire an upsert on every request. Kept until the source
// hash changes (see warm()).
const warmSaving = new Set<string>();

/* -------- Gemini -------- */

// Serialise API calls so a single server instance never bursts past the free
// tier's requests-per-minute limit.
let chain: Promise<unknown> = Promise.resolve();
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
}

const CHUNK_CHARS = Number(process.env.TRANSLATE_CHUNK_CHARS || 5000);

async function gemini(strings: string[], langName: string): Promise<string[]> {
  if (strings.length === 1) {
    try {
      return await geminiOnce(strings, langName);
    } catch {
      // Retrying one string is pointless; leave it untranslated rather than
      // failing the whole document.
      return [""];
    }
  }

  // Large chunks occasionally get truncated (a 5000-char English block can
  // exceed the output budget once escaped JSON is added). When a chunk keeps
  // failing, halve it and recurse so progress is never lost.
  let result: string[];
  try {
    result = await geminiOnce(strings, langName);
  } catch {
    const mid = Math.ceil(strings.length / 2);
    const [left, right] = await Promise.all([
      gemini(strings.slice(0, mid), langName),
      gemini(strings.slice(mid), langName),
    ]);
    result = [...left, ...right];
  }
  return result;
}

async function geminiOnce(strings: string[], langName: string): Promise<string[]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const base =
    process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
  const url =
    `${base}/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(key);

  const body = {
    systemInstruction: {
      parts: [
        {
          text:
            `You translate the content of a mobile-game alliance website into ${langName}. ` +
            `Rules: translate only human-readable text; keep HTML tags, attributes and entities exactly as they are; ` +
            `keep placeholders such as {name} unchanged; do not translate proper nouns, the alliance name "Phoenix of War 973", the word "Discord", URLs or code; ` +
            `never add, remove, merge or reorder array entries; if a string is already in ${langName}, return it unchanged. ` +
            `Reply with only JSON of the shape {"translations":["..."]} containing the same number of strings, in the same order.`,
        },
      ],
    },
    contents: [{ role: "user", parts: [{ text: JSON.stringify({ strings }) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
      maxOutputTokens: 16384,
    },
  };

  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
      lastError = new Error(`Gemini ${res.status}`);
      await new Promise((r) => setTimeout(r, Math.min(wait, 15000)));
      continue;
    }
    if (!res.ok) {
      throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    let parsed: { translations?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      lastError = new Error("Gemini returned non-JSON output");
      continue;
    }
    const arr = parsed.translations;
    if (!Array.isArray(arr) || arr.length !== strings.length) {
      lastError = new Error("Gemini returned an unexpected number of strings");
      continue;
    }
    return arr.map((x) => (typeof x === "string" ? x : ""));
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini request failed");
}

async function translateDoc(source: unknown, locale: LocaleCode): Promise<unknown> {
  const langName = LOCALES.find((l) => l.code === locale)?.en || "English";
  return mapTranslations(
    source,
    langName,
    (chunk, lang) => serialize(() => gemini(chunk, lang)),
    CHUNK_CHARS
  );
}

/* -------- cache -------- */

export async function getCached(
  scope: Scope,
  locale: LocaleCode,
  hash: string,
  source?: unknown
): Promise<unknown | null> {
  // 1. This process has already built this translation — no walk, no database.
  const mk = memoKey(scope, locale);
  const mem = docMemo.get(mk);
  if (mem && mem.hash === hash) return mem.doc;

  // 2. Postgres holds the finished document for this source hash: one indexed
  //    row beats re-walking the content. A row with a stale hash is ignored so
  //    the document is rebuilt (and re-warmed) from the current source.
  const sb = serverClient();
  if (sb) {
    const { data, error } = await sb
      .from("translations")
      .select("payload, source_hash")
      .eq("scope", scope)
      .eq("ref", REF)
      .eq("locale", locale)
      .maybeSingle();
    if (!error && data && data.source_hash === hash) {
      docMemo.set(mk, { hash, doc: data.payload });
      return data.payload;
    }
  }

  // 3. Rebuild from the per-locale JSON map when it covers the whole document.
  //    This also works without Postgres and warms path 2 so later requests on
  //    any instance are a single row lookup.
  if (source) {
    const localeMap = await loadLocaleMap(locale);
    const strings = collectTranslatableStrings(source);
    if (strings.length > 0) {
      const missing = missingFromMap(strings, localeMap);
      if (missing.length === 0) {
        const doc = applyTranslationMap(source, localeMap);
        docMemo.set(mk, { hash, doc });
        warm(scope, locale, hash, doc);
        return doc;
      }
    }
  }

  return null;
}

// Best-effort write of a map-rebuilt translation into Postgres so other server
// instances (and future requests here) hit the single-row path 2 above. Fires
// at most once per (scope, locale, hash) per process.
function warm(scope: Scope, locale: LocaleCode, hash: string, doc: unknown) {
  const k = `${scope}:${locale}:${hash}`;
  if (warmSaving.has(k)) return;
  warmSaving.add(k);
  // Best-effort: without the translations table (a fresh environment that has
  // not run schema.sql) the write fails; that must never leak an unhandled
  // rejection, it simply means path 2 stays unused this instance.
  void save(scope, locale, hash, doc)
    .catch(() => {})
    .finally(() => warmSaving.delete(k));
}

async function save(scope: Scope, locale: LocaleCode, hash: string, payload: unknown) {
  const sb = serverClient();
  if (!sb) return;
  await sb.from("translations").upsert(
    {
      scope,
      ref: REF,
      locale,
      source_hash: hash,
      payload,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "scope,ref,locale" }
  );
}

// Returns false once today's API-call budget is spent. If the usage table has
// not been created yet, do not block (the translation itself will simply fail
// gracefully if the schema is missing).
async function consumeBudget(): Promise<boolean> {
  const sb = serverClient();
  if (!sb) return false;
  const max = Number(process.env.TRANSLATE_DAILY_MAX || 800);
  const { data, error } = await sb.rpc("bump_translation_usage");
  if (error) return true;
  const calls = Number(data);
  return !Number.isFinite(calls) || calls <= max;
}

/* -------- public surface -------- */

export type TranslationResult =
  | { status: "ready"; doc: unknown }
  | { status: "unavailable" }
  | { status: "same" };

// In-process de-duplication: if ten requests want the same missing translation
// at once, only one Gemini run happens and the rest await it.
const inflight = new Map<string, Promise<TranslationResult>>();

export async function ensureTranslation(
  scope: Scope,
  source: unknown,
  locale: LocaleCode
): Promise<TranslationResult> {
  if (locale === "en") return { status: "same" };

  const hash = contentHash(source);
  const cached = await getCached(scope, locale, hash, source);
  if (cached) return { status: "ready", doc: cached };

  if (!process.env.GEMINI_API_KEY) return { status: "unavailable" };

  const key = `${scope}:${locale}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<TranslationResult> => {
    try {
      if (!(await consumeBudget())) return { status: "unavailable" };

      const langName = LOCALES.find((l) => l.code === locale)?.en || "English";
      const localeMap = await loadLocaleMap(locale);
      const strings = collectTranslatableStrings(source);
      const missing = missingFromMap(strings, localeMap);

      let updatedMap = { ...localeMap };

      if (missing.length > 0) {
        const additions: Record<string, string> = {};
        let i = 0;
        while (i < missing.length) {
          const chunk: string[] = [];
          let size = 0;
          while (i < missing.length) {
            const s = missing[i];
            if (chunk.length && size + s.length > CHUNK_CHARS) break;
            chunk.push(s);
            size += s.length;
            i++;
          }
          const out = await serialize(() => gemini(chunk, langName));
          for (let j = 0; j < chunk.length; j++) {
            if (out[j]) additions[chunk[j]] = out[j];
          }
        }
        updatedMap = await mergeIntoLocaleMap(locale, additions);
      }

      const doc = applyTranslationMap(source, updatedMap);
      await save(scope, locale, hash, doc);
      return { status: "ready", doc };
    } catch (e) {
      console.error("[translation] failed:", e);
      return { status: "unavailable" };
    }
  })().finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}

// What a server page needs: the English source, plus the cached translation for
// the visitor's locale if one already exists. If it does not, the client asks
// /api/translate for it after the page has rendered (so nothing ever blocks).
export async function localized<T>(
  scope: Scope,
  source: T,
  locale: LocaleCode
): Promise<{ source: T; translated: T | null; locale: LocaleCode }> {
  if (locale === "en") return { source, translated: null, locale };
  const cached = await getCached(scope, locale, contentHash(source), source);
  return { source, translated: (cached as T) ?? null, locale };
}

// Load and normalise a content document for the translation route.
export async function loadSource(scope: Scope): Promise<unknown | null> {
  const row = await loadRow<Record<string, unknown>>(scope);
  if (scope === "home") return normalizeHome(row?.doc ?? null);
  if (scope === "rules") return normalizeRules(row?.doc ?? null);
  return normalize(row?.doc ?? null);
}

