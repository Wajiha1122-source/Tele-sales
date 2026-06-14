"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "irshad-intro-seen-v3";

export default function CinematicLoader() {
  // Render the curtain in the initial HTML so the page cannot flash before hydration.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySeen = sessionStorage.getItem(STORAGE_KEY);

    if (reducedMotion || alreadySeen) {
      setVisible(false);
      return;
    }

    document.body.classList.add("cinematic-loading");
    sessionStorage.setItem(STORAGE_KEY, "true");

    const timer = window.setTimeout(() => {
      setVisible(false);
      document.body.classList.remove("cinematic-loading");
    }, 4900);

    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("cinematic-loading");
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="cinematic-loader" aria-hidden="true">
      <div className="cinematic-loader__glow" />
      <div className="cinematic-loader__content">
        <div className="cinematic-loader__eyebrow">Sales intelligence</div>
        <div className="cinematic-loader__mask">
          <span>IRSHAD</span>
        </div>
        <div className="cinematic-loader__mask cinematic-loader__mask--accent">
          <span>&amp; COMPANY</span>
        </div>
        <div className="cinematic-loader__progress"><span /></div>
      </div>
      <div className="cinematic-loader__curtain cinematic-loader__curtain--left" />
      <div className="cinematic-loader__curtain cinematic-loader__curtain--right" />
    </div>
  );
}
