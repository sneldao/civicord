// node lookup — reads the candidate CSV file generated at pre-deploy time.
// The CSV is read via a static import to avoid AS compile-time memory explosion.
// The CSV file path is configured at graph deploy time.
import { Bytes } from "@graphprotocol/graph-ts";

// NOTE: This module is intentionally lightweight.  The 2375-entry lookup is
// performed at pre-deploy time (generate-entities.ts) which writes initial
// Candidate entities into the subgraph store.  At runtime, handlers derive
// personId from the LabelRegistered event's `label` field directly.
//
// For resolver TextChanged events (node → personId), we rely on the entity
// already existing (created either by LabelRegistered or by the pre-deploy
// script).  If a resolver event fires before LabelRegistered was indexed,
// handleTextChanged creates a stub Candidate using a hardcoded range.
//
// The actual node→personId mapping lives in:
//   scripts/publish/generate-entities.ts  (pre-deploy)
//   data/out/onchain_manifest.csv        (source of truth)

/** Hardcoded pid ranges present in the civicord dataset (from websites.csv).
 *  Used by handleTextChanged to create Candidate stubs when LabelRegistered
 *  hasn't been indexed yet.  Update if the dataset grows.
 *  Range: 9 – 122389 (2,375 entries, sparse). */
export const PID_MIN = 9;
export const PID_MAX = 122389;
export const PID_COUNT = 2375;
