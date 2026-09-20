// The guide document. Same shapes the old content/guide.json used, so nothing
// has to change when existing content is seeded into Supabase.

export type Block =
  | { type: "heading"; text: string; small?: boolean }
  | { type: "text"; html: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "tip"; warn?: boolean; html: string }
  | {
      type: "choices";
      items: { label: string; html: string; good?: boolean }[];
    }
  | {
      type: "figures";
      layout?: "grid" | "one" | "full" | "narrow";
      items: { src: string; alt?: string; caption?: string }[];
    }
  | { type: "table"; head?: string[]; rows?: string[][] }
  | { type: "embed"; url: string; caption?: string };

// A section is a single guide. In the browser it appears as a card under its
// category (the group), and it has its own page with a comment thread.
export interface Section {
  id: string;
  nav?: string;
  title: string;
  summary?: string; // card blurb; derived from the first paragraph when blank
  cover?: string; // card image path/URL; derived from the first figure when blank
  blocks: Block[];
}

export interface Group {
  id: string;
  title: string;
  intro?: string;
  pinned?: boolean; // stays at the top of the topic list (first page)
  sections: Section[];
}

export interface GuideDoc {
  page?: { eyebrow?: string; title?: string };
  groups: Group[];
}

// The home page document, editable from /admin. Everything is optional so a new
// or half-populated row still renders a complete page via the defaults.
//
// `whatWeDo` and `values` are kept for older database rows but are no longer
// rendered now that the home page is a hub rather than a landing page.
export interface HomeCard {
  title: string;
  text: string;
}

export interface HomeFact {
  term: string;
  detail: string;
}

export interface HubLink {
  label: string;
  href: string;
  note: string;
}

// Announcements and events are structured (not block documents) because they
// carry real fields — dates, pinning, importance — that the hub and their own
// pages need to sort and group.
export interface NewsItem {
  id: string;
  date: string; // ISO date
  title: string;
  body: string; // rich text (a small set of HTML)
  pinned?: boolean;
}

export interface NewsDoc {
  items: NewsItem[];
}

export interface EventItem {
  id: string;
  title: string;
  desc?: string; // rich text
  startsAt: string; // ISO timestamp, always UTC
  durationMins?: number;
  category?: string;
  important?: boolean;
  recurring?: string; // free text, e.g. "daily" / "every Monday"
}

export interface EventsDoc {
  events: EventItem[];
}

export interface HomeDoc {
  hero: {
    sub: string;
    title: string;
    motto: string;
    tagline: string;
    primaryLabel: string;
    primaryHref: string;
    ghostLabel: string;
    ghostHref: string;
  };
  about: {
    eyebrow: string;
    title: string;
    lead: string;
    image: string;
    imageAlt: string;
  };
  hub: {
    eyebrow: string;
    title: string;
    lead: string;
    links: HubLink[];
    startHere: { title: string; text: string; label: string; href: string };
  };
  whatWeDo: { eyebrow: string; title: string; cards: HomeCard[] };
  values: { eyebrow: string; title: string; cards: HomeCard[] };
  join: {
    eyebrow: string;
    title: string;
    facts: HomeFact[];
    primaryLabel: string;
    primaryHref: string;
    ghostLabel: string;
    ghostHref: string;
    footerNote: string;
  };
  footer: string;
}