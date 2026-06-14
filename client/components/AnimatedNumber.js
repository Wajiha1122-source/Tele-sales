"use client";
import { useEffect, useState } from "react";

export default function AnimatedNumber({ value = 0, suffix = "" }) {
  const numeric = Number(value) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame;
    const started = performance.now();
    const duration = 700;
    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numeric * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric]);

  return <>{display}{suffix}</>;
}
