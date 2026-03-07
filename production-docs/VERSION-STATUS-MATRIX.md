| Version | Canonicalization | Hashing | Determinism tests | Grammar/spec | Replay/trace | Projection support | Network transport | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ulp-v1.1 | yes | yes | partial | partial | yes | yes | no | partial | `validate.sh` fails in current checkout; core scripts present |
| ulp-v2.0 | yes | yes | yes | partial | yes | partial | partial | yes | determinism test passes |
| ulp-v3.0 | yes | yes | yes | yes | yes | yes | partial | yes | conformance suite passes |
| ulp-v4.0 | yes | yes | partial | partial | no | yes | no | partial | adapter/delta tools run; no dedicated test suite found |
| apps/blackboard-web | yes | yes | no | no | partial | yes | yes | partial | relay + feed adapters, not protocol core |
| apps/ulp-chat | partial | partial | no | no | partial | yes | yes | partial | HTTP chat ledger with non-deterministic timestamps/ids |
| apps/p2p-server | no | yes | partial | no | partial | partial | yes | partial | Go libp2p + HTTP trace serving |
| apps/p2p-server-node | no | yes | partial | no | partial | yes | yes | yes | Node libp2p + HTTP + smoke test |
| apps/locals-only | yes | yes | partial | no | no | yes | yes | partial | browser-only marketplace with MQTT + IndexedDB |
