import {
  BigInt,
  Bytes,
  Address,
  ByteArray,
  crypto,
} from "@graphprotocol/graph-ts";
import {
  LabelRegistered as LabelRegisteredEvent,
  LabelUnregistered as LabelUnregisteredEvent,
  ResolverUpdated as ResolverUpdatedEvent,
} from "../generated/UserRegistry/UserRegistry";
import { TextChanged as TextChangedEvent } from "../generated/PermissionedResolver/PermissionedResolver";
import {
  Candidate,
  NodeToCandidate,
  TextRecord,
  TextRecordChange,
  Stat,
} from "../generated/schema";

const STAT_ID = "civicord";
// namehash("civicord.eth") — ENSv2 TextChanged.node is namehash(label + "." + parent),
// NOT the registry tokenId / labelhash.
const PARENT_NODE = Bytes.fromHexString(
  "0x58cd121c6585c4277ede8c4346da1debf473ececccbc87b788e669ed80392499"
);

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
    stat.save();
  }
  return stat as Stat;
}

function bumpStat(field: string, by: i32 = 1): void {
  const stat = ensureStat();
  if (field == "candidateCount") {
    stat.candidateCount = stat.candidateCount.plus(BigInt.fromI32(by));
  } else if (field == "goneCount") {
    stat.goneCount = stat.goneCount.plus(BigInt.fromI32(by));
  } else if (field == "textRecordCount") {
    stat.textRecordCount = stat.textRecordCount.plus(BigInt.fromI32(by));
  } else {
    stat.textRecordChangeCount = stat.textRecordChangeCount.plus(BigInt.fromI32(by));
  }
  stat.save();
}

function paddedHex(hexRaw: string): string {
  // Graph's BigInt.toHexString() strips leading zeros (e.g. "0x1"), while
  // Bytes.toHexString() returns 0x + 64 hex chars. We need 32-byte
  // zero-padded, lower-case, 0x + 64 hex for every key so the
  // NodeToCandidate lookup is exact. Odd-length "0x1" would also make
  // Bytes.fromHexString throw a deterministic indexing error.
  let lower = hexRaw.toLowerCase();
  let without = lower.slice(2); // strip 0x
  if (without.length > 64) {
    without = without.slice(without.length - 64);
  }
  if (without.length == 64) {
    return "0x" + without;
  }
  let zeros = "";
  for (let i = 0; i < 64 - without.length; i++) {
    zeros += "0";
  }
  return "0x" + zeros + without;
}

function tokenIdHex(tokenId: BigInt): string {
  return paddedHex(tokenId.toHexString());
}

function nodeHex(node: Bytes): string {
  return paddedHex(node.toHexString());
}

/** Full ENS node = keccak256(parentNode ‖ labelHash). */
function nodeFromLabelHash(labelHash: Bytes): Bytes {
  const packed = PARENT_NODE.concat(labelHash);
  return Bytes.fromByteArray(crypto.keccak256(changetype<ByteArray>(packed)));
}

function emptyResolver(): Bytes {
  return changetype<Bytes>(Address.zero());
}

function personIdFromLabel(label: string): string {
  if (label.length > 1 && label.charAt(0) == "p") {
    return label.slice(1);
  }
  return label;
}

// ── UserRegistry handlers ─────────────────────────────────────────────────────

