"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { GuideDoc } from "@/lib/types";
import { normalize, normalizeRules, slug } from "@/lib/content";
import { GuideEditor } from "./editor/GuideEditor";
import { Manual } from "./editor/Manual";
import { Dialogs, useDialogs } from "./editor/dialog";
import { Toasts, notify } from "./editor/toast";
import { GuideGroup } from "@/components/GuideGroup";
import { LightboxProvider } from "@/components/Lightbox";

type Tab = "guide" | "rules";
type View = "help" | "edit";

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export default function AdminPage() {
  const [phase, setPhase] = useState<"login" | "editor">("login");
  const [pw, setPw] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [busyLogin, setBusyLogin] = useState(false);

  const [guide, setGuide] = useState<GuideDoc | null>(null);
  const [guideVer, setGuideVer] = useState<number | null>(null);
  const [rules, setRules] = useState<GuideDoc | null>(null);
  const [rulesVer, setRulesVer] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("guide");
  const [view, setView] = useState<View>("help");
  const [gIdx, setGIdx] = useState(0);
  const [secIdx, setSecIdx] = useState(0);

  const [stateMsg, setStateMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Tab | null>(null);
  // The editor edits the loaded document in place, so a state change is what
  // makes React show it. Bumping this on every edit guarantees a re-render even
  // when `dirty` and the status message are already set.
  const [, bump] = useState(0);

  function touch() {
    setDirty(true);
    setStateMsg("Unsaved changes");
    bump((n) => n + 1);
  }

  async function performLogin(passwordToUse: string): Promise<boolean> {
    setBusyLogin(true);
    setLoginErr("");
    const { ok, data } = await post("/api/admin/load", { password: passwordToUse });
    setBusyLogin(false);
    if (!ok) {
      const msg = String(data?.error || "Could not load the site content.");
      setLoginErr(/password/i.test(msg) ? "Wrong password." : msg);
      try {
        sessionStorage.removeItem("phw_admin_pw");
      } catch {
        // ignore
      }
      return false;
    }
    try {
      sessionStorage.setItem("phw_admin_pw", passwordToUse);
    } catch {
      // ignore
    }
    setPw(passwordToUse);
    const g = (data.guide as { doc?: unknown; version?: number | null } | null) ?? null;
    const r = (data.rules as { doc?: unknown; version?: number | null } | null) ?? null;
    setGuide(normalize(g?.doc ?? null));
    setGuideVer(g?.version ?? null);
    setRules(normalizeRules(r?.doc ?? null));
    setRulesVer(r?.version ?? null);
    setGIdx(0);
    setSecIdx(0);
    setTab("guide");
    setView("help");
    setStateMsg("Loaded");
    setPhase("editor");
    return true;
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(loginPw);
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("phw_admin_pw");
      if (saved) {
        performLogin(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  async function save() {
    const target = tab;
    const doc = target === "guide" ? guide : rules;
    const version = target === "guide" ? guideVer : rulesVer;
    if (!doc) return;
    setSaving(true);

    (doc as GuideDoc).groups.forEach((g) => {
      if (!g.id) g.id = slug(g.title);
      g.sections.forEach((s) => {
        if (!s.id) s.id = slug(s.title);
      });
    });
    const { ok, status, data } = await post("/api/admin/save", {
      password: pw,
      target,
      doc,
      version: version ?? undefined,
    });
    setSaving(false);
    if (!ok) {
      const msg = String(data?.error || `Something went wrong (HTTP ${status || "unknown"}).`);
      setStateMsg("Not saved");
      notify(
        /conflict/i.test(msg)
          ? "Someone else saved changes while you were editing. Copy anything you need, then reload this page to get their version."
          : "Could not save: " + msg,
        "error"
      );
      return;
    }
    if (target === "guide") setGuideVer(data.version as number);
    else setRulesVer(data.version as number);
    setStateMsg("Published — the site is live");
    setDirty(false);
    notify("Published — the site is live");
  }

  function signOut() {
    try {
      sessionStorage.removeItem("phw_admin_pw");
    } catch {
      // ignore
    }
    window.location.reload();
  }

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  if (phase === "login") {
    return (
      <div className="adm-login">
        <h1>Phoenix of War 973</h1>
        <p>Officer access</p>
        <form onSubmit={login}>
          <input
            className="adm-field"
            type="password"
            value={loginPw}
            onChange={(e) => setLoginPw(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            required
          />
          <p className="adm-err">{loginErr}</p>
          <button className="btn-sm primary" style={{ width: "100%", padding: 12 }} type="submit" disabled={busyLogin}>
            {busyLogin ? "Checking…" : "Unlock"}
          </button>
        </form>
        <p style={{ marginTop: 28 }}>
          <Link href="/">&larr; Back to the site</Link>
        </p>
      </div>
    );
  }

  const go = (t: Tab) => {
    setTab(t);
    setView("edit");
    setGIdx(0);
    setSecIdx(0);
    window.scrollTo(0, 0);
  };

  const goHelp = () => {
    setTab("guide");
    setView("help");
    setGIdx(0);
    setSecIdx(0);
    window.scrollTo(0, 0);
  };

  const heading =
    view === "help" && tab === "guide"
      ? "How to use this editor"
      : tab === "rules"
        ? "Alliance rules editor"
        : "Guide editor";

  const navOn = (t: Tab, help = false) =>
    tab === t && view === (help ? "help" : "edit");

  return (
    <Toasts>
      <Dialogs>
      <div className="adm-shell">
        <header className="adm-appbar">
        <Link
          className="adm-brand"
          href="/"
          title="Phoenix of War 973 — back to the site"
        >
          <span className="adm-brand-full">Phoenix of War </span>PHW <em>973</em>
        </Link>
        <span className="adm-spacer" />
        <span className={"adm-state" + (dirty ? " dirty" : "")}>{stateMsg}</span>
        <button
          type="button"
          className="btn-sm"
          onClick={() => setPreview((p) => (p ? null : tab))}
        >
          Preview
        </button>
        <button
          type="button"
          className="btn-sm primary"
          onClick={save}
          disabled={!dirty || saving}
        >
          {saving ? "Saving…" : "Save & publish"}
        </button>
      </header>

      <div className="adm-layout">
        <nav className="adm-nav">
          <div className="adm-nav-group">
            <p className="adm-nav-label">Content</p>
            <button
              type="button"
              className={"adm-nav-item" + (navOn("guide") ? " on" : "")}
              aria-current={navOn("guide") ? "page" : undefined}
              onClick={() => go("guide")}
            >
              Guide
            </button>
            <button
              type="button"
              className={"adm-nav-item" + (navOn("rules") ? " on" : "")}
              aria-current={navOn("rules") ? "page" : undefined}
              onClick={() => go("rules")}
            >
              Rules
            </button>
          </div>
          <div className="adm-nav-group">
            <p className="adm-nav-label">Help</p>
            <button
              type="button"
              className={"adm-nav-item" + (navOn("guide", true) ? " on" : "")}
              aria-current={navOn("guide", true) ? "page" : undefined}
              onClick={goHelp}
            >
              How to use this editor
            </button>
          </div>
          <div className="adm-nav-group">
            <p className="adm-nav-label">Session</p>
            <SignOutButton dirty={dirty} onSignOut={signOut} />
          </div>
        </nav>

        <main className="adm-main">
          <p className="adm-eyebrow">Content editor</p>
          <h1 className="adm-title">{heading}</h1>
          <p className="adm-tagline">
            {view === "help"
              ? "Everything you need to know before editing the guide."
              : "Changes go live on the site when you press Save & publish."}
          </p>

          {tab === "guide" && view === "help" ? (
            <Manual onStart={() => go("guide")} />
          ) : tab === "guide" && guide ? (
            <GuideEditor
              doc={guide}
              touch={touch}
              password={pw}
              onError={(m) => notify(m, "error")}
              group={gIdx}
              current={secIdx}
              setGroup={setGIdx}
              setCurrent={setSecIdx}
            />
          ) : tab === "rules" && rules ? (
            <GuideEditor
              doc={rules}
              touch={touch}
              password={pw}
              onError={(m) => notify(m, "error")}
              group={gIdx}
              current={secIdx}
              setGroup={setGIdx}
              setCurrent={setSecIdx}
            />
          ) : null}

          {preview && (preview === "guide" ? guide : rules) ? (
            <LightboxProvider>
              <AdminPreview
                preview={preview}
                guide={guide}
                rules={rules}
                gIdx={gIdx}
                onClose={() => setPreview(null)}
              />
            </LightboxProvider>
          ) : null}
        </main>
      </div>
    </div>
      </Dialogs>
    </Toasts>
  );
}

function SignOutButton({ dirty, onSignOut }: { dirty: boolean; onSignOut: () => void }) {
  const ask = useDialogs();
  return (
    <button
      type="button"
      className="adm-nav-item"
      onClick={async () => {
        if (dirty) {
          const ok = await ask.confirm({
            title: "Sign out",
            message: "You have unsaved changes. Sign out anyway?",
            yesLabel: "Sign out",
            danger: true,
          });
          if (!ok) return;
        }
        onSignOut();
      }}
    >
      Sign out
    </button>
  );
}

// The admin preview: the current topic (Guide / Rules), exactly as readers
// will see them. Like the public lightbox it is a real dialog opened with
// showModal(), so it sits on top of everything with a backdrop instead of
// blending into the editor layout.
function AdminPreview({
  preview,
  guide,
  rules,
  gIdx,
  onClose,
}: {
  preview: Tab;
  guide: GuideDoc | null;
  rules: GuideDoc | null;
  gIdx: number;
  onClose: () => void;
}) {
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    el.showModal();
    return () => el.close();
  }, [preview]);

  return (
    <dialog
      ref={dlg}
      className="lb"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === dlg.current) onClose();
      }}
    >
      <div className="lb-bar">
        <strong style={{ flex: 1, font: "600 14px var(--font-body)" }}>
          Preview — this is how the page will look
        </strong>
        <button type="button" className="lb-btn lb-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div style={{ overflow: "auto", padding: "28px 20px" }}>
        <div className="wrap">
          {preview === "guide" && guide ? (
            <div className="guide-body">
              <GuideGroup group={guide.groups[gIdx] || { id: "empty", title: "", sections: [] }} />
            </div>
          ) : preview === "rules" && rules ? (
            <div className="guide-body">
              <GuideGroup group={rules.groups[gIdx] || { id: "empty", title: "", sections: [] }} />
            </div>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}