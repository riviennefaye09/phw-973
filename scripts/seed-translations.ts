/* One-time/prompt-able script: pre-warm the shared `translations` table with
   every locale whose per-language JSON map already covers a whole document.
   This mirrors exactly what the first live request would rebuild (getCached,
   then the Postgres upsert), minus the network round trip, so the very first
   visitor in any pre-warmed language gets the single-row fast path.

     npm run seed:translations

   Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example). */

import { loadEnvConfig } from "@next/env";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  applyTranslationMap,
  collectTranslatableStrings,
  contentHash,
  missingFromMap,
} from "../src/lib/translate-walk";
import { loadLocaleMap } from "../src/lib/translation-store";
import { loadSource } from "../src/lib/translation";
import { serverClient } from "../src/lib/supabase";
import type { LocaleCode } from "../src/lib/i18n/locales";

loadEnvConfig(process.cwd());

const REF = "root"; // must match translation.ts

function mapLocales(): LocaleCode[] {
  const dir = join(process.cwd(), "data", "translations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, "") as LocaleCode)
    .sort();
}

async function main() {
  const sb = serverClient();
  if (!sb) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
    process.exit(1);
  }

  const scopes = ["guide", "home", "rules"] as const;
  const locales = mapLocales();
  let wrote = 0;
  let skipped = 0;

  for (const scope of scopes) {
    const source = await loadSource(scope);
    if (!source) {
      console.log(`${scope}: no source document, skipping.`);
      continue;
    }
    const strings = collectTranslatableStrings(source);
    const hash = contentHash(source);
    console.log(`${scope}: ${strings.length} translatable strings (hash ${hash}).`);

    for (const locale of locales) {
      const map = await loadLocaleMap(locale);
      const missing = missingFromMap(strings, map);
      if (missing.length > 0) {
        skipped++;
        console.log(`  ${locale}: skipped (${missing.length} strings missing).`);
        continue;
      }
      const payload = applyTranslationMap(source, map);
      const { error } = await sb
        .from("translations")
        .upsert(
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
      if (error) throw error;
      wrote++;
      console.log(`  ${locale}: wrote (${strings.length} strings).`);
    }
  }

  console.log(`done. Wrote ${wrote} translations, skipped ${skipped} (incomplete coverage).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});