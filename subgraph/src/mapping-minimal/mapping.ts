// Minimal stub — compile test
import { LabelRegistered as LabelRegisteredEvent } from "../generated/UserRegistry/UserRegistry";
import { Candidate } from "../generated/schema";

export function handleLabelRegistered(event: LabelRegisteredEvent): void {
  const label = event.params.label;
  const candidate = new Candidate(label.slice(1));
  candidate.label = label;
  candidate.ensName = label + ".civicord.eth";
  candidate.tokenId = event.params.tokenId;
  candidate.owner = event.params.owner;
  candidate.registeredAtBlock = event.block.number;
  candidate.registeredAt = event.block.timestamp;
  candidate.textRecordCount = BigInt.fromI32(0);
  candidate.save();
}
