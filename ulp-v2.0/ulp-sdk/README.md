# ULP SDK (Templates)

HTML + JSON schema templates for ULP records and projections.

## Install (local)
```bash
cd "ulp v2.0/ulp-sdk"
```

## Usage
```js
import { projectionHTML, projectionSchema, recordFromTrace } from "./src/index.js";
import fs from "node:fs";

const trace = fs.readFileSync("../out/trace.log");
const record = recordFromTrace(trace);

const html = projectionHTML(record, { fields: "rid,chirality,projective" });
const schema = projectionSchema(record);
```

## API
- `parsePolicy(traceBytes)` → policy object from trace lines
- `recordFromTrace(traceBytes)` → `{ rid, size, policy }`
- `projectionSchema(record, options)` → JSON schema for modal cards
- `projectionHTML(record, options)` → HTML string

## Record input
`projectionSchema`/`projectionHTML` accept either:
- `{ bytes: Buffer }` (auto-hash + parse)
- `{ rid: string, size?: number, policy?: object }`

## Notes
- Templates are deterministic and do not mutate record data.
- HTML is a simple modal card layout designed for clean presentation.
