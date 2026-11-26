/**
 * Evidence choreography: count only meaningful numbers, draw explanatory
 * connectors, and reveal verification steps in sequence. Everything is once-only,
 * deterministic, viewport-triggered, and disabled for reduced motion.
 */

function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function finishImmediately(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>("[data-count-to]")) {
    el.textContent = el.dataset.countLabel ?? el.textContent;
  }
  for (const el of root.querySelectorAll<HTMLElement>("[data-motion-evidence]")) {
    el.classList.add("motion-done");
  }
}

function formatDuring(value: number, finalText: string): string {
  const grouping = finalText.includes(",");
  const rounded = Math.round(value);
  return grouping ? rounded.toLocaleString("en-GB") : String(rounded);
}

function animateCount(el: HTMLElement): void {
  const target = Number(el.dataset.countTo ?? "0");
  const finalText = el.dataset.countLabel ?? el.textContent ?? String(target);
  const duration = Number(el.dataset.countDuration ?? "900");
  const start = performance.now();

  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = t >= 1 ? finalText : formatDuring(target * eased, finalText);
    if (t < 1) requestAnimationFrame(frame);
  };

  el.textContent = formatDuring(0, finalText);
  requestAnimationFrame(frame);
}

export function initEvidenceMotion(root: ParentNode = document): () => void {
  const scopes = [...root.querySelectorAll<HTMLElement>("[data-motion-evidence]")];
  if (!scopes.length) return () => {};

  if (reducedMotion() || !("IntersectionObserver" in window)) {
    finishImmediately(root);
    return () => {};
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const scope = entry.target as HTMLElement;
        scope.classList.add("motion-done");
        for (const counter of scope.querySelectorAll<HTMLElement>("[data-count-to]")) {
          if (!counter.dataset.countStarted) {
            counter.dataset.countStarted = "1";
            animateCount(counter);
          }
        }
        io.unobserve(scope);
      }
    },
    { threshold: 0.25, rootMargin: "0px 0px -6% 0px" }
  );

  for (const scope of scopes) io.observe(scope);

  return () => {
    io.disconnect();
  };
}
