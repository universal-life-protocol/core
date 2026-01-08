Below are (1) a marketplace-specific intent subset (small, adoption-friendly, and safe for decentralization) and (2) a formal ULP v2 → Intent mapping spec you can drop into your RFC stack.

I’m aligning this to your “intents → traces → projections” model from the uploaded docs .

1) Marketplace-specific intent subsets

Design goals

Consumer-simple (Craigslist mental model)

Log-native (append-only)

Offline-first

No accounts required

Conflict-tolerant (multiple edits/sellers, partial sync)

A. Minimal Marketplace Intents (MVP)

This is the smallest set that still yields a real marketplace:

Listing lifecycle

LISTING_CREATE

LISTING_UPDATE_FIELDS

LISTING_SET_STATUS

LISTING_ADD_MEDIA_REF

LISTING_REMOVE_MEDIA_REF

Discovery / social

BOARD_SUBSCRIBE (follow a topic/area)

BOARD_UNSUBSCRIBE

REPORT_TRACE (local moderation signal)

BLOCK_AUTHOR (local-only)

Messaging (optional but high-value)

THREAD_OPEN (start conversation)

MESSAGE_SEND

That’s enough for:

post → browse → filter → contact → mark sold

B. Extended Marketplace Intents (v1.1)

Add these when MVP is stable:

Offers / negotiation

OFFER_MAKE

OFFER_ACCEPT

OFFER_REJECT

OFFER_WITHDRAW

Reviews / reputation (purely derived; no global scoring)

REVIEW_WRITE (about a trace id or author key)

ENDORSE_AUTHOR (local trust graph edge)

Safety / escrow hooks (Web3-compatible but optional)

ESCROW_CREATE

ESCROW_RELEASE

ESCROW_DISPUTE

Important: these are still intents. The chain/escrow system is a projection / adapter.

C. Concrete intent schemas (MVP)

LISTING_CREATE

type ListingCreateIntent = { type: "LISTING_CREATE" listingId: string // stable id (uuidv7 or content id) template: "marketplace.listing.v1" title: string description?: string price?: { amount: number; currency: string } | null category?: string tags?: string[] location?: { geohash?: string; lat?: number; lon?: number } | null expiresAt?: number | null // unix seconds } 

LISTING_UPDATE_FIELDS (patch, not replace)

type ListingUpdateFieldsIntent = { type: "LISTING_UPDATE_FIELDS" listingId: string patch: Partial<{ title: string description: string price: { amount: number; currency: string } | null category: string tags: string[] location: { geohash?: string; lat?: number; lon?: number } | null expiresAt: number | null }> } 

LISTING_SET_STATUS

type ListingSetStatusIntent = { type: "LISTING_SET_STATUS" listingId: string status: "active" | "paused" | "sold" | "expired" } 

MESSAGE_SEND

type MessageSendIntent = { type: "MESSAGE_SEND" threadId: string about: { listingId?: string; traceId?: string } body: string } 

D. Projection rules (marketplace feed)

These aren’t intents—they’re the deterministic view:

Feed projection SHOULD:

include listings with status=active

exclude expiresAt < now unless user toggles “show expired”

sort by (distance, recency) or (recency) depending on context

group by template/category tags

Listing state is derived by replay:

Start with LISTING_CREATE

Apply UPDATE_FIELDS patches

Apply SET_STATUS (latest wins)

This matches your reducer model .

2) Formal ULP v2 → Intent mapping spec (Draft)

2.1 Purpose

This spec defines how UI intents become ULP v2 traces, such that:

traces are portable across transports (Web2/Web3)

projections are deterministic

UIs are replaceable

2.2 Canonical objects

Intent (ephemeral)

An Intent is an interaction-level command produced by a UI tool. It is not authoritative.

Trace (authoritative)

A Trace is an immutable ULP v2 record persisted and shared.

2.3 Normative mapping rules

Intent → Trace

Every intent that changes shared state MUST be encoded as exactly one ULP trace.

Intents that are purely local (selection, hover, camera) MUST NOT be traced. (Matches your camera guidance )

