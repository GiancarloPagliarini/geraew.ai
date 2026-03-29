"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export function useCountUp(target: number, duration = 2200) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const triggered = useRef(false);

  const animate = useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // custom ease-out-expo
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setCount(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) animate(); },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  return { ref, count };
}
