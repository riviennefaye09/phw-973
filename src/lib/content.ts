import type { Block, Group, GuideDoc, HomeDoc, Section } from "./types";

/* -------- slug -------- */

export function slug(s: string) {
  return (
    (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "section"
  );
}

/* -------- guide document -------- */

// Guide documents used to be a flat list of sections. Anything still in that
// shape is folded into one group so old files keep working untouched.
export function normalizeDoc(
  raw: unknown,
  fallback: { id: string; title: string }
): GuideDoc {
  const src = ((raw || {}) as Record<string, unknown>);
  const doc = src as unknown as GuideDoc;
  if (!Array.isArray(doc.groups)) {
    const page = (src.page as { intro?: string } | null) || {};
    doc.groups = [
      {
        id: fallback.id,
        title: fallback.title,
        intro: page.intro || "",
        sections: (src.sections as Section[] | undefined) || [],
      },
    ];
    delete src.sections;
    delete page.intro;
  }
  for (const g of doc.groups) {
    g.sections = g.sections || [];
    for (const s of g.sections) s.blocks = s.blocks || [];
  }
  // Pinned topics always lead the list (their first page); the rest keep their
  // natural order. Stable, so documents without any pinned topic are untouched.
  pinSort(doc.groups);
  return doc;
}

// Pinned groups stay at the top of the topic list (first page) no matter when
// they were added; everything else keeps its natural order.
export function pinSort<T extends { pinned?: boolean }>(items: T[]): T[] {
  return items.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
}

// The guide and the alliance-rules page share this document shape, so the same
// editor and renderer serve both.
export function normalize(raw: unknown): GuideDoc {
  return normalizeDoc(raw, { id: "season-3", title: "Guide Season 3" });
}

export function normalizeRules(raw: unknown): GuideDoc {
  return normalizeDoc(raw, { id: "rules", title: "Alliance Rules" });
}

// Which main topic owns a section? Returns -1 for "not found" or "unknown".
export function groupOfSection(doc: GuideDoc, sectionId: string) {
  for (let i = 0; i < doc.groups.length; i++) {
    const g = doc.groups[i];
    if (g.id === sectionId) return i;
    for (const s of g.sections) if (s.id === sectionId) return i;
  }
  return -1;
}

// Strip the small set of HTML tags the editor's bold/italic toolbar produces,
// so card blurbs show plain text. Entities are left alone: they are rare in
// guide copy and showing "&amp;" beats showing a stray ampersand-coded tag.
export function stripHtml(html: string) {
  return (html || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// The blurb shown on a guide card. An officer's summary wins; otherwise the
// first meaningful paragraph or list item is used, clipped to one line or two.
export function previewText(
  s: Pick<Section, "summary" | "blocks">,
  max = 160
): string {
  const explicit = stripHtml(s.summary || "");
  if (explicit) return clip(explicit, max);
  for (const b of s.blocks || []) {
    if (b.type === "text" && stripHtml(b.html)) return clip(stripHtml(b.html), max);
    if (b.type === "heading" && b.text) return clip(b.text, max);
    if (b.type === "list" && b.items.length) return clip(stripHtml(b.items[0]), max);
    if (b.type === "tip" && stripHtml(b.html)) return clip(stripHtml(b.html), max);
    if (b.type === "embed" && stripHtml(b.caption || "")) return clip(stripHtml(b.caption || ""), max);
  }
  return "";
}

function clip(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

// Every bit of a guide's text, flattened for search: the title, the summary and
// the words inside each block (list items, table cells, captions, ...). Lower
// case so callers can compare directly.
export function sectionText(s: Pick<Section, "title" | "summary" | "blocks">): string {
  const parts: string[] = [s.title, stripHtml(s.summary || "")];
  for (const b of s.blocks || []) {
    switch (b.type) {
      case "heading":
        parts.push(b.text);
        break;
      case "text":
      case "tip":
        parts.push(stripHtml(b.html));
        break;
      case "list":
        parts.push(...b.items.map(stripHtml));
        break;
      case "choices":
        for (const it of b.items) parts.push(it.label, stripHtml(it.html));
        break;
      case "figures":
        for (const it of b.items) if (it.caption) parts.push(it.caption);
        break;
      case "table":
        parts.push(...(b.head || []).map(stripHtml));
        for (const row of b.rows || []) parts.push(...row.map(stripHtml));
        break;
      case "embed":
        if (b.caption) parts.push(b.caption);
        break;
    }
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// Search every guide in the document, across all categories. A guide matches
// when it contains each word of the query, so "nien skills" finds a guide that
// mentions both. Empty query returns nothing (the hub shows the active category
// instead).
export function searchGuides(
  doc: GuideDoc,
  query: string
): { group: Group; section: Section }[] {
  const terms = (query || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out: { group: Group; section: Section }[] = [];
  for (const group of doc.groups || []) {
    for (const section of group.sections || []) {
      const hay = sectionText(section);
      if (terms.every((t) => hay.includes(t))) out.push({ group, section });
    }
  }
  return out;
}

// The image shown on a guide card: the officer's cover, or the first figure.
export function coverOf(s: Pick<Section, "cover" | "blocks">): string {
  if (s.cover && s.cover.trim()) return s.cover.trim();
  for (const b of s.blocks || []) {
    if (b.type === "figures" && b.items.length && b.items[0].src) return b.items[0].src;
  }
  return "";
}

// Find one guide (section) and the category (group) that owns it. Returns null
// when either slug is unknown, so the page can 404.
export function findGuide(
  doc: GuideDoc,
  categoryId: string,
  guideId: string
): { group: Group; section: Section } | null {
  const group = (doc.groups || []).find((g) => g.id === categoryId);
  if (!group) return null;
  const section = (group.sections || []).find((s) => s.id === guideId);
  if (!section) return null;
  return { group, section };
}

// Stable key for a guide's reactions and stats: "category/guide".
export function guideKey(categoryId: string, guideId: string) {
  return `${categoryId}/${guideId}`;
}

// Which section are you reading? Given each section's top edge in viewport
// coordinates (document order), it is the last one that has passed under the
// sticky header. Kept pure so it can be unit-checked without a browser.
export function pickCurrent(tops: { id: string; top: number }[], offset: number) {
  if (!tops.length) return null;
  let cur = tops[0].id;
  for (const t of tops) if (t.top <= offset) cur = t.id;
  return cur;
}

/* -------- block catalogue (used by the editor) -------- */

export type BlockType = Block["type"];

export const BLOCK_LABELS: Record<BlockType, string> = {
  heading: "Heading",
  text: "Paragraph",
  list: "List",
  tip: "Callout box",
  choices: "Choice cards",
  figures: "Images",
  table: "Table",
  embed: "Embed",
};

export const BLOCK_TYPES = Object.keys(BLOCK_LABELS) as BlockType[];

export function blankBlock(type: BlockType): Block {
  switch (type) {
    case "heading":
      return { type, text: "New heading", small: false };
    case "text":
      return { type, html: "" };
    case "list":
      return { type, ordered: false, items: [] };
    case "tip":
      return { type, warn: false, html: "" };
    case "choices":
      return { type, items: [{ label: "Option 1", html: "", good: false }] };
    case "figures":
      return { type, layout: "grid", items: [] };
    case "table":
      return { type, head: [], rows: [] };
    case "embed":
      return { type, url: "", caption: "" };
  }
}

/* -------- home document -------- */

export const DEFAULT_HOME: HomeDoc = {
  hero: {
    sub: "Alliance Family",
    title: "Phoenix of War 973",
    motto: "From ashes, to flame.",
    tagline: "We rise and we take what we want.",
    primaryLabel: "Season 3 Guide",
    primaryHref: "/guide",
    ghostLabel: "Alliance rules",
    ghostHref: "/rules",
  },
  hub: {
    eyebrow: "Start here",
    title: "Everything in one place",
    lead:
      "Jump straight to what you need. New members should read the guide and the rules first.",
    links: [
      {
        label: "Guide",
        href: "/guide",
        note: "Season strategy, Nien, the map, skills and heroes.",
      },
      {
        label: "Alliance rules",
        href: "/rules",
        note: "What we expect from each other, so nobody has to guess.",
      },
      {
        label: "Discord",
        href: "https://discord.gg/R8CC3CfdZ4",
        note: "Chat, rallies, events and help when you need it.",
      },
    ],
    startHere: {
      title: "New to PHW?",
      text:
        "Read the guide, know the rules, then say hello on Discord. If anything is unclear, " +
        "ask — nobody expects you to know it all yet.",
      label: "Open the guide",
      href: "/guide",
    },
  },
  about: {
    eyebrow: "About",
    title: "Who we are",
    lead:
      "Phoenix of War 973 — PHW — is an alliance family built on one idea: nobody plays alone. " +
      "We are spread across every timezone, so what one of us learns, all of us keep. This site is " +
      "where that knowledge lives: strategy, timings, events, and the answers to the questions " +
      "every new member asks in their first week.",
    image: "img/phoenix.webp",
    imageAlt:
      "The Phoenix of War emblem — a phoenix rising with its wings spread in flame",
  },
  whatWeDo: {
    eyebrow: "What this site is for",
    title: "One place, everything in it",
    cards: [
      {
        title: "Guides",
        text: "Straight answers on how to play well — growth, combat, events, and the mistakes worth skipping.",
      },
      {
        title: "Alliance rules",
        text: "What we expect from each other, so coordination stays simple and nobody has to guess.",
      },
      {
        title: "Events & timings",
        text: "Schedules written once, readable from any timezone, instead of scattered across chat.",
      },
    ],
  },
  values: {
    eyebrow: "How we play",
    title: "What we stand on",
    cards: [
      {
        title: "Rise together",
        text: "Members get carried through their weak weeks. Everyone has them.",
      },
      {
        title: "Share everything",
        text: "Discoveries go into the guide, not into a private chat with three people.",
      },
      {
        title: "Show up",
        text: "You do not have to be the strongest. You do have to be there when it counts.",
      },
    ],
  },
  join: {
    eyebrow: "Join",
    title: "Getting in",
    facts: [
      { term: "Alliance", detail: "Phoenix of War 973 (PHW)" },
      { term: "Language", detail: "English" },
      {
        term: "Discord",
        detail: "discord.gg/R8CC3CfdZ4",
      },
      {
        term: "Requirements",
        detail:
          "Anyone ready to stand and fight beside us — and to show respect to everyone, our own alliance and our enemies alike.",
      },
    ],
    primaryLabel: "Join our Discord",
    primaryHref: "https://discord.gg/R8CC3CfdZ4",
    ghostLabel: "Season 3 Guide",
    ghostHref: "/guide",
    footerNote:
      "New here? Start with the Season 3 Guide — everything you need for the season, in one place.",
  },
  footer: "Phoenix of War 973 · From ashes, to flame.",
};

function str(v: unknown, fallback: string) {
  return typeof v === "string" && v.length ? v : fallback;
}

function card(v: unknown): { title: string; text: string } {
  const c = (v || {}) as Record<string, unknown>;
  return { title: str(c.title, ""), text: str(c.text, "") };
}

// Merge whatever the DB row holds over the built-in defaults, so a fresh row or
// a partial edit can never render a blank page.
export function normalizeHome(raw: unknown): HomeDoc {
  const d = JSON.parse(JSON.stringify(DEFAULT_HOME)) as HomeDoc;
  const r = (raw || {}) as Record<string, unknown>;
  const pick = (k: string) => ((r[k] || {}) as Record<string, unknown>) || {};

  const hero = pick("hero");
  if (hero.sub !== undefined) d.hero.sub = str(hero.sub, d.hero.sub);
  if (hero.title !== undefined) d.hero.title = str(hero.title, d.hero.title);
  if (hero.motto !== undefined) d.hero.motto = str(hero.motto, d.hero.motto);
  if (hero.tagline !== undefined) d.hero.tagline = str(hero.tagline, d.hero.tagline);
  if (hero.primaryLabel !== undefined) d.hero.primaryLabel = str(hero.primaryLabel, d.hero.primaryLabel);
  if (hero.primaryHref !== undefined) d.hero.primaryHref = str(hero.primaryHref, d.hero.primaryHref);
  if (hero.ghostLabel !== undefined) d.hero.ghostLabel = str(hero.ghostLabel, d.hero.ghostLabel);
  if (hero.ghostHref !== undefined) d.hero.ghostHref = str(hero.ghostHref, d.hero.ghostHref);

  const about = pick("about");
  if (about.eyebrow !== undefined) d.about.eyebrow = str(about.eyebrow, d.about.eyebrow);
  if (about.title !== undefined) d.about.title = str(about.title, d.about.title);
  if (about.lead !== undefined) d.about.lead = str(about.lead, d.about.lead);
  if (about.image !== undefined) d.about.image = str(about.image, d.about.image);
  if (about.imageAlt !== undefined) d.about.imageAlt = str(about.imageAlt, d.about.imageAlt);

  const hub = pick("hub");
  if (hub.eyebrow !== undefined) d.hub.eyebrow = str(hub.eyebrow, d.hub.eyebrow);
  if (hub.title !== undefined) d.hub.title = str(hub.title, d.hub.title);
  if (hub.lead !== undefined) d.hub.lead = str(hub.lead, d.hub.lead);
  if (Array.isArray(hub.links) && hub.links.length)
    d.hub.links = hub.links.map((l) => {
      const x = (l || {}) as Record<string, unknown>;
      return { label: str(x.label, ""), href: str(x.href, ""), note: str(x.note, "") };
    });
  const sh = (hub.startHere || {}) as Record<string, unknown>;
  d.hub.startHere = {
    title: str(sh.title, d.hub.startHere.title),
    text: str(sh.text, d.hub.startHere.text),
    label: str(sh.label, d.hub.startHere.label),
    href: str(sh.href, d.hub.startHere.href),
  };

  const whatWeDo = pick("whatWeDo");
  if (whatWeDo.eyebrow !== undefined) d.whatWeDo.eyebrow = str(whatWeDo.eyebrow, d.whatWeDo.eyebrow);
  if (whatWeDo.title !== undefined) d.whatWeDo.title = str(whatWeDo.title, d.whatWeDo.title);
  if (Array.isArray(whatWeDo.cards) && whatWeDo.cards.length)
    d.whatWeDo.cards = whatWeDo.cards.map(card);

  const values = pick("values");
  if (values.eyebrow !== undefined) d.values.eyebrow = str(values.eyebrow, d.values.eyebrow);
  if (values.title !== undefined) d.values.title = str(values.title, d.values.title);
  if (Array.isArray(values.cards) && values.cards.length) d.values.cards = values.cards.map(card);

  const join = pick("join");
  if (join.eyebrow !== undefined) d.join.eyebrow = str(join.eyebrow, d.join.eyebrow);
  if (join.title !== undefined) d.join.title = str(join.title, d.join.title);
  if (join.primaryLabel !== undefined) d.join.primaryLabel = str(join.primaryLabel, d.join.primaryLabel);
  if (join.primaryHref !== undefined) d.join.primaryHref = str(join.primaryHref, d.join.primaryHref);
  if (join.ghostLabel !== undefined) d.join.ghostLabel = str(join.ghostLabel, d.join.ghostLabel);
  if (join.ghostHref !== undefined) d.join.ghostHref = str(join.ghostHref, d.join.ghostHref);
  if (join.footerNote !== undefined) d.join.footerNote = str(join.footerNote, d.join.footerNote);
  if (Array.isArray(join.facts) && join.facts.length)
    d.join.facts = join.facts.map((f) => {
      const x = (f || {}) as Record<string, unknown>;
      return { term: str(x.term, ""), detail: str(x.detail, "") };
    });

  if (r.footer !== undefined) d.footer = str(r.footer, d.footer);
  return d;
}

/* -------- helpers used by the editor -------- */

export function move<T>(arr: T[], i: number, delta: number) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return false;
  const t = arr[i];
  arr[i] = arr[j];
  arr[j] = t;
  return true;
}