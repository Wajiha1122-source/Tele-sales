"use client";
import { useEffect, useRef } from "react";

export default function Reveal({ children, className = "", delay = 0, variant = "up" }) {
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let fallbackTimer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
          observer.unobserve(node);
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(node);
    fallbackTimer = window.setTimeout(() => {
      node.classList.add("is-visible");
      observer.unobserve(node);
    }, 900);

    return () => {
      window.clearTimeout(fallbackTimer);
      observer.disconnect();
    };
  }, []);

  return <div ref={ref} className={`reveal reveal-${variant} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
