export const AUDIT_DATE = "2026-09-07";
export const RECORD_ORIGIN = "https://civicord.pages.dev";

export const statusLabels: Record<string, string> = {
  live: "Responding",
  http_error: "HTTP error",
  dns_error: "DNS failure",
  timeout: "Timed out",
  ssl_error: "SSL error",
  connection_error: "Connection failed",
  other_error: "Error",
};

type Website = {
  url: string;
  audit?: {
    statusClass: string;
    statusCode?: string | number | null;
    redirected?: boolean;
    finalUrl?: string | null;
    nameFound?: boolean | null;
  } | null;
};

export function recordVerdictCopy(verdict: string, name: string): [string, string] {
  const copies: Record<string, [string, string]> = {
    live: ["URLs responding", `${name}'s recorded URLs returned successful HTTP responses at the ${AUDIT_DATE} audit. This does not establish that campaign content survived.`],
    mixed: ["Mixed HTTP results", `Some of ${name}'s recorded URLs responded successfully and others did not at the ${AUDIT_DATE} audit.`],
    gone: ["URLs unreachable", `${name}'s recorded URLs had DNS or connection failures at the ${AUDIT_DATE} audit. This does not establish permanent removal.`],
    unknown: ["Audit record", `Inspect the individual HTTP results and available source excerpts for ${name}. Unavailable content is not proof of deliberate deletion.`],
  };
  return copies[verdict] ?? copies.unknown;
}

export function describeWebsite(website: Website): string {
  const audit = website.audit;
  if (!audit) return `${website.url} — not audited.`;
  const result = statusLabels[audit.statusClass] ?? audit.statusClass;
  const code = audit.statusCode == null ? "" : ` (HTTP ${audit.statusCode})`;
  const redirect = audit.redirected
    ? ` Redirect destination: ${audit.finalUrl || "not recorded"}.`
    : " No redirect recorded.";
  const name = audit.nameFound === true
    ? "Surname matched in the response body"
    : audit.nameFound === false
      ? "Surname not found in the response body"
      : "Not assessed";
  return `${website.url} — HTTP result: ${result}${code}.${redirect} Candidate-name signal: ${name} (heuristic only).`;
}

export function candidateCitation(person: { id: string; name: string; websites: Website[] }): string {
  const audited = person.websites.some((website) => website.audit);
  return [
    `Civicord — ${person.name} (Democracy Club person ID ${person.id}).`,
    audited ? `Audit date: ${AUDIT_DATE}.` : "No audit available for this record.",
    ...person.websites.map(describeWebsite),
    "Source: Campaign Lab April 2025 scrape; Democracy Club person IDs; Civicord HTTP audit.",
    "HTTP responses and surname matches do not establish that campaign content survived. ENS records are on the Sepolia testnet; full content is not stored on-chain.",
    `Record: ${RECORD_ORIGIN}/candidates/${encodeURIComponent(person.id)}`,
  ].join("\n");
}
