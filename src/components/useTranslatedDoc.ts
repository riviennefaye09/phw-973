"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";

type Scope = "guide" | "home" | "rules";

// Translated documents are cached in three layers so a language switch is
// instant once a translation has been seen before:
//   1. a module map — survives route changes within this tab;
//   2. localStorage — survives reloads and later visits, scoped per source hash
//      so a translation built from older content is never reused;
//   3. the server — the page render already ships the matching translation in
//      its props after a language switch (used instantly), and unused locales
//      are fetched from /api/translate.
const memCache = new Map<string, unknown>();
const LS_PREFIX = "phw:tr:v1:";
const LS_PER_SCOPE = 8; // keep only the most recent locales per document

// Cheap fingerprint of the English source.
function sourceHash(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function memKey(scope: Scope, locale: string, hash: string) {
  return `${scope}:${locale}:${hash}`;
}

/* -------- localStorage layer -------- */

type PersistEntry = { hash: string; doc: unknown };
type PersistStore = Record<string, PersistEntry>;

function readStore(scope: Scope): PersistStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + scope);
    const obj = raw ? (JSON.parse(raw) as unknown) : null;
    return obj && typeof obj === "object" ? (obj as PersistStore) : {};
  } catch {
    return {};
  }
}

function writeStore(scope: Scope, store: PersistStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_PREFIX + scope, JSON.stringify(store));
  } catch {
    // Private mode or a full quota: the in-memory copy still works this session.
  }
}

function persistGet(scope: Scope, locale: string, hash: string): unknown | undefined {
  const e = readStore(scope)[locale];
  return e && e.hash === hash ? e.doc : undefined;
}

function persistSet(scope: Scope, locale: string, hash: string, doc: unknown) {
  const store = readStore(scope);
  store[locale] = { hash, doc };
  const locales = Object.keys(store);
  if (locales.length > LS_PER_SCOPE) {
    for (const l of locales.slice(0, locales.length - LS_PER_SCOPE)) delete store[l];
  }
  writeStore(scope, store);
}

/* -------- /api/translate, deduped per cache key -------- */

const inflight = new Map<string, Promise<unknown | null>>();

function fetchTranslation(scope: Scope, locale: string, key: string): Promise<unknown | null> {
  let p = inflight.get(key);
  if (!p) {
    p = fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, locale }),
    })
      .then((r) => r.json())
      .then((json) => (json?.status === "ready" && json.doc ? json.doc : null))
      .catch(() => null)
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

// Keeps a content document in sync with the visitor's language. The server
// hands us the English source always and, when it has the translation for the
// current locale, `initial` together with the locale it was built for
// (`initialLocale`). As soon as the two match, the translation is shown
// immediately — no round trip. Anything not cached yet is fetched via
// /api/translate in the background; the page stays in English meanwhile.
export function useTranslatedDoc<T>(
  scope: Scope,
  source: T,
  initial: T | null,
  initialLocale?: string | null
): { doc: T; loading: boolean } {
  const { locale } = useLocale();
  const hash = useMemo(() => sourceHash(source), [source]);

  const pick = (): T => {
    if (locale === "en") return source;
    const known = memCache.get(memKey(scope, locale, hash)) as T | undefined;
    if (known !== undefined) return known;
    if (initialLocale === locale && initial) return initial;
    const saved = persistGet(scope, locale, hash) as T | undefined;
    if (saved !== undefined) return saved;
    return source;
  };

  const [doc, setDoc] = useState<T>(pick);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (locale === "en") {
      setDoc(source);
      setLoading(false);
      return;
    }

    const key = memKey(scope, locale, hash);

    const known = memCache.get(key) as T | undefined;
    if (known !== undefined) {
      setDoc(known);
      setLoading(false);
      return;
    }

    const served = initialLocale === locale ? initial : null;
    if (served) {
      memCache.set(key, served);
      persistSet(scope, locale, hash, served);
      setDoc(served);
      setLoading(false);
      return;
    }

    const saved = persistGet(scope, locale, hash) as T | undefined;
    if (saved !== undefined) {
      memCache.set(key, saved);
      setDoc(saved);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    fetchTranslation(scope, locale, key).then((translated) => {
      if (!alive) return;
      setLoading(false);
      if (translated) {
        memCache.set(key, translated);
        persistSet(scope, locale, hash, translated);
        setDoc(translated as T);
      }
    });

    return () => {
      alive = false;
    };
  }, [scope, locale, hash, source, initial, initialLocale]);

  return { doc, loading };
}