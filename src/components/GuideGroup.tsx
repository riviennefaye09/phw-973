import type { Block, Group, Section } from "@/lib/types";
import { assetUrl } from "@/lib/assets";
import { embedSource } from "@/lib/embed";
import { useLightbox } from "./Lightbox";

function FigureLink({
  src,
  children,
}: {
  src: string;
  children: React.ReactNode;
}) {
  const open = useLightbox();
  return (
    <a
      href={src}
      onClick={(e) => {
        e.preventDefault();
        open(src, "");
      }}
    >
      {children}
    </a>
  );
}

function Figure({ f }: { f: { src: string; alt?: string; caption?: string } }) {
  return (
    <figure>
      <FigureLink src={f.src}>
        <img
          src={assetUrl(f.src)}
          alt={f.alt || ""}
          loading="lazy"
          decoding="async"
        />
      </FigureLink>
      {f.caption ? <figcaption dangerouslySetInnerHTML={{ __html: f.caption }} /> : null}
    </figure>
  );
}

function EmbedBlock({ b }: { b: Block & { type: "embed" } }) {
  if (!b.url || !b.url.trim()) return null;
  const parent = typeof window !== "undefined" ? window.location.hostname : "";
  const emb = embedSource(b.url, parent);
  return (
    <div className="embed">
      {emb ? (
        emb.kind === "file" ? (
          <video controls preload="metadata" playsInline src={emb.src} />
        ) : (
          <iframe
            src={emb.src}
            title={b.caption || "Embedded video"}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )
      ) : (
        <p className="wip">This embed needs a valid link.</p>
      )}
      {b.caption ? <p className="embed-cap">{b.caption}</p> : null}
    </div>
  );
}

// Same markup classes the old render.js produced, so the CSS keeps working
// untouched.
export function GuideBlock({ b }: { b: Block }) {
  switch (b.type) {
    case "heading":
      return <h3 className={b.small ? "sub" : undefined}>{b.text}</h3>;

    case "text":
      return <p dangerouslySetInnerHTML={{ __html: b.html }} />;

    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag>
          {b.items.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: it }} />
          ))}
        </Tag>
      );
    }

    case "tip":
      return (
        <div className={b.warn ? "tip warn" : "tip"}>
          <p dangerouslySetInnerHTML={{ __html: b.html }} />
        </div>
      );

    case "choices":
      return (
        <div className="choices">
          {b.items.map((c, i) => (
            <div key={i} className={c.good ? "choice good" : "choice"}>
              <b dangerouslySetInnerHTML={{ __html: c.label }} />
              <span dangerouslySetInnerHTML={{ __html: c.html }} />
            </div>
          ))}
        </div>
      );

    case "figures": {
      const layout = b.layout && b.layout !== "grid" ? ` ${b.layout}` : "";
      return (
        <div className={`figs${layout}`}>
          {b.items.map((f, i) => (
            <Figure key={i} f={f} />
          ))}
        </div>
      );
    }

    case "table":
      return (
        <div className="table-wrap">
          <table>
            {b.head && b.head.length ? (
              <thead>
                <tr>
                  {b.head.map((h, i) => (
                    <th key={i} dangerouslySetInnerHTML={{ __html: h }} />
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {(b.rows || []).map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} dangerouslySetInnerHTML={{ __html: cell }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "embed":
      return <EmbedBlock b={b} />;

    default:
      // ponytail: content written by a newer version of the editor. Say so in
      // place rather than rendering nothing and looking like data loss.
      return <p className="wip">Unsupported block type: {(b as Block).type}</p>;
  }
}

export function GuideSection({ s }: { s: Section }) {
  return (
    <section id={s.id}>
      <h2>{s.title}</h2>
      {(s.blocks || []).map((b, i) => (
        <GuideBlock key={i} b={b} />
      ))}
    </section>
  );
}

export function GuideGroup({ group }: { group: Group }) {
  return (
    <>
      {(group.sections || []).map((s) => (
        <GuideSection key={s.id} s={s} />
      ))}
      {!group.sections || group.sections.length === 0 ? (
        <p className="wip">Nothing has been written here yet.</p>
      ) : null}
    </>
  );
}