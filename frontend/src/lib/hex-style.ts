// Shared halftone encode for jurisdiction hexes — used by the interactive
// map (HalftoneHexMap) and the static thumbnail (HexThumb).

export interface HexStatLike {
  sites: number;
  livePct: number;
}

export function hexFillFor(stats: HexStatLike): string {
  if (stats.sites === 0) return "var(--paper-deep)"; // empty — 17 seats with no scraped site
  const p = stats.livePct;
  if (p >= 66) return "var(--live)";
  if (p >= 40) return "var(--warn)";
  return "var(--gone)";
}

export function hexOpacityFor(stats: HexStatLike): number {
  if (stats.sites === 0) return 0.22;
  if (stats.livePct >= 66) return 0.88;
  if (stats.livePct >= 40) return 0.72;
  return 0.95;
}

export function hexDotCountFor(stats: HexStatLike): number {
  if (stats.sites === 0) return 0;
  if (stats.livePct >= 66) return 1;
  if (stats.livePct >= 40) return 2;
  return 3;
}
