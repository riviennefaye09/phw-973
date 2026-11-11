"use client";

import { useEffect, useState } from "react";

// Majestic animated phoenix — uses the phoenix emblem with stunning CSS
// animations for flying, landing, wing spreading, fiery aura, glowing
// eyes, and ember particles.

type Phase = "entrance" | "flying" | "landing" | "spread" | "idle";

export function PhoenixAnimation({ className }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("entrance");

  useEffect(() => {
    // Phoenix animation sequence: fly in → fly around → land → spread wings → idle
    const timers: NodeJS.Timeout[] = [];
    
    timers.push(setTimeout(() => setPhase("flying"), 1000));
    timers.push(setTimeout(() => setPhase("landing"), 4000));
    timers.push(setTimeout(() => setPhase("spread"), 5500));
    timers.push(setTimeout(() => setPhase("idle"), 7500));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={`phoenix-hero${className ? ` ${className}` : ""}`} aria-hidden="true">
      {/* Intense fire glow background */}
      <div className="phoenix-fire-glow" />
      <div className="phoenix-fire-glow secondary" />
      
      {/* Floating ember particles */}
      <div className="phoenix-particles">
        {Array.from({ length: 35 }, (_, i) => (
          <span
            key={i}
            className="ember"
            style={{
              left: `${3 + (i * 2.9) % 94}%`,
              animationDelay: `${(i * 0.35) % 7}s`,
              animationDuration: `${2.5 + (i % 5) * 0.7}s`,
              width: `${2 + (i % 6)}px`,
              height: `${2 + (i % 6)}px`,
            }}
          />
        ))}
      </div>

      {/* Main phoenix image with phase animations */}
      <div className={`phoenix-image-wrapper phase-${phase}`}>
        {/* Aura rings behind phoenix */}
        <div className="phoenix-aura-ring ring-1" />
        <div className="phoenix-aura-ring ring-2" />
        <div className="phoenix-aura-ring ring-3" />
        
        <img
          src="/img/phoenix.webp"
          alt=""
          className="phoenix-image"
          width={500}
          height={500}
          decoding="async"
        />
        
        {/* Glowing red eye effects */}
        <div className="phoenix-eye-glow left-eye" />
        <div className="phoenix-eye-glow right-eye" />
        
        {/* Flame trail effects on wings */}
        <div className="phoenix-flame-trail left-wing" />
        <div className="phoenix-flame-trail right-wing" />
      </div>

      {/* Rising fire sparks from bottom */}
      <div className="phoenix-fire-rising">
        {Array.from({ length: 20 }, (_, i) => (
          <span
            key={i}
            className="fire-spark"
            style={{
              left: `${10 + (i * 4.5) % 80}%`,
              animationDelay: `${(i * 0.4) % 5}s`,
              animationDuration: `${1.8 + (i % 4) * 0.6}s`,
            }}
          />
        ))}
      </div>

      {/* Radial light bursts */}
      <div className="phoenix-light-burst burst-1" />
      <div className="phoenix-light-burst burst-2" />
    </div>
  );
}
