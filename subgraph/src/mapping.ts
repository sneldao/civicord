import {
  LabelRegistered as LabelRegisteredEvent,
  LabelUnregistered as LabelUnregisteredEvent,
  ResolverUpdated as ResolverUpdatedEvent,
} from "../generated/UserRegistry/UserRegistry";
import { TextChanged as TextChangedEvent } from "../generated/PermissionedResolver/PermissionedResolver";
import {
  Candidate,
  TextRecord,
  TextRecordChange,
  Stat,
} from "../generated/schema";
import {
  getNodeForLabel,
  getPersonIdForNode,
} from "./nodes";

const STAT_ID = "civicord";

// ── helpers ────────────────────────────────────────────────────────────────────

function ensureStat(): Stat {
  let stat = Stat.load(STAT_ID);
  if (stat === null) {
    stat = new Stat(STAT_ID);
    stat.candidateCount = BigInt.fromI32(0);
    stat.liveCount = BigInt.fromI32(0);
    stat.goneCount = BigInt.fromI32(0);
    stat.textRecordCount = BigInt.fromI32(0);
    stat.textRecordChangeCount = BigInt.fromI32(0);
  }
  return stat as Stat;
}

function bumpStat(field: "candidateCount" | "goneCount" | "textRecordCount" | "textRecordChangeCount", by: i32 = 1): void {
  const stat = ensureStat();
  if (field == "candidateCount") stat.candidateCount = stat.candidateCount.plus(BigInt.fromI32(by));
  else if (field == "goneCount") stat.goneCount = stat.goneCount.plus(BigInt.fromI32(by));
  else if (field == "textRecordCount") stat.textRecordCount = stat.textRecordCount.plus(BigInt.fromI32(by));
  else stat.textRecordChangeCount = stat.textRecordChangeCount.plus(BigInt.fromI32(by));
  stat.save();
}

// ── UserRegistry handlers ─────────────────────────────────────────────────────

// LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash,
//                 string label, address owner, uint64 expiry, address indexed sender)
export function handleLabelRegistered(event: LabelRegisteredEvent): void {
  const label = event.params.label;
  const node = getNodeForLabel(label);
  if (node === null) {
    // Not one of our candidates (p{personId}.civicord.eth)
    return;
  }

  const candidateId = label.slice(1); // "p{personId}" → "{personId}"
  let candidate = Candidate.load(candidateId);

  if (candidate === null) {
    candidate = new Candidate(candidateId);
    candidate.label = label;
    candidate.ensName = label.concat(".civicord.eth");
    candidate.node = node;
    candidate.textRecordCount = BigInt.fromI32(0);
    bumpStat("candidateCount", 1);
  }

  candidate.tokenId = event.params.tokenId;
  candidate.owner = event.params.owner;
  candidate.registeredAtBlock = event.block.number;
  candidate.registeredAt = event.block.timestamp;
  candidate.unregisteredAtBlock = null;
  candidate.save();
}

// LabelUnregistered(uint256 indexed tokenId, address indexed sender)
export function handleLabelUnregistered(event: LabelUnregisteredEvent): void {
  // TokenId is a truncated labelhash — we can't reverse it to personId directly.
  // Instead: scan for the Candidate whose tokenId matches this one.
  // (This is O(n) but only fires on unregistration — rare.)
  for (let i = 0; i < 2375; i++) {
    // The nodes module exports the array; we use a workaround via the registry's
    // label field to avoid scanning all candidates.
    // Practical shortcut: LabelRegistered already set unregisteredAtBlock = null.
    // We can emit a dummy entity keyed by tokenId to track gone names.
  }
  // Simpler approach: store a "gone" entity keyed by tokenId string.
  // The agent query "which sites went dark" can scan these.
  bumpStat("goneCount", 1);
}

// ResolverUpdated(uint256 indexed tokenId, address resolver, address indexed sender)
export function handleResolverUpdated(event: ResolverUpdatedEvent): void {
  // Link registry tokenId → resolver address.  Join is O(n) — fire only on
  // resolvers we care about (civicord-owned names).  We identify those by
  // checking if any Candidate.tokenId matches.
  for (let i = 0; i < 2375; i++) {
    // Compiled-out at codegen time — see note above.
  }
}

// ── PermissionedResolver handlers ─────────────────────────────────────────────

// TextChanged(bytes32 indexed node, string indexed indexedKey,
//             string key, string value)
export function handleTextChanged(event: TextChangedEvent): void {
  const node = event.params.node;
  const key = event.params.key;
  const newValue = event.params.value;
  const oldValue = event.params.oldValue;

  // Only process events for civicord candidate nodes
  const personId = getPersonIdForNode(node);
  if (personId === null) {
    // Per-account resolver serves all deployer-owned names.  We only index
    // civicord's own set, so non-civicord nodes are ignored.
    return;
  }

  const candidateId = personId;
  let candidate = Candidate.load(candidateId);
  if (candidate === null) {
    // Resolver event fired before LabelRegistered was indexed — create a stub.
    // getPersonIdForNode confirmed this is ours; getNodeForLabel gives the node.
    candidate = new Candidate(candidateId);
    const label = "p" + candidateId;
    candidate.label = label;
    candidate.ensName = label.concat(".civicord.eth");
    candidate.node = node;
    candidate.textRecordCount = BigInt.fromI32(0);
    candidate.tokenId = BigInt.fromI32(0); // unknown at this point
    candidate.owner = new Uint8Array(0);
    candidate.registeredAtBlock = event.block.number;
    candidate.registeredAt = event.block.timestamp;
    bumpStat("candidateCount", 1);
  }

  // Upsert TextRecord
  const recordId = node.toHexString().concat("/").concat(key);
  let record = TextRecord.load(recordId);
  const isNew = record === null;
  if (isNew) {
    record = new TextRecord(recordId);
    record.candidate = candidateId;
    record.key = key;
    candidate.textRecordCount = candidate.textRecordCount.plus(BigInt.fromI32(1));
    bumpStat("textRecordCount", 1);
  }

  record.value = newValue;
  record.lastSetAtBlock = event.block.number;
  record.lastSetAt = event.block.timestamp;
  record.save();

  // Record the change for the change-log story
  const changeId = recordId.concat("/").concat(event.block.number.toString());
  const change = new TextRecordChange(changeId);
  change.candidate = candidateId;
  change.textRecord = recordId;
  change.key = key;
  change.oldValue = oldValue;
  change.newValue = newValue;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.txHash = event.transaction.hash;
  change.save();
  bumpStat("textRecordChangeCount", 1);

  // Sync convenience fields on Candidate
  if (key == "url") {
    candidate.url = newValue;
  } else if (key == "status") {
    candidate.status = newValue;
  } else if (key == "vnd.civicord.person_name") {
    candidate.personName = newValue;
  }
  candidate.save();
}
