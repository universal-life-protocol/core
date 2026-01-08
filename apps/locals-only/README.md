# locals-only

**A client-side, content-addressed marketplace**

> Global transport, local meaning

---

## What is this?

locals-only is a decentralized marketplace built on five core invariants:

1. **Records are immutable** — once created, they never change
2. **Edits = new records** — updates create new content-addressed records
3. **MQTT is transport only** — no semantics, just delivery
4. **All filtering, trust, ranking is local** — your client, your rules
5. **Nothing authoritative leaves the client** — except records themselves

This creates a system where:
- No one can "take it over" because there's nothing to own
- Every client defines its own reality through local filters
- Global transport enables discovery, local logic enables safety
- Content-addressing makes everything verifiable

---

## Quick Start

### Requirements

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for MQTT broker)

### Running the App

1. Open `ui/index.html` in your browser
2. The app will connect to the MQTT broker automatically
3. Start posting listings or viewing the market feed

### Posting a Listing

Use the text area to create a listing with this format:

```
type: listing
title: Vintage Record Player
price: $150
location: San Francisco
description: Working condition, great sound
timestamp: 2026-01-02T12:00:00Z
```

Click "Post Listing" to publish it to the network.

---

## Architecture

### Client-Side Components

```
client/
├── mqtt.js          # MQTT transport layer
├── record.js        # Content-addressed record system
├── index.js         # Local IndexedDB storage
├── publish.js       # Listing publication
├── view.js          # Rendering logic
└── main.js          # App bootstrap
```

### UI Layer

```
ui/
├── index.html       # Main application
├── style.css        # Styling
└── app.js          # UI utilities
```

### Local Configuration

```
world/
├── .genesis         # Bootstrap config
├── .env            # Environment variables
├── .schema         # Validation rules
├── .ignore         # Block rules
├── .include        # Inclusion preferences
└── .view           # Display preferences
```

All `world/` files stay on **your machine**. They never propagate.

---

## How It Works

### 1. Record Creation

Every listing becomes an immutable, content-addressed record:

```javascript
const record = {
  rid: "sha256:abc123...",
  bytes: "type: listing\ntitle: ...",
  created: "2026-01-02T12:00:00Z"
}
```

The `rid` (record ID) is the SHA-256 hash of the canonical bytes.

### 2. Transport

Records are published to MQTT topics:

```
locals/market/listing    # New listings
locals/market/reply/*    # Replies (future)
```

MQTT is a **dumb pipe** — it delivers records, nothing more.

### 3. Local Processing

Your client:
1. Receives records from MQTT
2. Verifies the SHA-256 hash matches
3. Applies **your** local filters (`.ignore`, `.schema`)
4. Stores verified records in IndexedDB
5. Renders according to **your** preferences (`.view`)

### 4. No Central Authority

There is no:
- Server storing "the truth"
- Account system
- Moderation team
- Central database

You decide what you see. Others decide what they see.

---

## Core Principles

### Immutability

Records never change. Want to update a listing?
→ Publish a new record with the updated content.

### Content-Addressing

Record IDs are SHA-256 hashes. This means:
- Identical content = identical ID
- Anyone can verify authenticity
- No one can forge or tamper

### Local Filtering

Spam resistance happens **in your client**:

```
world/.ignore          # Block keywords/patterns
world/.include         # Prioritize trusted sources
world/.schema          # Validate record structure
```

No global spam filter means no global censorship.

### MQTT as Transport

MQTT is chosen because:
- It's lightweight and fast
- Works over websockets (browser-friendly)
- Has QoS guarantees
- Scales globally

But it has **zero semantics**. It's just message delivery.

---

## Configuration

### Environment Variables

Edit `world/.env`:

```bash
MQTT_BROKER=wss://test.mosquitto.org:8081
MQTT_TOPIC_PREFIX=locals/market
SHOW_TIMESTAMPS=true
```

### Schema Validation

Edit `world/.schema` to enforce record structure:

```yaml
required:
  - type
  - title
  - timestamp

forbidden:
  - script
  - iframe
```

### Filtering

Edit `world/.ignore` to block unwanted content:

```yaml
keywords:
  - scam
  - crypto
```

Edit `world/.include` to prioritize content:

```yaml
keywords:
  - local
  - handmade
```

---

## Tools

### CLI Listing Creator

Use the shell script to quickly create listings:

```bash
chmod +x tools/new-listing.sh
./tools/new-listing.sh
```

---

## What's Next?

Potential enhancements (in order of priority):

1. **Reply records** — threaded conversations under listings
2. **Geographic filtering** — location-aware feed (client-side only)
3. **Export/import** — backup your records as a zip file
4. **ESP32 integration** — bridge ULP traces → marketplace listings
5. **Map view** — visual representation of location-tagged listings
6. **Offline-first** — full functionality without network

---

## FAQ

### Why no user accounts?

Because accounts create central points of control. Instead:
- Your identity is your record history
- Trust is built through verified records
- No one can ban you or delete your content

### How do I "edit" a listing?

You don't edit — you create a new record. Want to link them?
Add a field like `replaces: sha256:old-record-id`.

### What about spam?

Spam is a **local problem** with **local solutions**:
- Your `.ignore` file blocks keywords
- Your `.schema` validates structure
- Your client doesn't render what you don't want to see

### What if someone publishes illegal content?

Your client decides what to display. You can:
- Block specific record IDs
- Block keyword patterns
- Ignore entire topics

There's no "platform" to sue because there is no platform.

### Can I use a different MQTT broker?

Yes! Edit `world/.env` and point to any broker:

```bash
MQTT_BROKER=wss://your-broker.com:8883
```

You can even run your own broker.

---

## Protocol Compliance

This app follows **ULP v2.0** (Universal Life Protocol):

- Content-addressed records
- Canonical text representation
- SHA-256 hashing
- Immutable data structures
- Local-first processing

See `~/universal-life-protocol/ulpv2` for full protocol specification.

---

## Philosophy

This is a **proof of concept** that shows:

1. You can build global systems without central control
2. Local filtering beats global moderation
3. Content-addressing enables trust without authority
4. Simple protocols scale better than complex ones

The goal is not to compete with Craigslist or eBay.

The goal is to demonstrate that **you don't need them**.

---

## License

Public domain. Do whatever you want with this.

No warranty. No liability. No promises.

---

## Acknowledgments

Built on principles from:
- Content-addressed storage (IPFS, Git)
- Local-first software (Ink & Switch)
- Universal Life Protocol v2.0
- MQTT publish-subscribe pattern

---

**Lock 1 · 2 · 3**

Keep it locals-only in behavior, even though it can travel globally.
