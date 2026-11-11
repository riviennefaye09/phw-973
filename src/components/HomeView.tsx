"use client";

import Link from "next/link";
import { PhoenixAnimation } from "./PhoenixAnimation";

// The home page — a static, visually striking landing that introduces the
// server. No CMS dependency: this is the alliance's identity, written once.

export default function HomeView() {
  return (
    <>
      {/* ===== HERO ===== */}
      <div className="hero hero-home">
        <div className="hero-bg-particles" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="hero-particle"
              style={{
                left: `${(i * 2.6) % 100}%`,
                animationDelay: `${(i * 0.7) % 8}s`,
                animationDuration: `${6 + (i % 6) * 1.5}s`,
                opacity: 0.15 + (i % 5) * 0.08,
                width: `${2 + (i % 4)}px`,
                height: `${2 + (i % 4)}px`,
              }}
            />
          ))}
        </div>

        {/* Rotating circles behind the title */}
        <div className="hero-rings" aria-hidden="true">
          <div className="hero-ring hero-ring-1" />
          <div className="hero-ring hero-ring-2" />
          <div className="hero-ring hero-ring-3" />
        </div>

        <div className="wrap hero-center">
          <h1 className="hero-title">
            <span className="hero-title-phoenix">Phoenix of War</span>
            <span className="hero-title-num">973</span>
          </h1>
          <p className="motto">From ashes, to flame.</p>
          <div className="btn-row">
            <Link className="btn btn-primary" href="/guide">
              Read Season Guides
            </Link>
          </div>
        </div>
      </div>

      {/* ===== WHO WE ARE ===== */}
      <section id="about">
        <div className="wrap">
          <div className="about-grid">
            <div className="about-content">
              <p className="eyebrow">About</p>
              <h2>Who We Are</h2>
              <p className="lead">
                PHW is a Call of Dragons alliance that plays to win without turning it into a
                second job. We have members across every timezone, so there is always someone
                online — whether that is for a rally, a question, or just bad jokes in chat.
              </p>
              <p className="lead">
                This site collects what we have learned along the way: strategies that work,
                mistakes to avoid, and the answers to the stuff people ask when they first join.
              </p>
              <dl className="facts about-facts">
                <div>
                  <dt>Game</dt>
                  <dd>Call of Dragons</dd>
                </div>
                <div>
                  <dt>Discord</dt>
                  <dd>
                    <a href="https://discord.gg/cMPSMpmdCC" target="_blank" rel="noopener">
                      discord.gg/cMPSMpmdCC
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="about-emblem about-emblem-lg">
              <div className="emblem-ring" aria-hidden="true" />
              <div className="emblem-ring emblem-ring-2" aria-hidden="true" />
              <div className="emblem-ring emblem-ring-3" aria-hidden="true" />
              <img
                src="/img/phoenix.webp"
                width={600}
                height={600}
                decoding="async"
                alt="Phoenix of War emblem — a phoenix rising with its wings spread in flame"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW WE PLAY ===== */}
      <section id="values">
        <div className="wrap">
          <p className="eyebrow">How We Play</p>
          <h2>What We Stand On</h2>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Rise Together</h3>
              <p>Members get carried through their weak weeks. Everyone has them.</p>
            </div>
            <div className="value-card">
              <div className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Share Everything</h3>
              <p>Discoveries go into the guide, not into a private chat with three people.</p>
            </div>
            <div className="value-card">
              <div className="value-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              </div>
              <h3>Show Up</h3>
              <p>You do not have to be the strongest. You do have to be there when it counts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== START HERE — CTA ===== */}
      <section id="start-here">
        <div className="wrap">
          <div className="hub-cta">
            <div>
              <h3>New to PHW?</h3>
              <p>
                Read the guides, know the rules, then say hello on Discord. If anything is
                unclear, ask — nobody expects you to know it all yet.
              </p>
            </div>
            <Link className="btn btn-primary" href="/guide">
              Open the guides
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
