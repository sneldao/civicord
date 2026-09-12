/**
 * Editorial scroll reveal — IntersectionObserver only.
 * Marks [data-reveal] with .is-in once; respects reduced motion.
 * Re-runs on astro:page-load for ClientRouter navigations.
 */

const SELECTOR = "[data-reveal]";

function prefersReducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealAll(root: ParentNode = document): void {
  for (const el of root.querySelectorAll(SELECTOR)) {
    el.classList.add("is-in");
  }
}

export function initScrollReveal(root: ParentNode = document): () => void {
  const nodes = [...root.querySelectorAll<HTMLElement>(SELECTOR)].filter(
    (el) => !el.classList.contains("is-in")
  );

  if (!nodes.length) return () => {};

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    revealAll(root);
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.classList.add("is-in");
        io.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  for (const el of nodes) io.observe(el);

  // Anything already in the first viewport should settle immediately
  // (IO can lag a frame; avoid a blank first paint).
  requestAnimationFrame(() => {
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (rect.top < innerHeight * 0.92 && rect.bottom > 0) {
        el.classList.add("is-in");
        io.unobserve(el);
      }
    }
  });

  // Failsafe: never leave content invisible if IO never fires.
  const failsafe = window.setTimeout(() => revealAll(root), 2500);

  return () => {
    window.clearTimeout(failsafe);
    io.disconnect();
  };
}
