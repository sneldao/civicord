// The change-signal axis, not the HTTP axis: what the audit *implies*.
// Its own module because both the site and the MCP server export these words —
// anything leaving either surface carries the label, never the slug.

export const CHANGE_LABELS: Record<string, string> = {
  gone: "DNS / connection failure",
  repurposed_suspect: "Surname absent (review needed)",
  redirected: "Redirected",
  still_attested: "Responding, no redirect recorded",
  other: "Other / residual",
  unaudited: "Unaudited",
};

// claims_disappeared is the claim-diff axis, not a site signal: it belongs in
// exported text but not in the browse filter vocabulary.
export const changeLabel = (signal: string): string =>
  CHANGE_LABELS[signal] ??
  (signal === "claims_disappeared" ? "Sentences not found on the homepage fetch" : signal);
