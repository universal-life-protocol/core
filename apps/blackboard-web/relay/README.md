# ULP v2 Relay (Minimal)

This is a dumb-but-correct relay for ULP v2 traces. It is a transport and cache only.
Clients remain the authority; the relay never mutates traces.

## Endpoints

POST /traces
- Body: { "traces": [ULPTrace] }
- Response: { "accepted": [id], "rejected": [{ id?, reason }] }
- Idempotent: duplicate ids are accepted and ignored.

GET /traces/stream
- Returns NDJSON of traces.
- Optional query params:
  - since: unix seconds
  - template: can be repeated
  - kind: can be repeated
  - author: can be repeated
- Sends backfill first, then streams live traces.

GET /health
- Basic health info.

## Running

node server.mjs

Env vars:
- PORT (default 8787)
- ULP_RELAY_LOG (default ./trace.log)
- ULP_RELAY_MAX_BODY (default 1000000 bytes)

## Notes

- Log is append-only NDJSON.
- Duplicates are deduped by id.
- The relay does not verify hashes or signatures.
