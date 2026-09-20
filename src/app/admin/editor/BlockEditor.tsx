"use client";

import { useReducer } from "react";
import type { Block } from "@/lib/types";
import { move } from "@/lib/content";
import {
  Checkbox,
  Dropzone,
  IconButton,
  Labelled,
  RichText,
  Select,
  TextInput,
  deleteStoredImage,
} from "./fields";
import { assetUrl } from "@/lib/assets";
import { embedSource } from "@/lib/embed";

type EditorProps = {
  b: Block;
  touch: () => void;
  password: string;
  onError: (msg: string) => void;
};

export function BlockEditor({ b, touch, password, onError }: EditorProps) {
  switch (b.type) {
    case "heading":
      return (
        <div>
          <Labelled text="Text">
            <TextInput value={b.text} onChange={(v) => { b.text = v; touch(); }} />
          </Labelled>
          <Checkbox text="Small note-style heading" checked={b.small} onChange={(v) => { b.small = v; touch(); }} />
        </div>
      );

    case "text":
      return <RichText value={b.html} rows={4} onChange={(v) => { b.html = v; touch(); }} />;

    case "list":
      return (
        <ListEditor b={b} touch={touch} />
      );

    case "tip":
      return (
        <div>
          <Checkbox
            text='Red warning style (for "do not do this")'
            checked={b.warn}
            onChange={(v) => { b.warn = v; touch(); }}
          />
          <RichText value={b.html} rows={3} onChange={(v) => { b.html = v; touch(); }} />
        </div>
      );

    case "choices":
      return <ChoicesEditor b={b} touch={touch} />;

    case "figures":
      return <FiguresEditor b={b} touch={touch} password={password} onError={onError} />;

    case "table":
      return <TableEditor b={b} touch={touch} />;

    case "embed":
      return <EmbedEditor b={b} touch={touch} />;
  }
}

function ListEditor({ b, touch }: { b: Block & { type: "list" }; touch: () => void }) {
  return (
    <div>
      <Checkbox
        text="Numbered list"
        checked={b.ordered}
        onChange={(v) => { b.ordered = v; touch(); }}
      />
      <div className="adm-label">One item per line</div>
      <textarea
        className="adm-field"
        rows={Math.max(3, b.items.length + 1)}
        value={b.items.join("\n")}
        placeholder="One item per line"
        onChange={(e) => {
          b.items = e.target.value
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
          touch();
        }}
      />
    </div>
  );
}

function ChoicesEditor({
  b,
  touch,
}: {
  b: Block & { type: "choices" };
  touch: () => void;
}) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  return (
    <div>
      {b.items.map((c, i) => (
        <div key={i} className="adm-sub">
          <div className="adm-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <TextInput
                value={c.label}
                placeholder="Label, e.g. Option 1"
                onChange={(v) => { c.label = v; touch(); }}
              />
            </div>
            <IconButton
              disabled={i === 0}
              onClick={() => { if (move(b.items, i, -1)) { touch(); bump(); } }}
            >
              ▲
            </IconButton>
            <IconButton
              disabled={i === b.items.length - 1}
              onClick={() => { if (move(b.items, i, 1)) { touch(); bump(); } }}
            >
              ▼
            </IconButton>
            <IconButton
              danger
              onClick={() => { b.items.splice(i, 1); touch(); bump(); }}
            >
              ×
            </IconButton>
          </div>
          <RichText value={c.html} rows={2} onChange={(v) => { c.html = v; touch(); }} />
          <Checkbox
            text="Highlight as the recommended choice"
            checked={c.good}
            onChange={(v) => { c.good = v; touch(); }}
          />
        </div>
      ))}
      <button
        type="button"
        className="btn-sm"
        onClick={() => {
          b.items.push({ label: `Option ${b.items.length + 1}`, html: "", good: false });
          touch();
          bump();
        }}
      >
        + Add choice
      </button>
    </div>
  );
}

const LAYOUTS: [string, string][] = [
  ["grid", "Side by side (2-3 per row)"],
  ["one", "Single, medium width"],
  ["full", "Single, full width — best for detailed screenshots"],
  ["narrow", "Narrow — best for tall portrait images"],
];

type FigLayout = Extract<Block, { type: "figures" }>["layout"];

