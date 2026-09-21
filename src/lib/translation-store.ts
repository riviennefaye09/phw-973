import { mkdir, readFile, writeFile, access } from "fs/promises";
import path from "path";
import { serverClient } from "./supabase";
import type { LocaleCode } from "./i18n/locales";

// One JSON file per locale under data/translations/, e.g. th.json. Each file
// maps English source strings to their translation. Existing entries are kept
// when site content changes — only new or edited English strings are translated
// later. When Supabase is configured the same file is mirrored to Storage so
// maps survive on serverless hosts with a read-only filesystem.

export type LocaleMapFile = {
  locale: string;
  updatedAt: string;
  strings: Record<string, string>;
};

const DIR = path.join(process.cwd(), "data", "translations");
const BUCKET = "translations";

const locks = new Map<string, Promise<unknown>>();

// Parsed string maps are reused across requests (every page render and every
// /api/translate call loads them), so keep one cached copy per locale. Keyed by
// promise so parallel first calls share a single read; maps only ever grow, and
// mergeIntoLocaleMap resets the entry after writing a new version.
const mapMemory = new Map<LocaleCode, Promise<Record<string, string>>>();

function withLock<T>(locale: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(locale) || Promise.resolve();
  const run = prev.then(fn, fn);
  locks.set(locale, run.catch(() => {}));
  return run;
}

function mapPath(locale: string) {
  return path.join(DIR, `${locale}.json`);
}

async function ensureDir() {
  try {
    await mkdir(DIR, { recursive: true });
  } catch {
    // Ignore read-only filesystem errors on serverless platforms (e.g. Vercel)
  }
}

async function writeToDisk(locale: LocaleCode, body: string) {
  try {
    await ensureDir();
    await writeFile(mapPath(locale), body, "utf8");
  } catch {
    // Silently ignore EROFS (read-only file system) on serverless environments;
    // translations will persist via Supabase Storage / Postgres.
  }
}

async function readFromDisk(locale: LocaleCode): Promise<LocaleMapFile | null> {
  try {
    const raw = await readFile(mapPath(locale), "utf8");
    return JSON.parse(raw) as LocaleMapFile;
  } catch {
    return null;
  }
}

async function readFromStorage(locale: LocaleCode): Promise<LocaleMapFile | null> {
  const sb = serverClient();
  if (!sb) return null;
  const { data, error } = await sb.storage.from(BUCKET).download(`${locale}.json`);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as LocaleMapFile;
  } catch {
    return null;
  }
}

async function writeToStorage(locale: LocaleCode, body: string) {
  const sb = serverClient();
  if (!sb) return;
  await sb.storage.from(BUCKET).upload(`${locale}.json`, body, {
    upsert: true,
    contentType: "application/json",
  });
}

export async function localeMapExists(locale: LocaleCode): Promise<boolean> {
  if (locale === "en") return true;
  try {
    await access(mapPath(locale));
    return true;
  } catch {
    const remote = await readFromStorage(locale);
    return remote !== null;
  }
}

export async function loadLocaleMap(locale: LocaleCode): Promise<Record<string, string>> {
  if (locale === "en") return {};
  let p = mapMemory.get(locale);
  if (!p) {
    p = loadLocaleMapFromDiskOrStorage(locale);
    mapMemory.set(locale, p);
  }
  return p;
}

// The actual read; kept separate so its result can go through the memory cache.
async function loadLocaleMapFromDiskOrStorage(locale: LocaleCode): Promise<Record<string, string>> {
  const local = await readFromDisk(locale);
  if (local?.strings) return local.strings;
  const remote = await readFromStorage(locale);
  if (remote?.strings) {
    writeToDisk(locale, JSON.stringify(remote, null, 2));
    return remote.strings;
  }
  return {};
}

export async function saveLocaleMap(
  locale: LocaleCode,
  strings: Record<string, string>
): Promise<void> {
  if (locale === "en") return;
  const payload: LocaleMapFile = {
    locale,
    updatedAt: new Date().toISOString(),
    strings,
  };
  const body = JSON.stringify(payload, null, 2);
  await writeToDisk(locale, body);
  await writeToStorage(locale, body);
}

export async function ensureLocaleMapFile(locale: LocaleCode): Promise<void> {
  if (locale === "en") return;
  if (await localeMapExists(locale)) return;
  await saveLocaleMap(locale, {});
}

export async function mergeIntoLocaleMap(
  locale: LocaleCode,
  additions: Record<string, string>
): Promise<Record<string, string>> {
  return withLock(locale, async () => {
    const current = await loadLocaleMap(locale);
    const merged = { ...current, ...additions };
    await saveLocaleMap(locale, merged);
    mapMemory.set(locale, Promise.resolve(merged));
    return merged;
  });
}

