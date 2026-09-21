/* One-off backfill: translate every document (guide, home, rules) into every
   enabled locale so the first real visitor in any language gets the fast path
   instead of a slow first request.

   This calls the exact same production path as a page request (ensureTranslation:
   chunk -> Gemini -> merge into data/translations/[locale].json), one locale at
   a time, serialised so the free-tier API is never burst. When the `translations`
   table exists it then writes/shared-caches the finished document there too.

     npm run backfill:translations

   Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and GEMINI_API_KEY. */

import { loadEnvConfig } from "@next/env";
import { getCached, ensureTranslation, loadSource } from "../src/lib/translation";
import { contentHash } from "../src/lib/translate-walk";
import { LOCALES } from "../src/lib/i18n/locales";
import { serverClient } from "../src/lib/supabase";

loadEnvConfig(process.cwd());

const REF = "root"; // must match translation.ts

async function main() {
  const sb = serverClient();
  if (!sb) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY (see .env.example).");
    process.exit(1);
  }

  const scopes = ["guide", "home", "rules"] as const;
  const locales = LOCALES.filter((l) => l.code !== "en");
  const started = Date.now();
  let ready = 0;
  let skipped = 0;
  let rowsWritten = 0;

  const { error: firstError } = await sb
    .from("translations")
    .select("scope")
    .limit(1);
  const tableMissing = !!firstError;

  for (const scope of scopes) {
    const source = await loadSource(scope);
    if (!source) {
      console.log(`\n${scope}: no source document, skipping.`);
      continue;
    }
    const hash = contentHash(source);
    console.log(`\n=== ${scope} (hash ${hash}) ===`);

    for (const loc of locales) {
      const result = await ensureTranslation(scope, source, loc.code);
      if (result.status !== "ready") {
        skipped++;
        console.log(`  ${loc.code}: ${result.status}`);
        continue;
      }
      ready++;

      const doc = await getCached(scope, loc.code, hash, source);
      if (!doc) {
        skipped++;
        console.log(`  ${loc.code}: rebuilt but no cached document found`);
        continue;
      }

      if (tableMissing) {
        console.log(`  ${loc.code}: translated (row not cached - translations table missing)`);
      } else {
        const { error } = await sb
          .from("translations")
          .upsert(
            {
              scope,
              ref: REF,
              locale: loc.code,
              source_hash: hash,
              payload: doc,
              generated_at: new Date().toISOString(),
            },
            { onConflict: "scope,ref,locale" }
          );
        if (error) {
          console.log(`  ${loc.code}: translated (row write failed: ${error.message})`);
        } else {
          rowsWritten++;
          console.log(`  ${loc.code}: translated + row cached`);
        }
      }
    }
  }

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(
    `\ndone in ${mins} min. ${ready} translations ready, ${rowsWritten} rows cached, ${skipped} skipped.`
  );
  if (tableMissing) {
    console.log(
      "Note: the translations table does not exist yet, so nothing was shared via Postgres.\n" +
        "Apply supabase/schema.sql in the Supabase SQL editor, then re-run this script to cache the rows."
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});