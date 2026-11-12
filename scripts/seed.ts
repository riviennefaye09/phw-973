/* One-time setup script: push the guide document and the default home page into
   Supabase so the site has real content before the first manual edit.

   Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and the schema from
   supabase/schema.sql to be in place. */

import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_HOME, normalize } from "../src/lib/content";
import { validGuideDoc } from "../src/lib/validate";

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const force = process.argv.includes("--force");

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  process.exit(1);
}

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// A row created by schema.sql is `{}` (or a guide with no groups). Its version is
// 1, so version alone is not enough to tell "has real content" from "never
// seeded". Treat structurally empty documents as empty.
function isEmptyDoc(doc: unknown): boolean {
  if (!doc || typeof doc !== "object") return true;
  const o = doc as Record<string, unknown>;
  if (Array.isArray(o.groups)) return o.groups.length === 0;
  if (Array.isArray(o.items)) return o.items.length === 0;
  if (Array.isArray(o.events)) return o.events.length === 0;
  return Object.keys(o).length === 0;
}

async function currentRow(
  table: string
): Promise<{ version: number; doc: unknown } | null> {
  const { data, error } = await client
    .from(table)
    .select("version, doc")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { version: data.version, doc: data.doc };
}

async function seed(table: string, doc: unknown) {
  const row = await currentRow(table);
  if (row && !force && !isEmptyDoc(row.doc)) {
    console.log(`${table}: already has content (version ${row.version}), skipping. Use --force to overwrite.`);
    return;
  }
  const { error } = await client
    .from(table)
    .upsert({ id: 1, doc, version: 1, updated_at: new Date().toISOString() });
  if (error) throw error;
  console.log(`${table}: seeded (version set to 1).`);
}

async function main() {
  const guideRaw = JSON.parse(
    readFileSync(resolve(process.cwd(), "content/guide.json"), "utf8")
  );
  const guide = normalize(guideRaw);
  if (!validGuideDoc(guide)) throw new Error("content/guide.json is not a valid guide document");

  await seed("guide", guide);
  await seed("home", DEFAULT_HOME);
  console.log("done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});