function FiguresEditor({
  b,
  touch,
  password,
  onError,
}: {
  b: Block & { type: "figures" };
  touch: () => void;
  password: string;
  onError: (msg: string) => void;
}) {
  const [, bump] = useReducer((x: number) => x + 1, 0);
  return (
    <div>
      <Labelled text="Layout">
        <Select
          options={LAYOUTS}
          value={b.layout || "grid"}
          onChange={(v) => { b.layout = v as FigLayout; touch(); }}
        />
      </Labelled>

      {b.items.map((f, i) => (
        <div key={i} className="adm-sub">
          {f.src ? (
            <img className="adm-thumb" src={assetUrl(f.src)} alt="" />
          ) : null}
          <div className="adm-row">
            <span className="adm-label">Image {i + 1}</span>
            <span style={{ flex: 1 }} />
            <IconButton
              disabled={i === 0}
              onClick={() => { if (move(b.items, i, -1)) { touch(); bump(); } }}
            >
              ▲
            </IconButton>
            <IconButton
              disabled={i === b.items.length - 1}
              onClick={() => { if (move(b.items, i, 1)) { touch(); bump(); } }}
            >
              ▼
            </IconButton>
            <IconButton
              danger
              onClick={() => {
                const removed = b.items[i];
                b.items.splice(i, 1);
                deleteStoredImage(removed?.src, password);
                touch();
                bump();
              }}
            >
              ×
            </IconButton>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Labelled text="Caption">
              <TextInput value={f.caption} onChange={(v) => { f.caption = v; touch(); }} />
            </Labelled>
          </div>
          <div style={{ marginBottom: 10 }}>
            <Labelled text="Alt text">
              <TextInput
                value={f.alt}
                placeholder="Describes the image for screen readers"
                onChange={(v) => { f.alt = v; touch(); }}
              />
            </Labelled>
          </div>
          <Dropzone
            password={password}
            onError={onError}
            onPath={(p) => {
              deleteStoredImage(f.src, password);
              f.src = p;
              bump();
              touch();
            }}
          />
        </div>
      ))}

      <Dropzone
        password={password}
        onError={onError}
        onPath={(p) => {
          b.items.push({ src: p, alt: "", caption: "" });
          bump();
          touch();
        }}
      />
    </div>
  );
}

function EmbedEditor({
  b,
  touch,
}: {
  b: Block & { type: "embed" };
  touch: () => void;
}) {
  const emb = embedSource(b.url);
  const status = !b.url.trim()
    ? "Paste a video page link. YouTube, Vimeo and Twitch links become a player that plays right on the page."
    : emb?.kind === "youtube"
      ? "YouTube — plays in this page."
      : emb?.kind === "vimeo"
        ? "Vimeo — plays in this page."
        : emb?.kind === "dailymotion"
          ? "Dailymotion — plays in this page."
          : emb?.kind === "twitch"
            ? "Twitch — plays in this page."
            : emb?.kind === "file"
              ? "Direct video file (mp4 / webm) — plays in this page."
              : emb?.kind === "page"
                ? "Web page — shown in a frame. Some sites refuse to embed a plain page; use their embed/share URL if it does not play."
                : "That link does not look like a video or page URL. Paste the video's page link.";
  return (
    <div>
      <Labelled text="Video link">
        <TextInput
          value={b.url}
          placeholder="https://www.youtube.com/watch?v=…"
          onChange={(v) => {
            b.url = v;
            touch();
          }}
        />
      </Labelled>
      <div className="adm-label">{status}</div>
      <Labelled text="Caption">
        <TextInput
          value={b.caption}
          placeholder="Shown under the player, optional"
          onChange={(v) => {
            b.caption = v;
            touch();
          }}
        />
      </Labelled>
    </div>
  );
}

function TableEditor({
  b,
  touch,
}: {
  b: Block & { type: "table" };
  touch: () => void;
}) {
  return (
    <div>
      <div className="adm-label">Header row — separate columns with |</div>
      <textarea
        className="adm-field"
        rows={2}
        value={(b.head || []).join(" | ")}
        placeholder="Column 1 | Column 2 | Column 3"
        onChange={(e) => {
          b.head = e.target.value.split("|").map((s) => s.trim());
          touch();
        }}
      />
      <div className="adm-label">Rows — one per line, columns separated with |</div>
      <textarea
        className="adm-field"
        rows={Math.max(4, (b.rows || []).length + 1)}
        value={(b.rows || []).map((r) => r.join(" | ")).join("\n")}
        placeholder="One row per line, columns separated with |"
        onChange={(e) => {
          b.rows = e.target.value
            .split("\n")
            .filter((l) => l.trim())
            .map((l) => l.split("|").map((c) => c.trim()));
          touch();
        }}
      />
    </div>
  );
}