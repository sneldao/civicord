/**
 * Live The Graph Studio client for Civicord’s ENS candidate subgraph.
 * Browser CORS is open (`access-control-allow-origin: *`) — call Studio directly.
 */

export const SUBGRAPH_URL =
  "https://api.studio.thegraph.com/query/101650/civicord/v0.0.4";

/** Prefer same-origin worker proxy in the browser; Studio direct in Node/scripts. */
export function graphEndpoint(): string {
  if (typeof location !== "undefined" && location?.origin) {
    return `${location.origin}/api/graph`;
  }
  return SUBGRAPH_URL;
}

export type GraphCandidate = {
  id: string;
  ensName: string;
  label: string;
  owner: string;
  registeredAt: string;
  registeredAtBlock: string;
  resolver: string;
  status: string | null;
  url: string | null;
  personName: string | null;
  textRecordCount: string;
};

export type GraphStat = {
  id: string;
  candidateCount: string;
  liveCount: string;
  goneCount: string;
  textRecordCount: string;
  textRecordChangeCount: string;
};

export type GraphMeta = {
  block: { number: number };
  deployment: string;
  hasIndexingErrors: boolean;
};

type GraphQLResult<T> = { data?: T; errors?: { message: string }[] };

export async function querySubgraph<T>(
  query: string,
  variables?: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  const endpoint = graphEndpoint();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status} via ${endpoint}`);
  const body = (await res.json()) as GraphQLResult<T>;
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join("; "));
  }
  if (!body.data) throw new Error("Subgraph returned no data");
  return body.data;
}

export async function getSubgraphMeta(signal?: AbortSignal): Promise<{
  _meta: GraphMeta;
  stat: GraphStat | null;
  endpoint: string;
}> {
  const data = await querySubgraph<{ _meta: GraphMeta; stat: GraphStat | null }>(
    `{
      _meta { block { number } deployment hasIndexingErrors }
      stat(id: "civicord") {
        id candidateCount liveCount goneCount textRecordCount textRecordChangeCount
      }
    }`,
    undefined,
    signal
  );
  return { ...data, endpoint: graphEndpoint() };
}

export async function getOnchainCandidate(
  personId: string,
  signal?: AbortSignal
): Promise<GraphCandidate | null> {
  const id = String(personId).trim();
  if (!id) throw new Error("person id required");
  const data = await querySubgraph<{ candidate: GraphCandidate | null }>(
    `query ($id: ID!) {
      candidate(id: $id) {
        id ensName label owner registeredAt registeredAtBlock resolver
        status url personName textRecordCount
      }
    }`,
    { id },
    signal
  );
  return data.candidate;
}

export async function listRecentOnchainRegistrations(
  first = 10,
  signal?: AbortSignal
): Promise<GraphCandidate[]> {
  const n = Math.min(Math.max(first, 1), 50);
  const data = await querySubgraph<{ candidates: GraphCandidate[] }>(
    `query ($first: Int!) {
      candidates(first: $first, orderBy: registeredAt, orderDirection: desc) {
        id ensName label owner registeredAt registeredAtBlock resolver
        status url personName textRecordCount
      }
    }`,
    { first: n },
    signal
  );
  return data.candidates;
}

export async function getTextRecordChanges(
  opts: { personId?: string; first?: number } = {},
  signal?: AbortSignal
): Promise<
  {
    id: string;
    key: string;
    oldValue: string | null;
    newValue: string;
    blockNumber: string;
    timestamp: string;
    candidate: { id: string; ensName: string };
  }[]
> {
  const first = Math.min(Math.max(opts.first ?? 10, 1), 50);
  const personId = opts.personId?.trim();

  type Row = {
    id: string;
    key: string;
    oldValue: string | null;
    newValue: string;
    blockNumber: string;
    timestamp: string;
    candidate: { id: string; ensName: string };
  };

  if (personId) {
    const data = await querySubgraph<{ textRecordChanges: Row[] }>(
      `query ($first: Int!, $id: String!) {
        textRecordChanges(
          first: $first
          orderBy: timestamp
          orderDirection: desc
          where: { candidate: $id }
        ) {
          id key oldValue newValue blockNumber timestamp
          candidate { id ensName }
        }
      }`,
      { first, id: personId },
      signal
    );
    return data.textRecordChanges;
  }

  const data = await querySubgraph<{ textRecordChanges: Row[] }>(
    `query ($first: Int!) {
      textRecordChanges(first: $first, orderBy: timestamp, orderDirection: desc) {
        id key oldValue newValue blockNumber timestamp
        candidate { id ensName }
      }
    }`,
    { first },
    signal
  );
  return data.textRecordChanges;
}

type LedgerCandidate = {
  id?: string;
  name?: string;
  ens?: string;
  onchain?: { ens?: string; status?: string | null } | null;
  websites?: {
    url?: string;
    status?: string | null;
    statusClass?: string | null;
    redirected?: boolean;
    finalUrl?: string | null;
    nameFound?: boolean | null;
    audit?: {
      statusClass?: string;
      redirected?: boolean;
      finalUrl?: string | null;
      nameFound?: boolean | null;
    } | null;
  }[];
};

/** Join live Graph identity with the static audit ledger — meaningful agent work. */
export async function compareOnchainToLedger(
  personId: string,
  signal?: AbortSignal
): Promise<{
  personId: string;
  endpoint: string;
  onchain: GraphCandidate | null;
  ledger: {
    name: string | null;
    ens: string | null;
    websites: {
      url: string;
      statusClass: string | null;
      redirected: boolean;
      finalUrl: string | null;
      nameFound: boolean | null;
    }[];
  } | null;
  verdict: string[];
}> {
  const id = String(personId).trim();
  if (!id) throw new Error("person id required");

  const [onchain, ledgerRes] = await Promise.all([
    getOnchainCandidate(id, signal),
    fetch(`/api/candidates/${encodeURIComponent(id)}.json`, {
      headers: { accept: "application/json" },
      signal,
    }),
  ]);

  let ledgerRaw: LedgerCandidate | null = null;
  if (ledgerRes.ok) {
    ledgerRaw = (await ledgerRes.json()) as LedgerCandidate;
  } else if (ledgerRes.status !== 404) {
    throw new Error(`Ledger HTTP ${ledgerRes.status}`);
  }

  const websites =
    ledgerRaw?.websites?.map((w) => ({
      url: w.url ?? "",
      statusClass: w.status ?? w.statusClass ?? w.audit?.statusClass ?? null,
      redirected: !!(w.redirected ?? w.audit?.redirected),
      finalUrl: w.finalUrl ?? w.audit?.finalUrl ?? null,
      nameFound: w.nameFound ?? w.audit?.nameFound ?? null,
    })) ?? [];

  const verdict: string[] = [];
  if (!onchain) {
    verdict.push("No Candidate entity in The Graph for this person id (not registered, or wrong id).");
  } else {
    verdict.push(`On-chain name ${onchain.ensName} is indexed by The Graph (live Studio).`);
    verdict.push(
      `Registered at block ${onchain.registeredAtBlock} (unix ${onchain.registeredAt}).`
    );
    const tr = Number(onchain.textRecordCount);
    if (!tr) {
      verdict.push(
        "No text records indexed yet (url/status setText may still be pending on Sepolia)."
      );
    } else {
      if (onchain.status) verdict.push(`On-chain status text: ${onchain.status}.`);
      if (onchain.url) verdict.push(`On-chain url text: ${onchain.url}.`);
    }
  }

  if (!ledgerRaw) {
    verdict.push("No static ledger JSON for this id.");
  } else {
    verdict.push(`Ledger name: ${ledgerRaw.name ?? "—"}.`);
    if (!websites.length) {
      verdict.push("Ledger has no websites for this candidate.");
    } else {
      for (const w of websites) {
        const bits = [w.statusClass ?? "unknown"];
        if (w.redirected) bits.push("redirected");
        if (w.nameFound === false) bits.push("surname absent");
        verdict.push(`Ledger site ${w.url || "(empty)"} → ${bits.join(", ")}.`);
      }
    }
    if (onchain?.status && websites.length) {
      const classes = new Set(websites.map((w) => w.statusClass).filter(Boolean));
      if (classes.size && !classes.has(onchain.status)) {
        verdict.push(
          `On-chain status (${onchain.status}) differs from ledger class(es) (${[...classes].join(", ")}).`
        );
      }
    }
  }

  return {
    personId: id,
    endpoint: graphEndpoint(),
    onchain,
    ledger: ledgerRaw
      ? {
          name: ledgerRaw.name ?? null,
          ens: ledgerRaw.ens ?? ledgerRaw.onchain?.ens ?? null,
          websites,
        }
      : null,
    verdict,
  };
}
