# Testament Trustee

**ULP v2.0 WebRTC Browser with QR Code Discovery and Optional WebAuthn**

A libp2p-based peer that serves ULP v2.0 records over WebRTC, enabling browser-based verification without requiring trust in centralized servers.

---

## Features

### 1. **libp2p WebRTC Transport**
- Serves ULP records directly to browsers
- No WebSocket or HTTP intermediaries needed
- NAT traversal via WebRTC

### 2. **QR Code Peer Discovery**
- Generate QR codes for instant connection
- Scan with mobile device to connect
- Share connection strings easily

### 3. **Optional WebAuthn Authentication**
- Hardware key support (YubiKey, Touch ID, etc.)
- Passwordless authentication
- Optional - system works without it

### 4. **ULP v2.0 Integration**
- Serves records via `ulp://<RID>` protocol
- Displays E8×E8 policy metadata
- Browser-based verification
- Cryptographic fingerprint checking

---

## Quick Start

### 1. Start the Server

```bash
cd server
go mod tidy
go build -o testament-trustee

# Serve ULP traces from v2/out
./testament-trustee -traces=../../v2/out -port=8080
```

Output:
```
Testament Trustee Server started
  Peer ID: 12D3KooWABC123...
  Addresses:
    /ip4/127.0.0.1/udp/9090/webrtc/p2p/12D3KooWABC123...
    /ip6/::1/udp/9090/webrtc/p2p/12D3KooWABC123...
HTTP server listening on http://localhost:8080
Loaded 3 records
```

### 2. Open Web UI

Navigate to: `http://localhost:8080`

### 3. Scan QR Code

- QR code displays your peer connection string
- Scan with another device to establish WebRTC connection
- Or copy the peer ID manually

### 4. Verify Records

- Click "Verify" on any record
- Browser computes SHA-256 of trace bytes
- Compares with RID (Record ID)
- ✓ = Verified, ✗ = Tampered

---

## Architecture

```
┌──────────────┐
│  Browser     │
│  (WebRTC)    │
└──────┬───────┘
       │
       │ libp2p WebRTC
       │
┌──────▼───────────────┐
│ Testament Trustee    │
│                      │
│ • Serves ULP records │
│ • QR code generation │
│ • WebAuthn (opt.)    │
│ • Policy metadata    │
└──────┬───────────────┘
       │
       │ Reads traces
       │
┌──────▼───────┐
│  ULP v2.0    │
│  Traces      │
│              │
│  out/        │
│  ├─ out1/    │
│  │  └─ trace.log
│  └─ out2/    │
│     └─ trace.log
└──────────────┘
```

---

## How It Works

### ULP Record Serving

1. **Server starts** → Scans trace directory
2. **Loads records** → Computes RID (SHA-256 of trace bytes)
3. **Extracts policy** → Parses POLICY, GEOMETRY, REPLICA metadata
4. **Serves via libp2p** → Responds to `ulp://<RID>` requests

### Browser Verification

```javascript
// Browser requests record
fetch('/api/record/' + rid)
  .then(r => r.arrayBuffer())
  .then(async bytes => {
    // Compute SHA-256
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    const hashHex = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify matches RID
    if (hashHex === rid) {
      console.log('✓ Verified!');
    }
  });
```

**No trust required** - cryptography proves integrity.

### QR Code Discovery

```
/ip4/192.168.1.100/udp/9090/webrtc/p2p/12D3KooWABC123...
                                         ^^^^^^^^^^^^^^
                                         Peer ID
```

Encoded as QR code → Scan → Connect

### WebAuthn (Optional)

```javascript
// Register hardware key
const credential = await navigator.credentials.create({
  publicKey: {
    challenge: new Uint8Array(32),
    rp: { name: "Testament Trustee" },
    user: {
      id: new Uint8Array(16),
      name: "user@example.com",
      displayName: "User"
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }]
  }
});

// Use for authentication
const assertion = await navigator.credentials.get({
  publicKey: {
    challenge: new Uint8Array(32),
    allowCredentials: [{
      id: credential.rawId,
      type: 'public-key'
    }]
  }
});
```

---

## API Endpoints

### HTTP API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Web UI (HTML) |
| `/qr` | GET | QR code image (PNG) |
| `/api/connection` | GET | Peer ID and addresses (JSON) |
| `/api/records` | GET | List all records (JSON) |
| `/api/record/<RID>` | GET | Fetch specific record (bytes) |

### libp2p Protocols

| Protocol | Description |
|----------|-------------|
| `/ulp/2.0.0` | ULP record retrieval |
| `/webrtc-signal/1.0.0` | WebRTC signaling |

---

## Example: Verifying a ULP Trace

### 1. Generate a Trace

```bash
cd ../../v2
echo "hello world" | ./bin/run.sh world out
```

Output:
```
# RID: abc123def456...
```

### 2. Start Testament Trustee

```bash
cd ../testament-trustee/server
./testament-trustee -traces=../../v2/out
```

### 3. Open Browser

Navigate to `http://localhost:8080`

### 4. View Record

```
ulp://abc123def456...
Size: 15234 bytes

Policy:
  Chirality: LEFT
  Geometry: SPHERE / CUBE / SIMPLEX5
  Replica Slots: [4, 1, 3, 3, 5, 0, 4, 3, 5]

[Verify Button]
```

### 5. Click Verify

Browser:
1. Downloads trace bytes
2. Computes SHA-256
3. Compares with RID
4. Shows ✓ or ✗

