| App | Path | Role | Authority level | Maturity | Transport | Writes truth? | Reads truth? | Projection-only? | Notes |
|---|---|---|---|---|---|---|---|---|---|
| blackboard-web | `apps/blackboard-web` | browser feed + adapter relay client | advisory | partial | MQTT over WS, HTTP relay stream | yes | yes | no | `relay/server.mjs` is append-only cache and does not verify signatures |
| locals-only | `apps/locals-only` | local-first marketplace client | advisory | prototype | MQTT over WS | yes | yes | no | local IndexedDB + template projection, browser-only runtime |
| p2p-server | `apps/p2p-server` | Go trace serving node | governed-runtime | partial | libp2p WebRTC, HTTP | no | yes | no | serves RID-addressed trace bytes and connection metadata |
| p2p-server-node | `apps/p2p-server-node` | Node trace serving + projection API | governed-runtime | partial | libp2p WebRTC, HTTP | no | yes | no | exposes `/api/projection/*` using SDK |
| trace-chat | `apps/trace-chat` | encrypted chat demo UI | projection-only | prototype | MQTT rendezvous, WebRTC data channels | yes | yes | no | localStorage persistence; no protocol authority layer |
| ulp-chat | `apps/ulp-chat` | chat + memory ledger + explain/views API | advisory | partial | HTTP, [inferred] Ollama HTTP backend | yes | yes | no | non-deterministic ids/timestamps in ledger events |
| ulp-sdk | `apps/ulp-sdk` | trace projection helper library | projection-only | partial | none | no | yes | yes | deterministic parse + HTML/schema generation |
| ulp-v1.1-mcp-server | `apps/ulp-v1.1-mcp-server` | MCP scene control bridge | reference-only | prototype | MCP stdio | yes | yes | no | in-memory scenes; export/import trace-like JSON |
