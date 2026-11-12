"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GuideDoc } from "@/lib/types";
import { groupOfSection, pickCurrent } from "@/lib/content";
import { GuideGroup } from "./GuideGroup";
import { LightboxProvider } from "./Lightbox";

const HEADER = 90;
const TOC_PAGE = 5;

// Guide page: collapsible table of contents, one main topic shown at a time,
// and a scroll spy that highlights whichever section you are reading. Port of
// the old guide.js.
export default function GuideViewer({ doc }: { doc: GuideDoc }) {
  const [active, setActive] = useState(0);
  const [tocOpen, setTocOpen] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState<string | null>(null);
  const [tocPage, setTocPage] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<string | null>(null);
  const activeRef = useRef(0);

  // Keep the hash handler reading the latest active group without re-subscribing
  // on every group change.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  function isNarrow() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
  }

  const show = useCallback((gi: number, scrollToId?: string | null) => {
    setActive(gi);
    // follow the topic we are moving to in the contents, so the TOC page
    // always contains the currently open group
    setTocPage(Math.floor(gi / TOC_PAGE));
    pendingScroll.current = scrollToId ?? null;
  }, []);

  const showForHash = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const gi = id ? groupOfSection(doc, id) : -1;
    if (gi < 0) {
      show(0);
      return;
    }
    // a hash naming the group itself lands on its first section
    const g = doc.groups[gi];
    const isGroup = g.id === id;
    show(gi, isGroup ? (g.sections[0] || {}).id : id);
  }, [doc, show]);

  // Initial load + hash navigation.
  useEffect(() => {
    // Initialise from the URL hash once the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showForHash();
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const gi = id ? groupOfSection(doc, id) : -1;
      if (gi < 0) return;
      if (gi !== activeRef.current) {
        const g = doc.groups[gi];
        show(gi, g.id === id ? (g.sections[0] || {}).id : id);
      } else {
        const t = document.getElementById(id);
        if (t) {
          t.scrollIntoView();
          setCurrent(id);
        }
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [doc, show, showForHash]);

  // After the active group changes, honour any pending deep link / scroll.
  useEffect(() => {
    const id = pendingScroll.current;
    pendingScroll.current = null;
    if (id) {
      const t = document.getElementById(id);
      if (t) {
        t.scrollIntoView();
        setCurrent(id);
      }
      if (window.location.hash.slice(1) !== id) {
        history.replaceState(null, "", "#" + id);
      }
    } else {
      window.scrollTo(0, 0);
      // a plain topic switch (prev/next) has no section deep link: drop the
      // stale hash so a reload does not bounce back to the previous topic
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }, [active]);

  // Scroll spy: which section is under the sticky header?
  useEffect(() => {
    const sections = () =>
      Array.from(bodyRef.current?.querySelectorAll("section[id]") || []);
    let queued = false;
    const update = () => {
      queued = false;
      const tops = sections().map((s) => ({
        id: s.id,
        top: s.getBoundingClientRect().top,
      }));
      setCurrent(pickCurrent(tops, HEADER));
    };
    const handler = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    update();
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [active]);

  const openState = (gi: number) => tocOpen[gi] ?? (gi === active && !isNarrow());

  const tocPages = Math.max(1, Math.ceil(doc.groups.length / TOC_PAGE));
  const page = Math.min(tocPage, tocPages - 1);
  const tocSlice = doc.groups.slice(page * TOC_PAGE, page * TOC_PAGE + TOC_PAGE);
  const g = doc.groups[active];

  return (
    <LightboxProvider>
      <div className="hero" style={{ padding: "64px 0 44px" }}>
        <div className="wrap">
          <p className="sub">{doc.page?.eyebrow || "Guide"}</p>
          <h1>{doc.page?.title || "Guide"}</h1>
        </div>
      </div>

      <section>
        <div className="wrap guide-layout">
          <aside className="toc">
            <p>Contents</p>
            {tocSlice.map((tocG, oi) => {
              const gi = page * TOC_PAGE + oi;
              const open = openState(gi);
              return (
                <div key={tocG.id} className={`toc-group${open ? " open" : ""}`}>
                  <button
                    type="button"
                    className="toc-group-head"
                    aria-expanded={open}
                    onClick={() => {
                      if (gi === active) {
                        setTocOpen((o) => ({ ...o, [gi]: !open }));
                        return;
                      }
                      show(gi, (tocG.sections[0] || {}).id);
                    }}
                  >
                    <span className="toc-caret">›</span>
                    <span>{tocG.title || "(untitled topic)"}</span>
                    {tocG.pinned ? (
                      <svg
                        className="toc-flame"
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        aria-hidden="true"
                      >
                        <title>Pinned</title>
                        <path
                          d="M12 1.8c-.6 3.2-2.9 5-4.7 6.9C5.7 10.4 4.6 12 4.6 14.3a7.4 7.4 0 0 0 14.8 0c0-2.4-1.1-4.3-2.6-6C14.9 6.5 12.6 4.7 12 1.8Z"
                          fill="currentColor"
                        />
                      </svg>
                    ) : null}
                  </button>
                  <div className="toc-links">
                    {tocG.sections.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        data-section={s.id}
                        aria-current={current === s.id ? "true" : undefined}
                      >
                        {s.nav || s.title}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
            {tocPages > 1 ? (
              <div className="toc-pager">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setTocPage((p) => Math.max(0, p - 1))}
                >
                  « Prev
                </button>
                <span className="toc-page-num">
                  {page + 1} / {tocPages}
                </span>
                <button
                  type="button"
                  disabled={page + 1 >= tocPages}
                  onClick={() => setTocPage((p) => Math.min(tocPages - 1, p + 1))}
                >
                  Next »
                </button>
              </div>
            ) : null}
          </aside>

          <div className="guide-body" ref={bodyRef}>
            {g ? (
              <div key={g.id || active} id={g.id}>
                {doc.groups.length > 1 && g.title ? (
                  <h2 className="guide-topic-title">{g.title}</h2>
                ) : null}
                {g.intro ? (
                  <p
                    className="motto"
                    style={{ fontSize: 17, color: "var(--muted)", maxWidth: "60ch", marginBottom: 24 }}
                    dangerouslySetInnerHTML={{ __html: g.intro }}
                  />
                ) : null}
                <GuideGroup group={g} />
                {active > 0 || active < doc.groups.length - 1 ? (
                  <nav className="topic-nav" aria-label="Topics">
                    {active > 0 ? (
                      <button
                        type="button"
                        className="topic-nav-btn"
                        onClick={() => show(active - 1, null)}
                      >
                        <span className="topic-nav-dir">Prev</span>
                        <span className="topic-nav-title">
                          {doc.groups[active - 1].title || "(untitled topic)"}
                        </span>
                      </button>
                    ) : (
                      <span className="topic-nav-spacer" />
                    )}
                    {active < doc.groups.length - 1 ? (
                      <button
                        type="button"
                        className="topic-nav-btn next"
                        onClick={() => show(active + 1, null)}
                      >
                        <span className="topic-nav-dir">Next</span>
                        <span className="topic-nav-title">
                          {doc.groups[active + 1].title || "(untitled topic)"}
                        </span>
                      </button>
                    ) : (
                      <span className="topic-nav-spacer" />
                    )}
                  </nav>
                ) : null}
              </div>
            ) : (
              <p className="wip">No topics have been written yet.</p>
            )}
          </div>
        </div>
      </section>
    </LightboxProvider>
  );
}