**Result**: Cryptographic proof the trace is unmodified.

---

## Security Model

### What Testament Trustee Proves

✅ **Integrity**: Record hash matches RID (cryptographic proof)
✅ **Completeness**: Full trace embedded (self-encoding)
✅ **Policy**: E8×E8 derivation is deterministic
✅ **Reproducibility**: Can re-execute and verify

### What It Doesn't Prove

❌ **Identity**: Doesn't prove who created it (use digital signatures for that)
❌ **Timestamp**: Doesn't prove when it was created (use notary services for that)
❌ **Authorization**: Doesn't enforce access control (optional WebAuthn for that)

### Trust Model

**Zero trust required**:
- No trusted server (you run it yourself)
- No trusted CA (WebRTC peer-to-peer)
- No trusted registry (ULP records are self-contained)

**Verify yourself**:
- SHA-256 hash in browser
- Re-execute trace locally
- Compare byte-for-byte

---

## WebAuthn Integration

### Enable (Optional)

```javascript
// Check availability
if (window.PublicKeyCredential) {
  console.log('WebAuthn available');
}

// Register device
const credential = await registerWebAuthn();

// Authenticate
const assertion = await authenticateWebAuthn();
```

### Use Cases

1. **Access Control**: Only authenticated users can view certain records
2. **Audit Trail**: Log who accessed which records
3. **Multi-Factor**: Combine with other auth methods

### Example

```go
// server/main.go
func (s *TestamentServer) requireWebAuthn(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check WebAuthn credential
		assertion := r.Header.Get("WebAuthn-Assertion")
		if !verifyAssertion(assertion) {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

// Protect endpoint
http.HandleFunc("/api/record/", s.requireWebAuthn(s.handleAPIRecord))
```

---

## Deployment

### Local Development

```bash
./testament-trustee -traces=../../v2/out -port=8080
```

### Production (with TLS)

```bash
# Behind nginx/caddy with TLS
./testament-trustee -traces=/var/lib/ulp/traces -port=9000
```

Nginx config:
```nginx
server {
  listen 443 ssl;
  server_name testament.example.com;

  location / {
    proxy_pass http://localhost:9000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

### Docker

```dockerfile
FROM golang:1.21-alpine
WORKDIR /app
COPY server/ .
RUN go build -o testament-trustee
EXPOSE 8080 9090/udp
CMD ["./testament-trustee", "-traces=/traces", "-port=8080"]
```

```bash
docker build -t testament-trustee .
docker run -p 8080:8080 -p 9090:9090/udp -v ./traces:/traces testament-trustee
```

---

## Mobile Support

### QR Code Scanning

1. Open camera app
2. Scan QR code on screen
3. Tap notification → Opens browser
4. WebRTC connection established

### Progressive Web App (PWA)

Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">
```

`manifest.json`:
```json
{
  "name": "Testament Trustee",
  "short_name": "Trustee",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

---

## Advanced Usage

### Custom Projections

Serve custom views of ULP traces:

```go
func (s *TestamentServer) handleProjection(w http.ResponseWriter, r *http.Request) {
	rid := getRIDFromURL(r.URL.Path)
	record := s.records[rid]

	// Apply custom projection
	view := applyProjection(record.Bytes, "theological_discourse")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(view)
}
```

### Policy-Based Routing

Use ULP v2.0 chirality for peer selection:

```go
func (s *TestamentServer) selectPeers(rid RID) []peer.ID {
	record := s.records[rid]

	peers := s.host.Peerstore().Peers()

	// Apply chirality to ordering
	if record.Policy.Chirality == "RIGHT" {
		reverse(peers)
	}

	return peers
}
```

---

## Troubleshooting

### WebRTC Connection Fails

**Problem**: Browser can't connect to peer

**Solutions**:
1. Check firewall allows UDP port 9090
2. Ensure NAT traversal is enabled
3. Try STUN server configuration

### QR Code Not Generating

**Problem**: `/qr` returns error

**Solutions**:
1. Check `go-qrcode` is installed: `go get github.com/skip2/go-qrcode`
2. Verify peer addresses are valid

### Records Not Loading

**Problem**: No records shown in UI

**Solutions**:
1. Check `-traces` path is correct
2. Verify `trace.log` files exist
3. Check file permissions

---

## Development

### Build

```bash
cd server
go build -o testament-trustee
```

### Test

```bash
# Start server
./testament-trustee -traces=../../v2/out -port=8080

# In another terminal, test API
curl http://localhost:8080/api/records
curl http://localhost:8080/api/connection
```

### Hot Reload

```bash
# Install air
go install github.com/cosmtrek/air@latest

# Run with hot reload
air
```

---

## License

Same as ULP v2.0 (see root LICENSE)

---

## References

- **ULP v2.0 Spec**: `../ULP-v2.0-SPECIFICATION.md`
- **libp2p**: https://libp2p.io
- **WebRTC**: https://webrtc.org
- **WebAuthn**: https://webauthn.guide
- **QR Codes**: https://github.com/skip2/go-qrcode

---

## Roadmap

- [ ] Full WebAuthn implementation
- [ ] Offline PWA support
- [ ] Mobile app (React Native)
- [ ] IPFS integration
- [ ] Multi-peer replication
- [ ] Search and filtering
- [ ] Trace diff viewer

---

**Testament Trustee: Trustless ULP browsing from any device.**