Trace determinism

Trace id MUST be derived from canonical serialization of the trace without id (content-addressed).

Trace payload MUST contain the intent in a stable schema.

Idempotence

Receivers MUST deduplicate by trace.id.

Projections MUST be stable under duplicate delivery.

No global ordering assumption

Projections MUST NOT assume total order.

If ordering is needed for a view, it MUST be computed from stable keys (e.g., (ts, id)).

2.4 Standard trace fields (ULP v2)

A ULP v2 trace MUST have:

type ULPTraceV2 = { v: 2 id: string // "ulp:v2:<hash>" ts: number // unix seconds kind: "intent" // for this mapping template: string // e.g. "marketplace.listing.v1" author: string | null payload: { intent: { type: string; [k: string]: unknown } intentVersion: number } refs: string[] // linkage to other traces/listings/threads sig: string | null } 

Rationale: using kind:"intent" makes projection engines simpler and keeps domain meaning in payload.intent.type.

2.5 Mapping table (Marketplace MVP)

UI Intenttrace.templatepayload.intent.typerefsLISTING_CREATEmarketplace.listing.v1LISTING_CREATE[]LISTING_UPDATE_FIELDSmarketplace.listing.v1LISTING_UPDATE_FIELDS[listingIdRef]LISTING_SET_STATUSmarketplace.listing.v1LISTING_SET_STATUS[listingIdRef]MESSAGE_SENDmarketplace.thread.v1MESSAGE_SEND[threadIdRef, listingIdRef?] 

Where:

listingIdRef is represented as either: 

the trace id of the LISTING_CREATE event, OR

a stable logical id encoded as ulp:ref:listing:<id> (recommended if you want listings to survive re-creation / forks)

Recommendation (practical):

Use LISTING_CREATE.trace.id as the listing’s canonical id (content-addressable).

If you want mutable “same listing” across edits, keep that create id and refer to it in later events.

2.6 Required intent encoding rules

2.6.1 LISTING_CREATE mapping (example)

Intent:

{ "type":"LISTING_CREATE", "listingId":"...", "title":"Bike", "price":{"amount":80,"currency":"USD"} } 

Trace payload MUST be:

{ "intent": { "type": "LISTING_CREATE", "listingId": "...", "title": "Bike", "price": { "amount": 80, "currency": "USD" } }, "intentVersion": 1 } 

template MUST be marketplace.listing.v1.

2.7 Projection reducer requirements (normative)

A marketplace projection engine:

MUST compute listing state by replaying all traces whose refs include the listing ref (or whose intent carries the listing id).

MUST treat LISTING_UPDATE_FIELDS.patch as a field-wise merge onto current state.

MUST resolve contradictory state updates using a deterministic rule: 

default: Last-write-wins by (ts, id).

SHOULD surface conflicts when two updates have same (ts) and differ materially (optional UI marker).

This matches your “pure reducer” philosophy .

2.8 Local-only intents (explicit exclusions)

The following MUST NOT be traced:

camera pan/zoom/rotate

hover

selection rectangle state

temporary drag delta states

ephemeral tool state

They MAY be persisted locally (private preferences), but are not part of shared truth .

3) Suggested file layout for the spec (so it becomes “real”)

rfc/ulp-v2-adapters.md (your adapter RFC)

rfc/ulp-v2-intent-mapping.md (this mapping spec)

templates/marketplace.listing.v1.schema.json

templates/marketplace.thread.v1.schema.json

4) One concrete decision you should lock now

How do you identify a listing across updates? Two good options:

Listing ID = trace id of LISTING_CREATE (simplest, most ULP-native)

Listing ID = stable logical id (uuidv7) and refs point to ulp:ref:listing:<uuid> (more flexible for forks/aliases)

If you don’t want to decide yet: pick (1) for MVP; add (2) later as an alias mechanism.

If you want, next I can write:

the JSON Schemas for the marketplace templates (listing + thread)

a reference reducer that builds ListingState + FeedItem[]

a filter language for subscriptions (area/category/tags) that stays deterministic and decentralization-safe

