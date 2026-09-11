/** Interruptible dialog open/close — CSS class choreography, not instant display:none. */

const REDUCED = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

type DialogExtra = HTMLDialogElement & {
  __closePromise?: Promise<void> | null;
  __closeToken?: number;
};

function durationMs(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--duration-ui").trim();
  if (raw.endsWith("ms")) return Number.parseFloat(raw) || 200;
  if (raw.endsWith("s")) return (Number.parseFloat(raw) || 0.2) * 1000;
  return 200;
}

/** Open (or re-open while closing — interrupts the exit). */
export function openDialog(dlg: HTMLDialogElement): void {
  const d = dlg as DialogExtra;
  d.__closeToken = (d.__closeToken ?? 0) + 1;
  d.__closePromise = null;
  d.classList.remove("is-closing");

  if (!d.open) {
    try {
      d.showModal();
    } catch {
      d.setAttribute("open", "");
    }
  }

  // Retrigger enter if we interrupted a close mid-flight.
  d.classList.remove("is-entering");
  void d.offsetWidth;
  d.classList.add("is-entering");
  window.setTimeout(() => d.classList.remove("is-entering"), durationMs() + 40);
}

/** Animate out, then close. Safe to call repeatedly; returns the in-flight promise. */
export function closeDialog(dlg: HTMLDialogElement): Promise<void> {
  const d = dlg as DialogExtra;
  if (!d.open) return Promise.resolve();

  if (REDUCED()) {
    d.classList.remove("is-closing", "is-entering");
    d.close();
    d.__closePromise = null;
    return Promise.resolve();
  }

  if (d.__closePromise) return d.__closePromise;

  const token = (d.__closeToken ?? 0) + 1;
  d.__closeToken = token;
  d.classList.remove("is-entering");
  d.classList.add("is-closing");

  const p = new Promise<void>((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      d.removeEventListener("transitionend", onEnd);
      if (d.__closeToken !== token) {
        // Interrupted by a newer open/close — don't force-close.
        resolve();
        return;
      }
      d.classList.remove("is-closing");
      if (d.open) d.close();
      d.__closePromise = null;
      resolve();
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== d) return;
      if (e.propertyName !== "opacity" && e.propertyName !== "transform") return;
      finish();
    };
    d.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, durationMs() + 80);
  });

  d.__closePromise = p;
  return p;
}

/** Wire Esc (cancel) + backdrop click to interruptible close. */
export function bindDialogChrome(
  dlg: HTMLDialogElement,
  opts: { onClosed?: () => void } = {}
): void {
  dlg.addEventListener("cancel", (e) => {
    e.preventDefault();
    void closeDialog(dlg).then(() => opts.onClosed?.());
  });
  dlg.addEventListener("close", () => {
    dlg.classList.remove("is-closing", "is-entering");
    opts.onClosed?.();
  });
}