export function handleLabelRegistered(event: LabelRegisteredEvent): void {
  const label = event.params.label;
  if (label.length == 0) {
    return;
  }
  const personId = personIdFromLabel(label);
  if (personId.length == 0) {
    return;
  }
  let candidate = Candidate.load(personId);

  // TextChanged.node is namehash("p{id}.civicord.eth"), not tokenId/labelHash.
  const nodeBytes = nodeFromLabelHash(changetype<Bytes>(event.params.labelHash));
  const nId = nodeHex(nodeBytes);

  if (candidate === null) {
    candidate = new Candidate(personId);
    candidate.label = label;
    candidate.ensName = label + ".civicord.eth";
    candidate.node = nodeBytes;
    candidate.tokenId = event.params.tokenId;
    candidate.owner = changetype<Bytes>(event.params.owner);
    candidate.resolver = emptyResolver();
    candidate.registeredAtBlock = event.block.number;
    candidate.registeredAt = event.block.timestamp;
    candidate.unregisteredAtBlock = null;
    candidate.textRecordCount = BigInt.fromI32(0);
    bumpStat("candidateCount", 1);
  } else {
    candidate.owner = changetype<Bytes>(event.params.owner);
    candidate.node = nodeBytes;
    candidate.tokenId = event.params.tokenId;
    candidate.registeredAtBlock = event.block.number;
    candidate.registeredAt = event.block.timestamp;
    candidate.unregisteredAtBlock = null;
  }
  candidate.save();

  // Dual keys: namehash node (TextChanged) + tokenId hex (ResolverUpdated / Unregister).
  const tokenKey = tokenIdHex(event.params.tokenId);
  const keys = [nId, tokenKey];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    let nodeMap = NodeToCandidate.load(key);
    if (nodeMap === null) {
      nodeMap = new NodeToCandidate(key);
      nodeMap.candidate = personId;
      nodeMap.save();
    } else if (nodeMap.candidate != personId) {
      nodeMap.candidate = personId;
      nodeMap.save();
    }
  }
}

export function handleLabelUnregistered(event: LabelUnregisteredEvent): void {
  const nId = tokenIdHex(event.params.tokenId);
  const nodeMap = NodeToCandidate.load(nId);
  if (nodeMap !== null) {
    const candidate = Candidate.load(nodeMap.candidate);
    if (candidate !== null) {
      candidate.unregisteredAtBlock = event.block.number;
      candidate.save();
    }
  }
  bumpStat("goneCount", 1);
}

export function handleResolverUpdated(event: ResolverUpdatedEvent): void {
  const nId = tokenIdHex(event.params.tokenId);
  const nodeMap = NodeToCandidate.load(nId);
  if (nodeMap === null) {
    return;
  }
  const candidate = Candidate.load(nodeMap.candidate);
  if (candidate === null) {
    return;
  }
  candidate.resolver = changetype<Bytes>(event.params.resolver);
  candidate.save();
}

// ── PermissionedResolver handlers ─────────────────────────────────────────────

export function handleTextChanged(event: TextChangedEvent): void {
  const nId = nodeHex(event.params.node);
  const nodeMap = NodeToCandidate.load(nId);
  if (nodeMap === null) {
    // Not one of our candidate names (different ENS tree or pre-v0.0.1 block).
    return;
  }

  const personId = nodeMap.candidate;
  let candidate = Candidate.load(personId);
  if (candidate === null) {
    return;
  }

  const key = event.params.key;
  const value = event.params.value;
  const recordId = nId + "/" + key;

  let record = TextRecord.load(recordId);
  let oldValue: string = "";
  if (record === null) {
    record = new TextRecord(recordId);
    record.candidate = personId;
    record.key = key;
    record.value = value;
    record.lastSetAtBlock = event.block.number;
    record.lastSetAt = event.block.timestamp;
    record.save();
    candidate.textRecordCount = candidate.textRecordCount.plus(BigInt.fromI32(1));
    bumpStat("textRecordCount", 1);
  } else {
    oldValue = record.value;
    record.value = value;
    record.lastSetAtBlock = event.block.number;
    record.lastSetAt = event.block.timestamp;
    record.save();
  }

  const changeId = recordId + "/" + event.block.number.toString() + "/" + event.logIndex.toString();
  const change = new TextRecordChange(changeId);
  change.candidate = personId;
  change.textRecord = recordId;
  change.key = key;
  change.oldValue = oldValue;
  change.newValue = value;
  change.blockNumber = event.block.number;
  change.timestamp = event.block.timestamp;
  change.txHash = event.transaction.hash;
  change.save();

  bumpStat("textRecordChangeCount", 1);

  if (key == "url") {
    candidate.url = value;
  } else if (key == "status") {
    candidate.status = value;
  } else if (key == "vnd.civicord.person_name") {
    candidate.personName = value;
  }
  candidate.save();
}
