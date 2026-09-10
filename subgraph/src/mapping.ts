import {
  BigInt,
  Bytes,
  Address,
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

function tokenIdHex(tokenId: BigInt): string {
  // BigInt.toHexString() on Graph is 0x + 64 hex chars (32 bytes) — lower-case,
  // same format as Bytes.toHexString(). Use this consistently for node↔candidate
  // lookup so TextChanged (bytes32 node) matches LabelRegistered (uint256 tokenId).
  return tokenId.toHexString().toLowerCase();
}

function nodeHex(node: Bytes): string {
  return node.toHexString().toLowerCase();
}

function emptyResolver(): Bytes {
  return changetype<Bytes>(Address.zero());
}

// ── UserRegistry handlers ─────────────────────────────────────────────────────

export function handleLabelRegistered(event: LabelRegisteredEvent): void {
  const label = event.params.label;
  const personId = label.slice(1); // "p{id}" → "{id}"
  let candidate = Candidate.load(personId);

  if (candidate === null) {
    candidate = new Candidate(personId);
    candidate.label = label;
    candidate.ensName = label + ".civicord.eth";
    candidate.node = Bytes.fromHexString(tokenIdHex(event.params.tokenId));
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
    candidate.registeredAtBlock = event.block.number;
    candidate.registeredAt = event.block.timestamp;
    candidate.unregisteredAtBlock = null;
  }
  candidate.save();

  // Map the ENS node (tokenId as bytes32 hex) → candidate so TextChanged/
  // ResolverUpdated can resolve it without scanning the registry.
  const nId = tokenIdHex(event.params.tokenId);
  let nodeMap = NodeToCandidate.load(nId);
  if (nodeMap === null) {
    nodeMap = new NodeToCandidate(nId);
    nodeMap.candidate = personId;
    nodeMap.save();
  } else if (nodeMap.candidate != personId) {
    // Re-registered under same tokenId but different person — update.
    nodeMap.candidate = personId;
    nodeMap.save();
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
