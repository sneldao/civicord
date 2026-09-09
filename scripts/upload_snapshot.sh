#!/usr/bin/env bash
# Upload a snapshot to the civicord-data R2 bucket (account e738) via the
# Cloudflare REST API.
#
# Why not `wrangler r2 object put`? With a multi-account OAuth login, wrangler's
# object operations write to the WRONG account even when `account_id` is pinned
# in wrangler.toml — objects vanish from the bucket the Pages worker reads.
# The REST API with wrangler's OAuth token is verified correct (docs/ops.md).
set -euo pipefail

FILE="${1:?usage: upload_snapshot.sh <file> [remote-key]}"
KEY="${2:-$(basename "$FILE")}"
ACCOUNT="e7383c0c7474c8f61cc06598eeb134a0"
BUCKET="civicord-data"
TOKEN_FILE="$HOME/Library/Preferences/.wrangler/config/default.toml"

TOKEN=$(sed -n 's/oauth_token = "\(.*\)"/\1/p' "$TOKEN_FILE")
if [[ -z "$TOKEN" ]]; then
  echo "error: no oauth_token found in $TOKEN_FILE (run: npx wrangler login)" >&2
  exit 1
fi

STATUS=$(curl -s -o /tmp/r2-upload-resp.json -w '%{http_code}' \
  -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT/r2/buckets/$BUCKET/objects/$KEY" \
  -H "Authorization: Bearer $TOKEN" \
  --data-binary "@$FILE" \
  -H "Content-Type: application/octet-stream")

if [[ "$STATUS" == "200" ]]; then
  SIZE=$(python3 -c 'import json;print(json.load(open("/tmp/r2-upload-resp.json"))["result"]["size"])')
  echo "uploaded $FILE -> $BUCKET/$KEY ($SIZE bytes)"
  echo "verify: curl -s -o /dev/null -w '%{http_code} %{size_download}\n' https://civicord.pages.dev/data/$KEY"
else
  echo "upload failed (HTTP $STATUS):" >&2
  cat /tmp/r2-upload-resp.json >&2
  exit 1
fi
